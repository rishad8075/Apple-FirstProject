const express = require('express');
const router = express.Router();
const { getUserCoupons } = require('../../Controllers/User/couponController');

// User coupons page
router.get('/my-coupons', getUserCoupons);

module.exports = router;
