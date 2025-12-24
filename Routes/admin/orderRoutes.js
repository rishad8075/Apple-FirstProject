const express = require("express");
const router = express.Router();
const adminOrderController = require("../../Controllers/Admin/orderController");
const adminAuth = require("../../middleware/adminAuth");

router.use(adminAuth)

router.get('/admin/orders', adminOrderController.listOrdersAdmin);
router.get('/admin/orders/detail/:id', adminOrderController.orderDetailAdmin);
router.post('/admin/orders/update-status',adminOrderController.updateOrderStatusAdmin);
router.post('/admin/orders/cancel-product', adminOrderController.cancelProductAdmin);
router.get('/admin/returns',  adminOrderController.listReturnRequestsAdmin);
 router.post('/admin/returns/approve',  adminOrderController.approveReturnAdmin);
 router.post('/admin/returns/reject',  adminOrderController.rejectReturnAdmin);

module.exports = router;
