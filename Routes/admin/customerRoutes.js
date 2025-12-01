const express = require("express");
const router = express.Router();
const CustomerController = require("../../Controllers/Admin/customerController");
const adminAuth = require("../../middleware/adminAuth");

// Customer Management
router.get("/admin/users", adminAuth, CustomerController.customerInfo);
router.post('/admin/users/:id/block', adminAuth, CustomerController.BlockUser);
router.post('/admin/users/:id/unblock', adminAuth, CustomerController.UnblockUser);

module.exports = router;
