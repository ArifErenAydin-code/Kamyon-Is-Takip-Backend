const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
  plaka: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Truck', truckSchema); 