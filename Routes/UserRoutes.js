const express = require("express");
const router = express.Router();
const UserController = require("../Controllers/User/userController");



router.get("/",UserController.loadHome);
router.get("/signup",UserController.loadSignup);
router.post("/signup",UserController.signup);


module.exports= router;


