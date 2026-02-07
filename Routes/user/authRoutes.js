const router = require("express").Router();
const UserController = require("../../Controllers/User/userController");
const passport = require("passport");
const User = require("../../model/user")

// Signup / Login
router.get("/signup", UserController.loadSignup);
router.post("/signup", UserController.signup);
router.post("/verify-otp", UserController.verifyOtp);
router.post("/resend-otp", UserController.resendOtp);

router.get("/login", UserController.Loadlogin);
router.post("/login", UserController.login);
router.get("/logout", UserController.Logout);

// Google Auth
router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {

        if (req.user.isBlocked) {
            req.logout(() => {
                req.session.destroy(() => {
                    res.render("User/login", { errorMessage: "User is Blocked" });
                });
            });
        } else {
            req.session.userId = req.user._id;
            res.redirect('/');
        }
    }
);

module.exports = router;
