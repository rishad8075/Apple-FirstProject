const express = require('express');
const router = express.Router();
const { getUserCoupons } = require('../../Controllers/User/couponController');
const checkBlock = require("../../middleware/checkBlock");

// User coupons page
router.get('/my-coupons',checkBlock, getUserCoupons);

module.exports = router;
