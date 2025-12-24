const express = require("express");
const router = express.Router();
const CustomerController = require("../../Controllers/Admin/customerController");
const adminAuth = require("../../middleware/adminAuth");

router.use(adminAuth)

router.get("/admin/users", CustomerController.customerInfo);
router.post('/admin/users/:id/block', CustomerController.BlockUser);
router.post('/admin/users/:id/unblock', CustomerController.UnblockUser);

module.exports = router;
