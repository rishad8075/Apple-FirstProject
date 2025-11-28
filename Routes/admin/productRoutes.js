const express = require("express");
const router = express.Router();
const productController = require("../../Controllers/Admin/productController");
const adminAuth = require("../../middleware/adminAuth");
const multer = require('../../helpers/multer');

router.get("/", adminAuth, productController.listProducts);
router.get("/add", adminAuth, productController.addProducts);
router.post("/add", multer.any(), adminAuth, productController.addProductPost);
router.patch("/block/:id", adminAuth, productController.blockProduct);
router.patch("/unblock/:id", adminAuth, productController.unblockProduct);
router.delete("/delete/:id", adminAuth, productController.deleteProduct);
router.get("/edit/:id", adminAuth, productController.editProductGet);
router.post("/edit/:id", adminAuth, multer.any(), productController.editProductPost);

module.exports = router;
