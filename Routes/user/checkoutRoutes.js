const router = require("express").Router();
const auth = require("../../middleware/UserAuth");
const checkout = require("../../Controllers/User/checkoutController");

router.get("/checkout", auth, checkout.getCheckoutPage);
router.get("/checkout/AddAddress", auth, checkout.checkoutAdd_Address);
router.post("/checkout/AddAddress", auth, checkout.checkoutAddAddress);

router.get("/payment", auth, checkout.paymentPage); // Render payment.ejs
router.post("/checkout/complete-order", auth, checkout.placeOrder);
router.post("/api/payment/razorpay/create", auth, checkout.createRazorpayOrder);
router.post("/api/payment/razorpay/verify", auth, checkout.verifyRazorpayPayment);
router.get("/order-success/:orderId", auth, checkout.orderSuccessPage);
router.get("/order-failure",auth,checkout.orderFailurePage)
module.exports = router;
