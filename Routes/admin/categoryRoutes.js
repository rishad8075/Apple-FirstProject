const express = require("express");
const router = express.Router();
const CategoryController = require("../../Controllers/Admin/categoryController");
const adminAuth = require("../../middleware/adminAuth");
router.use(adminAuth)
router.get("/admin/category", CategoryController.categoryInfo);
router.post("/admin/addCategory", CategoryController.addCategory);
router.patch("/admin/listCategory", CategoryController.listCategory);
router.patch("/admin/unlistCategory", CategoryController.unlistCategory);
router.get("/admin/editCategory/:id", CategoryController.getEditCategoryPage);
router.patch("/admin/editCategory/:id", CategoryController.editCategory);
router.delete("/admin/deleteCategory",CategoryController.deleteCategory);
router.patch("/admin/category/add-offer",CategoryController.addCategoryOffer);
router.patch("/admin/category/remove-offer",CategoryController.removeCategoryOffer);

module.exports = router;
