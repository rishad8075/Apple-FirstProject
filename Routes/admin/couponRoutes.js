const express = require("express");
const router = express.Router();
const auth = require("../../middleware/adminAuth");
const CouponController = require("../../Controllers/Admin/CouponController");


router.use(auth)

router.get("/admin/coupons/add",CouponController.addCoupon);
router.get("/admin/coupons",CouponController.getCoupon);
router.post("/admin/coupons/add",CouponController.postAddCoupon);
router.get("/admin/coupons/edit/:id",CouponController.getEditPage);
router.patch('/admin/coupons/edit/:id',CouponController.editCoupon);
router.delete("/admin/coupons/delete/:id", CouponController.deleteCoupon);





module.exports = router