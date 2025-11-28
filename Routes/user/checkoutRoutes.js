const router = require("express").Router();
const auth = require("../../middleware/UserAuth");
const checkout = require("../../Controllers/User/checkoutController");

router.get("/checkout", auth, checkout.getCheckoutPage);
router.get("/checkout/AddAddress", auth, checkout.checkoutAdd_Address);
router.post("/checkout/AddAddress", auth, checkout.checkoutAddAddress);

router.post("/place-order/:addressId", auth, checkout.placeOrderCOD);
router.get("/order-success/:orderId", auth, checkout.orderSuccessPage);

module.exports = router;
