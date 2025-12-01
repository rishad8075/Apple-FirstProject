const express = require("express");
const router = express.Router();

router.use( require("./authRoutes"));
router.use( require("./categoryRoutes"));
router.use(require("./productRoutes"));
router.use( require("./orderRoutes"));
router.use(require("./customerRoutes"));

module.exports = router;
