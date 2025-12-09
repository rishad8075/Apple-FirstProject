const express = require("express");
const router = express.Router();
const adminOrderController = require("../../Controllers/Admin/orderController");
const adminAuth = require("../../middleware/adminAuth");

// Order Management
router.get('/admin/orders',adminAuth, adminOrderController.listOrdersAdmin);
router.get('/admin/orders/detail/:id',adminAuth, adminOrderController.orderDetailAdmin);
router.post('/admin/orders/update-status',adminAuth, adminOrderController.updateOrderStatusAdmin);
router.post('/admin/orders/cancel-product',adminAuth, adminOrderController.cancelProductAdmin);
// router.get('/admin/returns', adminAuth, adminOrderController.listReturnRequestsAdmin);
// router.post('/admin/returns/approve', adminAuth, adminOrderController.approveReturnAdmin);
// router.post('/admin/returns/reject', adminAuth, adminOrderController.rejectReturnAdmin);

module.exports = router;
