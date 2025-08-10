const mongoose = require('mongoose');

const workshopSchema = new mongoose.Schema({
  dukkan_adi: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Workshop', workshopSchema); 