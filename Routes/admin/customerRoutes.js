const express = require("express");
const router = express.Router();
const CustomerController = require("../../Controllers/Admin/customerController");
const adminAuth = require("../../middleware/adminAuth");



router.get("/users", CustomerController.customerInfo);
router.post('/users/:id/block', CustomerController.BlockUser);
router.post('/users/:id/unblock', CustomerController.UnblockUser);

module.exports = router;
