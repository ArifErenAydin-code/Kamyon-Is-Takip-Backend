const express = require('express');
const router = express.Router();
const Invoice = require('../models/invoice');
const Truck = require('../models/truck');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

// Geçici dosya depolama ayarları
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'temp_' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Dosya filtreleme
const fileFilter = (req, file, cb) => {
    // Sadece resim dosyalarını kabul et
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// YOLO ile görüntü işleme
async function detectWithYOLO(imagePath) {
    try {
        console.log('YOLO tespiti başlatılıyor...');
        console.log('Görüntü yolu:', imagePath);
        console.log('Model yolu:', path.join(__dirname, '..', 'yolo', 'yolo11n.pt'));

        const pythonProcess = spawn('python', [
            path.join(__dirname, '..', 'yolo', 'detect.py'),
            '--source', imagePath,
            '--weights', path.join(__dirname, '..', 'yolo', 'yolo11n.pt'),
            '--conf', '0.25'
        ]);

        let result = '';
        let error = '';

        console.log('Python scripti çalıştırıldı, çıktı bekleniyor...');

        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('Python çıktısı:', output);
            result += output;
        });

        pythonProcess.stderr.on('data', (data) => {
            const err = data.toString();
            console.error('Python hatası:', err);
            error += err;
        });

        await new Promise((resolve, reject) => {
            pythonProcess.on('close', (code) => {
                console.log('Python işlemi tamamlandı, çıkış kodu:', code);
                if (code !== 0) {
                    reject(new Error(`Python işlemi hata kodu ile çıktı (${code}): ${error}`));
                } else {
                    resolve();
                }
            });
        });

        console.log('Ham sonuç:', result);

        // YOLO çıktısını parse et
        const detections = result.trim().split('\n').filter(Boolean).map(line => {
            console.log('İşlenen satır:', line);
            const [cls, conf, ...coords] = line.split(',');
            const detection = {
                class: parseInt(cls),
                confidence: parseFloat(conf),
                bbox: coords.length === 4 ? {
                    x1: parseFloat(coords[0]),
                    y1: parseFloat(coords[1]),
                    x2: parseFloat(coords[2]),
                    y2: parseFloat(coords[3])
                } : null
            };
            console.log('Oluşturulan tespit objesi:', detection);
            return detection;
        });

        console.log('Tüm tespitler:', detections);
        return detections;
    } catch (error) {
        console.error('YOLO tespit hatası:', error);
        throw error;
    }
}

// Görüntü işleme ana fonksiyonu
async function processImage(imageBuffer) {
    console.log('Görüntü işleme başlatılıyor...');
    const tempImagePath = path.join(__dirname, '..', 'yolo', 'temp', `temp_${Date.now()}.jpg`);
    console.log('Geçici dosya yolu:', tempImagePath);
    
    try {
        // Geçici dosyayı oluştur
        await fs.writeFile(tempImagePath, imageBuffer);
        console.log('Geçici dosya oluşturuldu');

        // YOLO ile tespit
        const detections = await detectWithYOLO(tempImagePath);
        console.log('YOLO tespitleri alındı:', detections);

        let tonaj = null;

        // En yüksek güvenilirliğe sahip tespiti al
        if (detections.length > 0) {
            console.log('Tespitler bulundu, en iyisi seçiliyor...');
            const bestDetection = detections.reduce((prev, current) => 
                (current.confidence > prev.confidence) ? current : prev
            );
            console.log('En iyi tespit:', bestDetection);

            // Eğer tespit varsa, değeri al
            if (bestDetection.text) {
                console.log('Tespit edilen metin:', bestDetection.text);
                // Metinden sayıyı çıkar
                const match = bestDetection.text.match(/(\d+(?:[.,]\d+)?)/);
                if (match) {
                    tonaj = parseFloat(match[1].replace(',', '.'));
                    console.log('Çıkarılan tonaj değeri:', tonaj);
                }
            }
        } else {
            console.log('Hiç tespit bulunamadı');
        }

        return tonaj;
    } catch (error) {
        console.error('Görüntü işleme hatası:', error);
        throw error;
    } finally {
        // Geçici dosyayı temizle
        try {
            await fs.unlink(tempImagePath);
            console.log('Geçici dosya silindi');
        } catch (error) {
            console.error('Geçici dosya silme hatası:', error);
        }
    }
}

// Tüm faturaları getir
router.get('/', async (req, res) => {
    try {
        const invoices = await Invoice.find({ isActive: true }).sort({ tarih: -1 });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Plakaya göre faturaları getir
router.get('/kamyon/:plaka', async (req, res) => {
    try {
        const invoices = await Invoice.find({
            kamyon_plaka: req.params.plaka,
            isActive: true
        }).sort({ tarih: -1 });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Plakaya göre toplam tonaj
router.get('/kamyon/:plaka/toplam-tonaj', async (req, res) => {
    try {
        const result = await Invoice.aggregate([
            {
                $match: {
                    kamyon_plaka: req.params.plaka,
                    isActive: true
                }
            },
            {
                $group: {
                    _id: null,
                    toplamTonaj: { $sum: "$tonaj" }
                }
            }
        ]);
        
        res.json({
            kamyon_plaka: req.params.plaka,
            toplam_tonaj: result.length > 0 ? result[0].toplamTonaj : 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Plaka kontrolü
router.get('/validate-plate/:plaka', async (req, res) => {
    try {
        const truck = await Truck.findOne({ plaka: req.params.plaka, isActive: true });
        if (!truck) {
            return res.status(404).json({ 
                valid: false,
                message: 'Bu plakaya sahip aktif bir kamyon bulunamadı.' 
            });
        }
        res.json({ 
            valid: true,
            message: 'Geçerli kamyon plakası',
            truck: truck 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Ağırlık değerini doğrula ve formatla
function validateAndFormatWeight(text) {
    console.log('Ağırlık doğrulama için gelen metin:', text);
    
    // Metindeki ilk 4-6 basamaklı sayıyı bul
    const match = text.toString().match(/\d{4,6}/);
    
    if (!match) {
        console.log('Metinde sayı bulunamadı');
        return null;
    }
    
    // Bulunan sayıyı al
    const numWeight = parseInt(match[0]);
    console.log('Bulunan sayı:', numWeight);
    
    // Sayıyı number olarak döndür
    return numWeight;
}

// Fatura görüntüsünden tonaj tespiti
router.post('/upload', upload.single('fatura_resmi'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Dosya yüklenemedi' });
    }

    try {
        // YOLO modelini çalıştır
        const pythonProcess = spawn('python', [
            'yolo/detect.py',
            '--source', req.file.path,
            '--weights', 'yolo/runs/detect/train5/weights/best.pt',
            '--conf', '0.1'
        ]);

        let detections = [];
        let tonaj = null;

        pythonProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                // YOLO debug çıktılarını doğrudan konsola yaz
                if (!line.startsWith('DATA:')) {
                    console.log(line);
                    continue;
                }

                // DATA: ile başlayan satırları işle (tespit verileri)
                const detectionData = line.substring(5); // "DATA:" prefix'ini kaldır
                const parts = detectionData.split(',');
                
                // En az 6 parça olmalı: class, conf, x1, y1, x2, y2, [text]
                if (parts.length >= 6) {
                    const [cls, conf, x1, y1, x2, y2, ...textParts] = parts;
                    const text = textParts.join(','); // Eğer metin virgül içeriyorsa birleştir
                    
                    const detection = {
                        class: parseInt(cls),
                        confidence: parseFloat(conf),
                        bbox: {
                            x1: parseFloat(x1),
                            y1: parseFloat(y1),
                            x2: parseFloat(x2),
                            y2: parseFloat(y2)
                        },
                        text: text || null
                    };
                    detections.push(detection);

                    // Tespit edilen metni kontrol et
                    if (text) {
                        console.log('Tespit edilen metin:', text);
                        const formattedWeight = validateAndFormatWeight(text);
                        if (formattedWeight) {
                            tonaj = formattedWeight;
                            console.log('Tonaj bulundu:', tonaj);
                        }
                    }
                }
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        await new Promise((resolve, reject) => {
            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`YOLO işlemi başarısız oldu (kod: ${code})`));
                }
            });
        });

        // Görselleştirme dosyasını kontrol et
        const visualizationPath = path.join(process.cwd(), 'runs/detect/predict', path.basename(req.file.path));
        let visualization = null;

        try {
            const visualizationExists = await fs.access(visualizationPath)
                .then(() => true)
                .catch(() => false);

            if (visualizationExists) {
                visualization = await fs.readFile(visualizationPath, { encoding: 'base64' });
            }
        } catch (error) {
            console.error('Görselleştirme dosyası okunamadı:', error);
        }

        // Geçici dosyaları temizle
        await fs.unlink(req.file.path).catch(console.error);
        if (visualization) {
            await fs.unlink(visualizationPath).catch(console.error);
        }

        res.json({
            success: true,
            tonaj,
            detections,
            visualization: visualization ? `data:image/jpeg;base64,${visualization}` : null
        });

    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({ error: error.message });
    }
});

// Yeni fatura ekle
router.post('/', async (req, res) => {
    try {
        console.log('Gelen fatura verisi:', req.body);

        // Veri kontrolü
        if (!req.body.kamyon_plaka) {
            return res.status(400).json({ message: 'Kamyon plakası gerekli' });
        }
        if (!req.body.tonaj || isNaN(req.body.tonaj)) {
            return res.status(400).json({ message: 'Geçerli bir tonaj değeri gerekli' });
        }
        if (!req.body.tarih || isNaN(new Date(req.body.tarih).getTime())) {
            return res.status(400).json({ message: 'Geçerli bir tarih gerekli' });
        }

        // Önce kamyon plakasını kontrol et
        const truck = await Truck.findOne({ plaka: req.body.kamyon_plaka, isActive: true });
        if (!truck) {
            return res.status(404).json({ message: 'Bu plakaya sahip aktif bir kamyon bulunamadı.' });
        }

        // Son fatura numarasını bul
        const lastInvoice = await Invoice.findOne({}, { fatura_no: 1 })
            .sort({ fatura_no: -1 });

        // Yeni fatura numarası oluştur
        let nextNumber = 1;
        if (lastInvoice && lastInvoice.fatura_no) {
            const lastNumber = parseInt(lastInvoice.fatura_no.split('-')[1]);
            nextNumber = lastNumber + 1;
        }
        const newInvoiceNumber = `FTR-${String(nextNumber).padStart(6, '0')}`;

        const invoice = new Invoice({
            kamyon_plaka: req.body.kamyon_plaka,
            tarih: req.body.tarih,
            tonaj: req.body.tonaj,
            fatura_no: newInvoiceNumber,
            fatura_tutari: req.body.fatura_tutari || 0,
            fatura_resmi: req.body.fatura_resmi
        });

        console.log('Oluşturulan fatura:', invoice);

        const newInvoice = await invoice.save();
        console.log('Kaydedilen fatura:', newInvoice);

        res.status(201).json(newInvoice);
    } catch (error) {
        console.error('Fatura kaydetme hatası:', error);
        res.status(400).json({ message: error.message });
    }
});

// Fatura güncelle
router.patch('/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'Fatura bulunamadı' });
        }

        // Eğer plaka değiştiriliyorsa, yeni plakayı kontrol et
        if (req.body.kamyon_plaka && req.body.kamyon_plaka !== invoice.kamyon_plaka) {
            const truck = await Truck.findOne({ plaka: req.body.kamyon_plaka, isActive: true });
            if (!truck) {
                return res.status(404).json({ message: 'Bu plakaya sahip aktif bir kamyon bulunamadı.' });
            }
        }

        if (req.body.kamyon_plaka) invoice.kamyon_plaka = req.body.kamyon_plaka;
        if (req.body.tarih) invoice.tarih = req.body.tarih;
        if (req.body.tonaj) invoice.tonaj = req.body.tonaj;
        if (req.body.fatura_no) invoice.fatura_no = req.body.fatura_no;
        if (req.body.fatura_tutari) invoice.fatura_tutari = req.body.fatura_tutari;
        if (req.body.fatura_resmi) invoice.fatura_resmi = req.body.fatura_resmi;

        const updatedInvoice = await invoice.save();
        res.json(updatedInvoice);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Fatura sil (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'Fatura bulunamadı' });
        }

        invoice.isActive = false;
        await invoice.save();
        res.json({ message: 'Fatura silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 