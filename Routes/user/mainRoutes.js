const router = require("express").Router();
const UserController = require("../../Controllers/User/userController");
const auth = require("../../middleware/UserAuth");

router.get("/", auth, UserController.loadHome);
router.get("/shop", auth, UserController.loadShopPage);
router.get("/productDetails/:id", auth, UserController.loadProductDetail);

module.exports = router;
