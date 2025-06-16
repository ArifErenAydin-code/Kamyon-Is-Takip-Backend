const express = require('express');
const router = express.Router();
const TruckRecord = require('../models/TruckRecord');

// Yeni kayıt oluştur
router.post('/', async (req, res) => {
  try {
    const record = new TruckRecord(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Tüm kayıtları getir
router.get('/', async (req, res) => {
  try {
    const records = await TruckRecord.find().sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Belirli bir kaydı getir
router.get('/:id', async (req, res) => {
  try {
    const record = await TruckRecord.findById(req.params.id);
    if (record) {
      res.json(record);
    } else {
      res.status(404).json({ message: 'Kayıt bulunamadı' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Kaydı güncelle
router.put('/:id', async (req, res) => {
  try {
    const record = await TruckRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Kaydı sil
router.delete('/:id', async (req, res) => {
  try {
    await TruckRecord.findByIdAndDelete(req.params.id);
    res.json({ message: 'Kayıt silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 