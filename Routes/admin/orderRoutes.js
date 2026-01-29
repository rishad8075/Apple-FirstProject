const express = require("express");
const router = express.Router();
const adminOrderController = require("../../Controllers/Admin/orderController");
const adminAuth = require("../../middleware/adminAuth");



router.get('/orders', adminOrderController.listOrdersAdmin);
router.get('/orders/detail/:id', adminOrderController.orderDetailAdmin);
router.post('/orders/update-status',adminOrderController.updateOrderStatusAdmin);
router.post('/orders/cancel-product', adminOrderController.cancelProductAdmin);
router.get('/returns',  adminOrderController.listReturnRequestsAdmin);
 router.post('/returns/approve',  adminOrderController.approveReturnAdmin);
 router.post('/returns/reject',  adminOrderController.rejectReturnAdmin);

module.exports = router;
