const express = require("express");
const router = express.Router();
const adminController = require("../../Controllers/Admin/adminController");
const adminAuth = require("../../middleware/adminAuth");


router.get("/login", adminController.loadlogin);
router.post("/login", adminController.Adminlogin);
router.get('/logout', adminController.adminLogout);



router.get("/", adminAuth, adminController.loadDashboard);

module.exports = router;
