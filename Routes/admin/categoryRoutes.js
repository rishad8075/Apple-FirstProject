const express = require("express");
const router = express.Router();
const CategoryController = require("../../Controllers/Admin/categoryController");
const adminAuth = require("../../middleware/adminAuth");

router.get("/category", CategoryController.categoryInfo);
router.post("/addCategory", CategoryController.addCategory);
router.patch("/listCategory", CategoryController.listCategory);
router.patch("/unlistCategory", CategoryController.unlistCategory);
router.get("/editCategory/:id", CategoryController.getEditCategoryPage);
router.patch("/editCategory/:id", CategoryController.editCategory);
router.delete("/deleteCategory",CategoryController.deleteCategory);
router.patch("/category/add-offer",CategoryController.addCategoryOffer);
router.patch("/category/remove-offer",CategoryController.removeCategoryOffer);

module.exports = router;
