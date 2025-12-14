const express = require("express");
const router = express.Router();
const productController = require("../../Controllers/Admin/productController");
const adminAuth = require("../../middleware/adminAuth");
const multer = require('../../helpers/multer');

router.get("/admin/products",adminAuth,productController.listProducts)
router.get("/admin/addProducts",adminAuth,productController.addProducts);
router.post('/admin/addProducts', multer.any(),    // ← IMPORTANT (accepts all dynamic field names)
  adminAuth,productController.addProductPost
);
router.patch("/admin/block-product/:id",adminAuth,productController.blockProduct);
router.patch("/admin/unblock-product/:id",adminAuth,productController.unblockProduct);
router.delete("/admin/delete-product/:id",adminAuth,productController.deleteProduct);
router.get("/admin/edit-product/:id",adminAuth,productController.editProductGet);
router.post('/admin/edit-product/:id', adminAuth, multer.any(), productController.editProductPost);
router.patch("/admin/product/add-offer", adminAuth,productController.addProductOffer);
router.patch("/admin/product/remove-offer",adminAuth,productController.removeProductOffer);




module.exports = router;
