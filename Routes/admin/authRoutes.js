const express = require("express");
const router = express.Router();
const adminController = require("../../Controllers/Admin/adminController");


// Admin login/logout
router.get("/login", adminController.loadlogin);
router.post("/login", adminController.Adminlogin);
router.get("/logout", adminController.adminLogout);

// Dashboard (you can keep protected by adminAuth)
const adminAuth = require("../../middleware/adminAuth");
router.get("/", adminAuth, adminController.loadDashboard);

module.exports = router;
