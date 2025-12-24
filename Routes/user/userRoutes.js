const express = require("express");
const router = express.Router();
const checkBlock = require("../../middleware/checkBlock");





router.use(require("./authRoutes"));
router.use(require("./mainRoutes"));
router.use(require("./profileRoutes"));
router.use(require("./addressRoutes"));
router.use(require("./cartRoutes"));
router.use(require("./checkoutRoutes"));
router.use(require("./orderRoutes"));
router.use(require("./wishlistRoutes"));
router.use(require("./couponRoutes"))
router.use(require("./walletRoutes"))


module.exports = router;
