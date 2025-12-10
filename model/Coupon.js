const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    // Unique identifier for the coupon
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true, // Store the code in uppercase for case-insensitive validation
    },
    
    // Description for admin reference
    description: {
        type: String,
    },
    
    // Type of discount: percentage or fixed amount
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'], 
        required: true,
    },
    
    // The value of the discount (e.g., 10 for 10% or 500 for ₹500 fixed)
    discountValue: {
        type: Number,
        required: true,
    },
    
    // Maximum amount that a percentage discount can reach (e.g., max ₹500 off)
    maxDiscountAmount: {
        type: Number, 
        default: null, // Null if not applicable (e.g., for fixed discounts)
    },
    
    // Minimum cart total required to use the coupon
    minOrderAmount: {
        type: Number, 
        default: 0,
    },
    
    // Total number of times this coupon can be used across all users
    maxUses: {
        type: Number, 
        required: true,
    },
    
    // Current count of how many times the coupon has been used
    usedCount: {
        type: Number,
        default: 0,
    },
     startDate: {
        type: Date,
        required: true,
    },
    
    // The date after which the coupon cannot be used
    expiryDate: {
        type: Date,
        required: true,
    },
    
    // Boolean flag to quickly enable/disable the coupon
    isActive: {
        type: Boolean,
        default: true,
    },
    
    // Tracks which users have applied this coupon to enforce one-time usage per user
    appliedUsers: [{
        userId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        },
        usedAt: { 
            type: Date 
        },
    }],

}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Coupon', couponSchema);