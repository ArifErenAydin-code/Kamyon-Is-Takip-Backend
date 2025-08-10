const fs = require('fs').promises;
const path = require('path');

// Temizlenecek klasörlerin listesi
const CLEANUP_DIRS = [
    {
        path: 'uploads',
        maxAge: 1000 * 60 * 5, // 5 dakika
        pattern: /.*/ // Tüm dosyalar
    },
    {
        path: 'runs/detect',
        maxAge: 1000 * 60 * 5, // 5 dakika
        pattern: /.*/ // Tüm dosyalar
    }
];

// Belirtilen klasördeki eski dosyaları temizle
async function cleanupDirectory(dirConfig) {
    try {
        const now = Date.now();
        const dirPath = path.join(process.cwd(), dirConfig.path);

        // Klasör yoksa oluştur
        await fs.mkdir(dirPath, { recursive: true });

        // Klasördeki dosyaları listele
        const files = await fs.readdir(dirPath);

        for (const file of files) {
            try {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);

                // Eğer bu bir klasörse, içeriğini de temizle
                if (stats.isDirectory()) {
                    const subDirConfig = {
                        ...dirConfig,
                        path: path.join(dirConfig.path, file)
                    };
                    await cleanupDirectory(subDirConfig);
                    
                    // Boş klasörü sil
                    const subDirFiles = await fs.readdir(filePath);
                    if (subDirFiles.length === 0) {
                        await fs.rmdir(filePath);
                        console.log(`🗑️  Boş klasör silindi: ${filePath}`);
                    }
                }
                // Dosyaysa ve yeterince eskiyse sil
                else if (dirConfig.pattern.test(file)) {
                    const fileAge = now - stats.mtimeMs;
                    if (fileAge > dirConfig.maxAge) {
                        await fs.unlink(filePath);
                        console.log(`🗑️  Eski dosya silindi: ${filePath}`);
                    }
                }
            } catch (err) {
                console.error(`❌ Dosya işlenemedi: ${file}`, err);
            }
        }
    } catch (err) {
        console.error(`❌ Klasör temizlenemedi: ${dirConfig.path}`, err);
    }
}

// Tüm klasörleri temizle
async function cleanupAll() {
    console.log('\n🧹 Geçici dosyalar temizleniyor...');
    
    for (const dir of CLEANUP_DIRS) {
        await cleanupDirectory(dir);
    }
    
    console.log('✨ Temizlik tamamlandı\n');
}

// Periyodik temizlik işlemini başlat
function startCleanupSchedule(interval = 1000 * 60 * 5) { // Varsayılan: 5 dakika
    console.log('\n🔄 Otomatik temizlik başlatıldı');
    console.log(`⏰ Temizlik aralığı: ${interval / (1000 * 60)} dakika`);
    
    // İlk temizliği hemen yap
    cleanupAll();
    
    // Periyodik temizliği başlat
    return setInterval(cleanupAll, interval);
}

module.exports = {
    cleanupAll,
    startCleanupSchedule
}; 