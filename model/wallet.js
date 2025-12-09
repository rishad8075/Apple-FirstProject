// File: model/Wallet.js

const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    transactions: [{
        amount: { type: Number, required: true },
        type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
        source: { type: String, enum: ['CANCEL', 'RETURN', 'PAYMENT', 'ADMIN'], required: true },
        description: { type: String },
        date: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Wallet', walletSchema);