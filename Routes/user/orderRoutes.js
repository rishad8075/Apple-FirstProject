const router = require("express").Router();
const auth = require("../../middleware/UserAuth");
const orders = require("../../Controllers/User/orderController");

const checkBlock = require("../../middleware/checkBlock");

router.get("/orders",checkBlock, auth, orders.listOrders);


router.get("/orders/detail/:orderId",checkBlock, auth, orders.orderDetail);

// Cancel order
router.post("/orders/cancel-entire", auth, orders.cancelEntireOrder);
router.post("/orders/cancel-product", auth, orders.cancelProduct);

// Return
router.post("/return-order", auth, orders.returnOrder);

// Invoice
router.get("/order/invoice/:orderId", auth, orders.downloadInvoice);
router.post("/ReturnRequest/Cancel",auth,orders.returnCancel);

module.exports = router;
