const express = require("express");
const router = express.Router();
const OrderController = require("../../Controllers/Admin/orderController");
const adminAuth = require("../../middleware/adminAuth");

// Order Management
router.get("/", adminAuth, OrderController.listOrdersAdmin);
router.get("/detail/:id", adminAuth, OrderController.orderDetailAdmin);
router.post("/update-status", adminAuth, OrderController.updateOrderStatusAdmin);
router.post("/cancel-product", adminAuth, OrderController.cancelProductAdmin);

module.exports = router;
