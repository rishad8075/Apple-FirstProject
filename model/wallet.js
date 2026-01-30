const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true }, // Keep as uppercase for consistency
  source: { 
    type: String, 
    enum: ['CANCEL', 'RETURN', 'PAYMENT', 'ADMIN', 'TOPUP',"ORDER_PAYMENT", "REFERRAL","SIGNUP_BONUS"], 
    required: true 
},
    description: { type: String },
    date: { type: Date, default: Date.now }
});

const walletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    transactions: [transactionSchema],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Wallet', walletSchema);
