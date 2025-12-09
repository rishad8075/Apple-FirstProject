const express = require("express");
const router = express.Router();
const Auth = require("../../middleware/UserAuth")

const WishlistController = require("../../Controllers/User/wishlistController");



router.post('/wishlist/toggle',Auth,WishlistController.toggleWishlist);
router.get("/wishlist",Auth,WishlistController.getWishlist);
router.delete("/wishlist/remove", Auth, WishlistController.removeFromWishlist);





module.exports=router