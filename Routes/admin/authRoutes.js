const express = require("express");
const router = express.Router();
const adminController = require("../../Controllers/Admin/adminController");
const adminAuth = require("../../middleware/adminAuth");

// Admin login/logout
router.get("/admin/login", adminController.loadlogin);
router.post("/admin/login", adminController.Adminlogin);
router.get('/admin/logout', adminController.adminLogout);

// Dashboard (you can keep protected by adminAuth)

router.get("/admin", adminAuth, adminController.loadDashboard);

module.exports = router;
