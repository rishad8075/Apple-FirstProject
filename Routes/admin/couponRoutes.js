const express = require("express");
const router = express.Router();
const auth = require("../../middleware/adminAuth");
const CouponController = require("../../Controllers/Admin/CouponController");




router.get("/coupons/add",CouponController.addCoupon);
router.get("/coupons",CouponController.getCoupon);
router.post("/coupons/add",CouponController.postAddCoupon);
router.get("/coupons/edit/:id",CouponController.getEditPage);
router.patch('/coupons/edit/:id',CouponController.editCoupon);
router.delete("/coupons/delete/:id", CouponController.deleteCoupon);





module.exports = router