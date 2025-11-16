const express = require("express");
const router = express.Router();
const UserController = require("../Controllers/User/userController");



router.get("/",UserController.loadHome);
router.get("/signup",UserController.loadSignup);
router.post("/signup",UserController.signup);
router.post("/verify-otp",UserController.verifyOtp);
router.post("/resend-otp",UserController.resendOtp);
router.get("/login",UserController.Loadlogin);
router.post("/login",UserController.login);
router.get("/logout",UserController.Logout)

module.exports= router;


