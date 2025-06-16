const express = require('express');
const router = express.Router();
const Workshop = require('../models/workshop');

// Tüm dükkanları listele
router.get('/', async (req, res) => {
  try {
    const workshops = await Workshop.find();
    res.json(workshops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Yeni dükkan ekle
router.post('/', async (req, res) => {
  try {
    const workshop = new Workshop({
      dukkan_adi: req.body.dukkan_adi,
      isActive: true
    });
    const newWorkshop = await workshop.save();
    res.status(201).json(newWorkshop);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ID'ye göre dükkan getir
router.get('/:id', async (req, res) => {
  try {
    const workshop = await Workshop.findOne({ _id: req.params.id, isActive: true });
    if (!workshop) {
      return res.status(404).json({ message: 'Dükkan bulunamadı' });
    }
    res.json(workshop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dükkanı güncelle
router.put('/:id', async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      { dukkan_adi: req.body.dukkan_adi },
      { new: true }
    );
    if (!workshop) {
      return res.status(404).json({ message: 'Dükkan bulunamadı' });
    }
    res.json(workshop);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Dükkanı soft delete
router.delete('/:id', async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!workshop) {
      return res.status(404).json({ message: 'Dükkan bulunamadı' });
    }
    res.json({ message: 'Dükkan silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dükkanı geri yükle
router.put('/:id/restore', async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    if (!workshop) {
      return res.status(404).json({ message: 'Dükkan bulunamadı' });
    }
    res.json(workshop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dükkanı kalıcı olarak sil
router.delete('/:id/permanent', async (req, res) => {
  try {
    const workshop = await Workshop.findByIdAndDelete(req.params.id);
    if (!workshop) {
      return res.status(404).json({ message: 'Dükkan bulunamadı' });
    }
    res.json({ message: 'Dükkan kalıcı olarak silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 