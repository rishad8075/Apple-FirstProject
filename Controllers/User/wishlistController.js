const Wishlist = require("../../model/wishlist");
const Products = require("../../model/Product");
const User = require("../../model/user")

exports.getWishlist = async (req, res,next) => {
    try {
        const userid = req.session.userId;
        const wishlist = await Wishlist.findOne({ userId: req.session.userId })
            .populate("products.productId")
            .lean();

        if (!wishlist) {
            return res.render("User/wishlist", { wishlistItems: [] });
        }
        const user = await User.findById(userid)

   
        const wishlistItems = wishlist.products
            .filter(item => item.productId !== null)
            .map(item => ({
                Product_id: item.productId._id,
                product: item.productId,
                Added_at: item.addedAt
            }));

        res.render("User/wishlist", { wishlistItems,user });

    } catch (error) {
    next(error)
    }
};

// Toggle Wishlist (add/remove)
exports.toggleWishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        const productId = req.body.productId;
         
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Please login to add items to your wishlist' 
            });
        }

   
        let wishlist = await Wishlist.findOne({ userId });

        
        if (!wishlist) {
            wishlist = new Wishlist({ userId:userId, products: [] });
        }

     
        const index = wishlist.products.findIndex(p => p.productId.toString() === productId);

        if (index > -1) {
            
            return res.json({ success: false, message: 'Product is already in wishlist' });
        } else {
           
            wishlist.products.push({ productId });
            await wishlist.save();
            return res.json({ success: true, action: 'added', message: 'Product added to wishlist' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


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


