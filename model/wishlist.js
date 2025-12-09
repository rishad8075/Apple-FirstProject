const mongoose = require('mongoose');
const { Schema } = mongoose;

const WishlistSchema = new Schema({
    userId: { 
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        unique: true
    },
    products: [
        {
            productId: { 
                type: Schema.Types.ObjectId,
                required: true,
                ref: 'Product'
            },
            addedAt: { 
                type: Date, 
                default: Date.now 
            }
        }
    ]
}, { timestamps: true }); // Automatically adds createdAt & updatedAt

module.exports = mongoose.model('Wishlist', WishlistSchema);
