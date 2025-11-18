const express = require("express");
const router = express.Router();
const UserController = require("../Controllers/User/userController");
const passport = require("passport")



router.get("/",UserController.loadHome);
router.get("/signup",UserController.loadSignup);
router.post("/signup",UserController.signup);
router.post("/verify-otp",UserController.verifyOtp);
router.post("/resend-otp",UserController.resendOtp);
router.get("/login",UserController.Loadlogin);
router.post("/login",UserController.login);
router.get("/logout",UserController.Logout);
//router.get("/shop",UserController.loadShopPage);
//router.get("/productDetails/:id",UserController.productDetailPage)




// google signup
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/signup' }),
    (req, res) => {
        req.session.userId = req.user._id;  
        res.redirect('/');  
    }
);


router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        if (req.user.isBlocked) {
            req.logout(() => {
                req.session.destroy(() => {
                    res.render("user/login",{errorMessage:"user is Blocked. Please contact Admin"}) // Redirect with an error message
                });
            });
        } else {
            req.session.userId = req.user._id;
            res.redirect('/');
        }
    }
);


module.exports= router;


