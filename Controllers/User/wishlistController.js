const Wishlist = require("../../model/wishlist");
const Products = require("../../model/Product");
const User = require("../../model/user")

exports.getWishlist = async (req, res) => {
    try {
        const userid = req.session.userId;
        const wishlist = await Wishlist.findOne({ userId: req.session.userId })
            .populate("products.productId")
            .lean();

        if (!wishlist) {
            return res.render("User/wishlist", { wishlistItems: [] });
        }
        const user = await User.findById(userid)

        // Filter out items where productId failed to populate
        const wishlistItems = wishlist.products
            .filter(item => item.productId !== null) // product exists
            .map(item => ({
                Product_id: item.productId._id,
                product: item.productId,
                Added_at: item.addedAt
            }));

        res.render("User/wishlist", { wishlistItems,user });

    } catch (error) {
        console.error(error);
        res.render("page-404");
    }
};

// Toggle Wishlist (add/remove)
exports.toggleWishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        const productId = req.body.productId;

        // Find wishlist for user
        let wishlist = await Wishlist.findOne({ userId });

        // If no wishlist exists, create one
        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

        // Check if product already exists
        const index = wishlist.products.findIndex(p => p.productId.toString() === productId);

        if (index > -1) {
            
            return res.json({ success: false, message: 'Product is already in wishlist' });
        } else {
            // Add product
            wishlist.products.push({ productId });
            await wishlist.save();
            return res.json({ success: true, action: 'added', message: 'Product added to wishlist' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Remove from Wishlist (used after Add to Cart)
exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { productId } = req.body; 

        await Wishlist.updateOne(
            { userId: userId },
            { $pull: { products: { productId } } }
        );

        res.json({ success: true, message: "Product removed from wishlist" });
    } catch (error) {
        console.error("Wishlist remove error:", error);
        res.status(500).json({ success: false });
    }
};


