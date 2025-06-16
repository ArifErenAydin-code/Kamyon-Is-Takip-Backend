const mongoose = require('mongoose');

const operationSchema = new mongoose.Schema({
  dukkan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workshop',
    required: true
  },
  kamyon_plaka: {
    type: String,
    required: true
  },
  maliyet: {
    type: Number,
    required: true,
    min: 0
  },
  yapilan_is: {
    type: String,
    required: true,
    trim: true
  },
  tarih: {
    type: Date,
    required: true,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Kaydetmeden önce tarihi düzenle
operationSchema.pre('save', function(next) {
  if (this.isModified('tarih')) {
    const date = new Date(this.tarih);
    date.setHours(0, 0, 0, 0);
    this.tarih = date;
  }
  next();
});

module.exports = mongoose.model('Operation', operationSchema); 