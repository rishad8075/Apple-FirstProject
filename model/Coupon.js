const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
   
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true, 
    },
    
   
    description: {
        type: String,
    },
    
  
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'], 
        required: true,
    },
    
 
    discountValue: {
        type: Number,
        required: true,
    },
    
    
    maxDiscountAmount: {
        type: Number, 
        default: null, 
    },
    
    
    minOrderAmount: {
        type: Number, 
        default: 0,
    },
    
   
    maxUses: {
        type: Number, 
        required: true,
    },
    
    usedCount: {
        type: Number,
        default: 0,
    },
     startDate: {
        type: Date,
        required: true,
    },
    
    
    expiryDate: {
        type: Date,
        required: true,
    },
    
    
    isActive: {
        type: Boolean,
        default: true,
    },
    
   
    appliedUsers: [{
        userId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        },
        usedAt: { 
            type: Date 
        },
    }],

}, { timestamps: true }); 

module.exports = mongoose.model('Coupon', couponSchema);