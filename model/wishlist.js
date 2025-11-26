const mongoose = require('mongoose');

const { Schema } = mongoose;

const WishlistSchema = new Schema({
    // 1. User_id: Unique identifier for the user. We ensure only one wishlist document per user.
    User_id: { 
        type: Schema.Types.ObjectId, 
        required: true,
        ref: 'User', // Reference to your User model
        unique: true // Ensures only one Wishlist document exists per user
    },
    
    // 2. Products: An array to hold all the items (sub-documents) the user has wishlisted.
    Products: [
        {
            // The product ID itself (reference to the Product model)
            Product_id: { 
                type: Schema.Types.ObjectId, 
                required: true, 
                ref: 'Product' // Reference to your Product model
            },
            
            // Timestamp for when this specific product was added
            Added_at: { 
                type: Date, 
                default: Date.now 
            }
        }
    ],

    // Optional: General document timestamps
    Created_at: { type: Date, default: Date.now },
    Updated_at: { type: Date, default: Date.now }

}, { timestamps: false }); // Note: We set timestamps to false if we use custom Created/Updated_at fields

const Wishlist = mongoose.model('Wishlist', WishlistSchema);

module.exports = Wishlist; // Or use export default if using ES modules