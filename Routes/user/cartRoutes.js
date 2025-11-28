const router = require("express").Router();
const auth = require("../../middleware/UserAuth");
const cart = require("../../Controllers/User/CartController");

router.post("/cart/add", auth, cart.addToCart);
router.get("/cart", auth, cart.getCart);
router.post("/cart/update-quantity", auth, cart.updateQuantity);
router.post("/cart/remove-item", auth, cart.removeItem);

module.exports = router;
