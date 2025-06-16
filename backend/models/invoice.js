const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  kamyon_plaka: {
    type: String,
    required: true,
  },
  tarih: {
    type: Date,
    required: true,
  },
  tonaj: {
    type: Number,
    required: true,
    min: 0
  },
  fatura_no: {
    type: String,
    required: false,
  },
  fatura_tutari: {
    type: Number,
    required: false,
    min: 0
  },
  fatura_resmi: {
    type: String,
    required: false,
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Aynı fatura numarası bir kez kullanılabilir
invoiceSchema.index({ fatura_no: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Invoice', invoiceSchema); 