const express = require("express");
const router = express.Router();

router.use( require("./authRoutes"));
router.use( require("./categoryRoutes"));
router.use(require("./productRoutes"));
router.use( require("./orderRoutes"));
router.use(require("./customerRoutes"));
router.use(require("./couponRoutes"));
router.use(require("./salesReportRoutes"))

module.exports = router;
