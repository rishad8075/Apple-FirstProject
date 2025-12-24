const router = require("express").Router();
const UserController = require("../../Controllers/User/userController");
const auth = require("../../middleware/UserAuth");
const checkBlock = require("../../middleware/checkBlock");


router.get("/",checkBlock, auth, UserController.loadHome);
router.get("/shop",checkBlock, auth, UserController.loadShopPage);
router.get("/productDetails/:id",checkBlock, auth, UserController.loadProductDetail);

module.exports = router;
