const mongoose = require('mongoose');
const MonthlyRecord = require('../models/monthly_record');

// MongoDB Atlas Bağlantı URL'i
const MONGODB_URI = 'mongodb+srv://admin:admin@cluster0.wqau3dn.mongodb.net/truckDB?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI).then(() => {
  console.log('MongoDB Atlas bağlantısı başarılı');
}).catch((err) => {
  console.error('MongoDB Atlas bağlantı hatası:', err);
});

async function activateRecords() {
  try {
    const result = await MonthlyRecord.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );
    
    console.log(`${result.modifiedCount} kayıt aktif edildi`);
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

activateRecords(); 