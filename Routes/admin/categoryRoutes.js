const express = require("express");
const router = express.Router();
const CategoryController = require("../../Controllers/Admin/categoryController");
const adminAuth = require("../../middleware/adminAuth");

router.get("/admin/category", adminAuth, CategoryController.categoryInfo);
router.post("/admin/addCategory", adminAuth, CategoryController.addCategory);
router.patch("/admin/listCategory", adminAuth, CategoryController.listCategory);
router.patch("/admin/unlistCategory", adminAuth, CategoryController.unlistCategory);
router.get("/admin/editCategory/:id", adminAuth, CategoryController.getEditCategoryPage);
router.patch("/admin/editCategory/:id", adminAuth, CategoryController.editCategory);
router.delete("/admin/deleteCategory", adminAuth, CategoryController.deleteCategory);
router.patch("/admin/category/add-offer", adminAuth,CategoryController.addCategoryOffer);
router.patch("/admin/category/remove-offer", adminAuth,CategoryController.removeCategoryOffer);

module.exports = router;
