const router = require("express").Router();
const auth = require("../../middleware/UserAuth");
const checkout = require("../../Controllers/User/checkoutController");
const checkBlock = require("../../middleware/checkBlock");


router.get("/checkout", auth,checkBlock, checkout.getCheckoutPage);
router.get("/checkout/validate", auth,checkBlock, checkout.validateCheckout);

router.get("/checkout/AddAddress", auth, checkout.checkoutAdd_Address);
router.post("/checkout/AddAddress", auth, checkout.checkoutAddAddress);

router.get("/payment", auth, checkout.paymentPage); // Render payment.ejs
router.post("/checkout/complete-order", auth, checkout.placeOrder);
router.post("/api/payment/razorpay/create", auth, checkout.createRazorpayOrder);
router.post("/api/payment/razorpay/verify", auth, checkout.verifyRazorpayPayment);
router.get("/order-success/:orderId", auth, checkout.orderSuccessPage);
router.get("/order-failure",auth,checkout.orderFailurePage)
router.post("/apply-coupon", auth, checkout.applyCoupon);
router.post("/remove-coupon", auth, checkout.removeCoupon);
router.post('/api/payment/razorpay/failure',auth,checkBlock,checkout.razorpayPaymentFailed)
router.get("/api/payment/razorpay/retry/:orderId",auth,checkBlock,checkout.retryRazorpayPayment);
router.post("/api/payment/razorpay/RetryVerify",auth,checkBlock,checkout.retryVerifyPayment)
router.post('/checkout/validate-stock',auth,checkout.validateStock);

module.exports = router;
