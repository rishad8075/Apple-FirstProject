const mongoose = require('mongoose');
const { Schema } = mongoose;

const PaymentSchema = new Schema({
  orderId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Orders', 
    required: true,
    unique: true // one payment per order
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentMethod: { 
    type: String, 
    enum: ['Razorpay', 'COD', 'Wallet'], 
    default: 'Razorpay' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'], 
    default: 'Pending' 
  },
  paymentGatewayId: { // ID returned by the gateway
    type: String,
    default: null
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  paymentDate: { type: Date, default: Date.now },
  failureReason: { type: String, default: null } // if payment failed
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
