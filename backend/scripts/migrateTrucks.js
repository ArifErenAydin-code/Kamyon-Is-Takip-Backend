const mongoose = require('mongoose');
const Truck = require('../models/truck');

// MongoDB bağlantısı
mongoose.connect('mongodb+srv://admin:admin@cluster0.wqau3dn.mongodb.net/truckDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('MongoDB bağlantısı başarılı');
  
  try {
    // Tüm kamyonları bul
    const trucks = await Truck.find({});
    
    // Her kamyon için güncelleme yap
    for (const truck of trucks) {
      // Sadece plaka ve isActive alanlarını tut
      await Truck.updateOne(
        { _id: truck._id },
        {
          $unset: {
            mazot: "",
            sefer: "",
            lastik_tamir: "",
            ay: ""
          }
        }
      );
    }
    
    console.log('Kamyon verileri başarıyla güncellendi');
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}).catch((err) => {
  console.error('MongoDB bağlantı hatası:', err);
  process.exit(1);
}); 