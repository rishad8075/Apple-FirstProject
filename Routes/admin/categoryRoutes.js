const express = require("express");
const router = express.Router();
const CategoryController = require("../../Controllers/Admin/categoryController");
const adminAuth = require("../../middleware/adminAuth");

router.get("/", adminAuth, CategoryController.categoryInfo);
router.post("/add", adminAuth, CategoryController.addCategory);
router.patch("/list", adminAuth, CategoryController.listCategory);
router.patch("/unlist", adminAuth, CategoryController.unlistCategory);
router.get("/edit/:id", adminAuth, CategoryController.getEditCategoryPage);
router.patch("/edit/:id", adminAuth, CategoryController.editCategory);
router.delete("/delete", adminAuth, CategoryController.deleteCategory);

module.exports = router;
