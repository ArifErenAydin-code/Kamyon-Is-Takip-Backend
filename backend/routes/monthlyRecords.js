const express = require('express');
const router = express.Router();
const MonthlyRecord = require('../models/monthly_record');

// Tüm kayıtları getir
router.get('/', async (req, res) => {
  try {
    const records = await MonthlyRecord.find({ isActive: true }).sort({ ay: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Belirli bir ayın kayıtlarını getir
router.get('/by-month/:ay', async (req, res) => {
  try {
    const records = await MonthlyRecord.find({ 
      ay: req.params.ay,
      isActive: true 
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Belirli bir ayın istatistiklerini getir
router.get('/statistics/:ay', async (req, res) => {
  try {
    const matchStage = { 
      ay: req.params.ay,
      isActive: true 
    };

    // Eğer plaka parametresi varsa, filtreye ekle
    if (req.query.plaka) {
      matchStage.kamyon_plaka = req.query.plaka;
    }

    const stats = await MonthlyRecord.aggregate([
      { 
        $match: matchStage
      },
      {
        $group: {
          _id: null,
          toplam_mazot_litre: { $sum: '$mazot_litre' },
          toplam_mazot_maliyet: { $sum: '$mazot_maliyet' },
          toplam_sefer: { $sum: '$sefer_sayisi' },
          toplam_lastik_tamir: { $sum: '$lastik_tamir_sayisi' },
          toplam_lastik_maliyet: { $sum: { $multiply: ['$lastik_tamir_sayisi', '$lastik_tamir_maliyet'] } }
        }
      }
    ]);

    res.json(stats[0] || {
      toplam_mazot_litre: 0,
      toplam_mazot_maliyet: 0,
      toplam_sefer: 0,
      toplam_lastik_tamir: 0,
      toplam_lastik_maliyet: 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Belirli bir kamyonun kayıtlarını getir
router.get('/by-truck/:plaka', async (req, res) => {
  try {
    const records = await MonthlyRecord.find({ 
      kamyon_plaka: req.params.plaka,
      isActive: true 
    }).sort({ ay: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Belirli bir kamyonun belirli bir aydaki kaydını getir
router.get('/:plaka/:ay', async (req, res) => {
  try {
    const record = await MonthlyRecord.findOne({
      kamyon_plaka: req.params.plaka,
      ay: req.params.ay,
      isActive: true
    });
    
    if (!record) {
      return res.status(404).json({ message: 'Kayıt bulunamadı' });
    }
    
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Yeni kayıt ekle
router.post('/', async (req, res) => {
  try {
    // Aynı plaka ve ay için aktif kayıt var mı kontrol et
    const existingRecord = await MonthlyRecord.findOne({
      kamyon_plaka: req.body.kamyon_plaka,
      ay: req.body.ay,
      isActive: true
    });

    if (existingRecord) {
      return res.status(400).json({ 
        message: `${req.body.kamyon_plaka} plakalı kamyonun ${req.body.ay} ayına ait aktif kaydı zaten mevcut` 
      });
    }

    const record = new MonthlyRecord({
      ...req.body,
      isActive: true
    });
    const newRecord = await record.save();
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Kayıt güncelle
router.put('/:plaka/:ay', async (req, res) => {
  try {
    // Güncellenen kayıt dışında aynı plaka ve ay için aktif kayıt var mı kontrol et
    const existingRecord = await MonthlyRecord.findOne({
      kamyon_plaka: req.body.kamyon_plaka,
      ay: req.body.ay,
      isActive: true,
      _id: { $ne: req.body._id } // Kendi ID'si hariç
    });

    if (existingRecord) {
      return res.status(400).json({ 
        message: `${req.body.kamyon_plaka} plakalı kamyonun ${req.body.ay} ayına ait başka bir aktif kaydı zaten mevcut` 
      });
    }

    const record = await MonthlyRecord.findOneAndUpdate(
      {
        kamyon_plaka: req.params.plaka,
        ay: req.params.ay,
        isActive: true
      },
      req.body,
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ message: 'Kayıt bulunamadı' });
    }

    res.json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Kayıt sil (soft delete)
router.delete('/:plaka/:ay', async (req, res) => {
  try {
    const record = await MonthlyRecord.findOneAndUpdate(
      {
        kamyon_plaka: req.params.plaka,
        ay: req.params.ay
      },
      { isActive: false },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ message: 'Kayıt bulunamadı' });
    }

    res.json({ message: 'Kayıt silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Belirli bir kamyonun tüm kayıtlarını soft delete
router.delete('/by-truck/:plaka', async (req, res) => {
  try {
    const result = await MonthlyRecord.updateMany(
      { kamyon_plaka: req.params.plaka },
      { isActive: false }
    );
    res.json({ message: `${result.modifiedCount} kayıt silindi` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Belirli bir kamyonun tüm kayıtlarını geri yükle
router.put('/by-truck/:plaka/restore', async (req, res) => {
  try {
    const result = await MonthlyRecord.updateMany(
      { kamyon_plaka: req.params.plaka },
      { isActive: true }
    );
    res.json({ message: `${result.modifiedCount} kayıt geri yüklendi` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Kayıt geri yükle
router.put('/:plaka/:ay/restore', async (req, res) => {
  try {
    const record = await MonthlyRecord.findOneAndUpdate(
      {
        kamyon_plaka: req.params.plaka,
        ay: req.params.ay
      },
      { isActive: true },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ message: 'Kayıt bulunamadı' });
    }

    res.json({ message: 'Kayıt geri yüklendi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 