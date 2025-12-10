const express = require("express");
const router = express.Router();
const auth = require("../../middleware/adminAuth");
const CouponController = require("../../Controllers/Admin/CouponController");



router.get("/admin/coupons/add",auth,CouponController.addCoupon);
router.get("/admin/coupons",auth,CouponController.getCoupon);
router.post("/admin/coupons/add",auth,CouponController.postAddCoupon);
router.get("/admin/coupons/edit/:id",auth,CouponController.getEditPage);
router.patch('/admin/coupons/edit/:id', auth,CouponController.editCoupon);
router.delete("/admin/coupons/delete/:id",auth, CouponController.deleteCoupon);





module.exports = router