const mongoose = require('mongoose');

const monthlyRecordSchema = new mongoose.Schema({
    kamyon_plaka: {
        type: String,
        required: true,
    },
    ay: {
        type: String, // YYYY-MM formatında
        required: true,
    },
    mazot_litre: {
        type: Number,
        required: true,
        min: 0
    },
    mazot_maliyet: {
        type: Number,
        required: true,
        min: 0
    },
    sefer_sayisi: {
        type: Number,
        required: true,
        min: 0
    },
    lastik_tamir_sayisi: {
        type: Number,
        required: true,
        min: 0
    },
    lastik_tamir_maliyet: {
        type: Number,
        required: true,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Aynı kamyon için aynı ayda sadece bir kayıt olabilir
monthlyRecordSchema.index({ kamyon_plaka: 1, ay: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyRecord', monthlyRecordSchema); 