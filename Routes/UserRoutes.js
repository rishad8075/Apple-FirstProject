const express = require("express");
const router = express.Router();
const UserController = require("../Controllers/User/userController");
const passport = require("passport")
const authMiddleware = require('../middleware/UserAuth');
const profileController = require("../Controllers/User/profileController");
const checkBlock = require('../middleware/checkBlock')


router.use(checkBlock);
router.get('/', authMiddleware,UserController.loadHome);
router.get("/signup",UserController.loadSignup);
router.post("/signup",UserController.signup);
router.post("/verify-otp",UserController.verifyOtp);
router.post("/resend-otp",UserController.resendOtp);
router.get("/login",UserController.Loadlogin);
router.post("/login",UserController.login);
router.get("/logout",UserController.Logout);
router.get("/shop",authMiddleware,UserController.loadShopPage);
router.get("/productDetails/:id",authMiddleware,UserController.loadProductDetail);






// Google Signup & Login
router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {

      
        if (req.user.isBlocked) {

            req.logout(() => {
                req.session.destroy(() => {
                    return res.render("user/login", {
                        errorMessage: "User is Blocked. Please contact Admin"
                    });
                });
            });

        } else {

            // Save session
            req.session.userId = req.user._id;
            res.redirect('/');
        }
    }
);



//profile Management
router.get("/user/forgotPassword",profileController.getForgot_password);
router.post("/forgot-email-valid",profileController.postForgot_password);
router.post('/verify-passForgot-otp',profileController.verifyPassForgotOtp)
router.get('/reset-password',profileController.getResetPassword);
router.post("/resend-forgot-otp",profileController.resend_ForgotPass_Otp);
router.post("/reset-password",profileController.resetPassword);
router.get("/user/profile",authMiddleware,profileController.userProfile)
router.get("/user/addresseManagement",authMiddleware,profileController.userAddressManagement);



module.exports= router;


