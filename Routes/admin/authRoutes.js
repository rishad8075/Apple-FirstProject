const express = require("express");
const router = express.Router();
const adminController = require("../../Controllers/Admin/adminController");
const adminAuth = require("../../middleware/adminAuth");


router.get("/admin/login", adminController.loadlogin);
router.post("/admin/login", adminController.Adminlogin);
router.get('/admin/logout', adminController.adminLogout);



router.get("/admin", adminAuth, adminController.loadDashboard);

module.exports = router;
