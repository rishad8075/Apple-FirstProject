const express = require("express");
const router = express.Router();
const productController = require("../../Controllers/Admin/productController");
const adminAuth = require("../../middleware/adminAuth");
const multer = require('../../helpers/multer');

router.get("/products",productController.listProducts)
router.get("/addProducts",productController.addProducts);
router.post('/addProducts', multer.any(),   
  productController.addProductPost
);
router.patch("/block-product/:id",productController.blockProduct);
router.patch("/unblock-product/:id",productController.unblockProduct);
router.delete("/delete-product/:id",productController.deleteProduct);
router.get("/edit-product/:id",productController.editProductGet);
router.post('/edit-product/:id',  multer.any(), productController.editProductPost);
router.patch("/product/add-offer", productController.addProductOffer);
router.patch("/product/remove-offer",productController.removeProductOffer);



module.exports = router;
