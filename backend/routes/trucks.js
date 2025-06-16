const express = require('express');
const router = express.Router();
const Truck = require('../models/truck');
const axios = require('axios');
const MonthlyRecord = require('../models/monthlyRecord');

// Yeni kamyon ekle
router.post('/', async (req, res) => {
  try {
    console.log('Gelen veri:', req.body);

    // Plaka kontrolü
    if (!req.body.plaka) {
      return res.status(400).json({ message: 'Plaka alanı zorunludur' });
    }

    // Plaka formatı kontrolü (örnek: 34 ABC 123)
    const plakaRegex = /^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$/;
    if (!plakaRegex.test(req.body.plaka.replace(/\s/g, ''))) {
      return res.status(400).json({ message: 'Geçersiz plaka formatı' });
    }

    // Plaka benzersizlik kontrolü
    const existingTruck = await Truck.findOne({ plaka: req.body.plaka });
    if (existingTruck) {
      return res.status(400).json({ message: 'Bu plaka zaten kayıtlı' });
    }

    const truck = new Truck({
      plaka: req.body.plaka.toUpperCase(),
      isActive: true
    });

    console.log('Oluşturulan truck:', truck);
    await truck.save();
    res.status(201).json(truck);
  } catch (error) {
    console.error('Hata detayı:', error);
    res.status(400).json({ message: error.message || 'Kamyon eklenirken bir hata oluştu' });
  }
});

// Tüm kamyonları listele
router.get('/', async (req, res) => {
  try {
    const trucks = await Truck.find().sort({ createdAt: -1 });
    res.json(trucks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Plakaya göre kamyon getir
router.get('/:plaka', async (req, res) => {
  try {
    const truck = await Truck.findOne({ plaka: req.params.plaka, isActive: true });
    if (!truck) {
      return res.status(404).json({ message: 'Kamyon bulunamadı' });
    }
    res.json(truck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Kamyon bilgilerini güncelle
router.put('/:plaka', async (req, res) => {
  try {
    const truck = await Truck.findOneAndUpdate(
      { plaka: req.params.plaka, isActive: true },
      req.body,
      { new: true }
    );
    if (!truck) {
      return res.status(404).json({ message: 'Kamyon bulunamadı' });
    }
    res.json(truck);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Kamyonu sil (soft delete)
router.delete('/:plaka', async (req, res) => {
  try {
    const truck = await Truck.findOneAndUpdate(
      { plaka: req.params.plaka },
      { isActive: false },
      { new: true }
    );
    if (!truck) {
      return res.status(404).json({ message: 'Kamyon bulunamadı' });
    }

    // İlgili işlemleri soft delete yap
    try {
      await MonthlyRecord.updateMany(
        { kamyon_plaka: req.params.plaka },
        { isActive: false }
      );
      console.log(`${req.params.plaka} plakalı kamyonun aylık kayıtları soft delete edildi`);
    } catch (error) {
      console.error('Aylık kayıtlar silinirken hata:', error);
    }

    res.json({ message: 'Kamyon ve ilgili tüm kayıtlar silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Kamyonu geri yükle
router.put('/:plaka/restore', async (req, res) => {
  try {
    const truck = await Truck.findOneAndUpdate(
      { plaka: req.params.plaka },
      { isActive: true },
      { new: true }
    );
    if (!truck) {
      return res.status(404).json({ message: 'Kamyon bulunamadı' });
    }

    // İlgili işlemleri geri yükle
    try {
      await axios.put(`http://localhost:5000/api/operations/by-truck/${req.params.plaka}/restore`);
    } catch (error) {
      console.error('İşlemler geri yüklenirken hata:', error);
    }

    // İlgili aylık kayıtları geri yükle
    try {
      await axios.put(`http://localhost:5000/api/monthly-records/by-truck/${req.params.plaka}/restore`);
    } catch (error) {
      console.error('Aylık kayıtlar geri yüklenirken hata:', error);
    }

    res.json({ message: 'Kamyon ve ilgili tüm kayıtlar geri yüklendi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Kamyonu kalıcı olarak sil
router.delete('/:plaka/permanent', async (req, res) => {
  try {
    const truck = await Truck.findOneAndDelete({ plaka: req.params.plaka });
    if (!truck) {
      return res.status(404).json({ message: 'Kamyon bulunamadı' });
    }

    // İlgili işlemleri kalıcı olarak sil
    try {
      await axios.delete(`http://localhost:5000/api/operations/by-truck/${req.params.plaka}/permanent`);
    } catch (error) {
      console.error('İşlemler kalıcı olarak silinirken hata:', error);
    }

    // İlgili aylık kayıtları kalıcı olarak sil
    try {
      await axios.delete(`http://localhost:5000/api/monthly-records/by-truck/${req.params.plaka}`);
    } catch (error) {
      console.error('Aylık kayıtlar kalıcı olarak silinirken hata:', error);
    }

    res.json({ message: 'Kamyon ve ilgili tüm kayıtlar kalıcı olarak silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 