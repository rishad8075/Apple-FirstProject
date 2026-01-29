const express = require("express");
const router = express.Router();
const adminAuth = require("../../middleware/adminAuth")



router.use( require("./authRoutes"));



router.use(adminAuth);


router.use( require("./categoryRoutes"));
router.use(require("./productRoutes"));
router.use( require("./orderRoutes"));
router.use(require("./customerRoutes"));
router.use(require("./couponRoutes"));
router.use(require("./salesReportRoutes"))

module.exports = router;
