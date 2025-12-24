const router = require("express").Router();
const auth = require("../../middleware/UserAuth");
const cart = require("../../Controllers/User/CartController");
const checkBlock = require("../../middleware/checkBlock");


router.post("/cart/add",checkBlock, auth, cart.addToCart);
router.get("/cart", checkBlock,auth, cart.getCart);
router.post("/cart/update-quantity",checkBlock, auth, cart.updateQuantity);
router.post("/cart/remove-item",checkBlock, auth, cart.removeItem);
router.post("/cart/add-from-wishlist", checkBlock, auth,cart.addToCartFromWishlist);

module.exports = router;
