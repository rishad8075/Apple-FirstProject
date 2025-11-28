const express = require("express");
const router = express.Router();

router.use("/auth", require("./authRoutes"));
router.use("/category", require("./categoryRoutes"));
router.use("/product", require("./productRoutes"));
router.use("/order", require("./orderRoutes"));
router.use("/customer", require("./customerRoutes"));

module.exports = router;
