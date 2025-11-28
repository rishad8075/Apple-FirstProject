const express = require("express");
const router = express.Router();
const CustomerController = require("../../Controllers/Admin/customerController");
const adminAuth = require("../../middleware/adminAuth");

// Customer Management
router.get("/", adminAuth, CustomerController.customerInfo);
router.post("/:id/block", adminAuth, CustomerController.BlockUser);
router.post("/:id/unblock", adminAuth, CustomerController.UnblockUser);

module.exports = router;
