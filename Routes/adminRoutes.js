const express = require("express");
const router = express.Router();
const adminController = require("../Controllers/Admin/adminController");
const Customer = require("../Controllers/Admin/customerController");
const { model } = require("mongoose");
const CategoryController = require("../Controllers/Admin/categoryController");
const adminAuth = require("../middleware/adminAuth");
const productController = require("../Controllers/Admin/productController");
const adminOrderController = require("../Controllers/Admin/orderController");
const multer = require('../helpers/multer');




router.get("/admin",adminController.loadDashboard);
router.get("/admin/login",adminController.loadlogin);
router.post("/admin/login",adminController.Adminlogin)
router.get('/admin/logout',adminController.adminLogout);


// Customer Management
router.get("/admin/users",Customer.customerInfo);
router.post('/admin/users/:id/block',Customer.BlockUser);
router.post('/admin/users/:id/unblock',Customer.UnblockUser);

//Category Management
router.get("/admin/category",adminAuth,CategoryController.categoryInfo);
router.post("/admin/addCategory",adminAuth,CategoryController.addCategory);
router.patch("/admin/listCategory",adminAuth,CategoryController.listCategory);
router.patch("/admin/unlistCategory",adminAuth,CategoryController.unlistCategory);
router.get("/admin/editCategory/:id", adminAuth, CategoryController.getEditCategoryPage);
router.patch("/admin/editCategory/:id", adminAuth, CategoryController.editCategory);
router.delete("/admin/deleteCategory",adminAuth,CategoryController.deleteCategory)

//product Managemen
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


//admin order Management

router.get('/admin/orders',adminAuth, adminOrderController.listOrdersAdmin);
router.get('/admin/orders/detail/:id',adminAuth, adminOrderController.orderDetailAdmin);
router.post('/admin/orders/update-status',adminAuth, adminOrderController.updateOrderStatusAdmin);
router.post('/admin/orders/cancel-product',adminAuth, adminOrderController.cancelProductAdmin);





module.exports=router;