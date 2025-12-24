const express = require("express");
const router = express.Router();
const productController = require("../../Controllers/Admin/productController");
const adminAuth = require("../../middleware/adminAuth");
const multer = require('../../helpers/multer');
router.use(adminAuth)
router.get("/admin/products",productController.listProducts)
router.get("/admin/addProducts",productController.addProducts);
router.post('/admin/addProducts', multer.any(),   
  productController.addProductPost
);
router.patch("/admin/block-product/:id",productController.blockProduct);
router.patch("/admin/unblock-product/:id",productController.unblockProduct);
router.delete("/admin/delete-product/:id",productController.deleteProduct);
router.get("/admin/edit-product/:id",productController.editProductGet);
router.post('/admin/edit-product/:id',  multer.any(), productController.editProductPost);
router.patch("/admin/product/add-offer", productController.addProductOffer);
router.patch("/admin/product/remove-offer",productController.removeProductOffer);



module.exports = router;
