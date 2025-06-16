const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const trucksRouter = require('./routes/trucks');
const workshopsRouter = require('./routes/workshops');
const operationsRouter = require('./routes/operations');
const monthlyRecordsRouter = require('./routes/monthlyRecords');
const invoicesRouter = require('./routes/invoices');

const app = express();

// Debug middleware - tüm istekleri logla
app.use((req, res, next) => {
  console.log('\n--- Yeni İstek ---');
  console.log('Zaman:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Body var mı:', !!req.body);
  console.log('Files var mı:', !!req.files);
  
  // Orijinal send fonksiyonunu kaydet
  const originalSend = res.send;
  
  // send fonksiyonunu override et
  res.send = function(body) {
    console.log('Yanıt:', body);
    return originalSend.call(this, body);
  };
  
  next();
});

// CORS ayarları
app.use(cors({
  origin: [
    'https://kamyon-is-takip-frontend.vercel.app',
    'https://kamyon-takip.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB bağlantısı
mongoose.connect('mongodb+srv://admin:admin@cluster0.wqau3dn.mongodb.net/truckDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB bağlantısı başarılı');
}).catch((err) => {
  console.error('MongoDB bağlantı hatası:', err);
});

// Route'ları kullan
app.use('/api/trucks', trucksRouter);
app.use('/api/workshops', workshopsRouter);
app.use('/api/operations', operationsRouter);
app.use('/api/monthly-records', monthlyRecordsRouter);
app.use('/api/invoices', invoicesRouter);

// Ana route
app.get('/', (req, res) => {
  res.json({ message: 'Kamyon İş Takip API' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
}); 