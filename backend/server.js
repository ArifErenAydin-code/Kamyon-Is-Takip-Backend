const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { startCleanupSchedule } = require('./utils/cleanup');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Atlas Bağlantı URL'i
const MONGODB_URI = 'mongodb+srv://admin:admin@cluster0.wqau3dn.mongodb.net/truckDB?retryWrites=true&w=majority&appName=Cluster0';
const PORT = 5000;

// MongoDB Atlas Bağlantısı
mongoose.connect(MONGODB_URI).then(() => {
  console.log('MongoDB Atlas bağlantısı başarılı');
}).catch((err) => {
  console.error('MongoDB Atlas bağlantı hatası:', err);
});

// Routes
const truckRoutes = require('./routes/truck');
app.use('/api/truck', truckRoutes);

// Otomatik temizlik işlemini başlat (30 dakikada bir)
startCleanupSchedule(1000 * 60 * 30);

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
}); 