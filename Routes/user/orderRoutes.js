const router = require("express").Router();
const auth = require("../../middleware/UserAuth");
const orders = require("../../Controllers/User/orderController");

// List all orders
router.get("/orders", auth, orders.listOrders);

// Order detail
router.get("/orders/detail/:orderId", auth, orders.orderDetail);

// Cancel order
router.post("/orders/cancel-entire", auth, orders.cancelEntireOrder);
router.post("/orders/cancel-product", auth, orders.cancelProduct);

// Return
router.post("/return-order", auth, orders.returnOrder);

// Invoice
router.get("/order/invoice/:orderId", auth, orders.downloadInvoice);
router.post("/ReturnRequest/Cancel",auth,orders.returnCancel);

module.exports = router;
