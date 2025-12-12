// const express = require("express");
// const router = express.Router();
// const UserController = require("../Controllers/User/userController");
// const passport = require("passport");
// const authMiddleware = require('../middleware/UserAuth');
// const profileController = require("../Controllers/User/profileController");
// const cartController = require("../Controllers/User/CartController");
// const checkoutController = require("../Controllers/User/checkoutController");
// const ordersController = require("../Controllers/User/orderController");
// const upload = require('../helpers/multerProfile');
// const checkBlock = require('../middleware/checkBlock');


// router.use(checkBlock);
// router.get('/', authMiddleware,UserController.loadHome);
// router.get("/signup",UserController.loadSignup);
// router.post("/signup",UserController.signup);
// router.post("/verify-otp",UserController.verifyOtp);
// router.post("/resend-otp",UserController.resendOtp);
// router.get("/login",UserController.Loadlogin);
// router.post("/login",UserController.login);
// router.get("/logout",UserController.Logout);
// router.get("/shop",authMiddleware,UserController.loadShopPage);
// router.get("/productDetails/:id",authMiddleware,UserController.loadProductDetail);






// // Google Signup & Login
// router.get('/auth/google',
//     passport.authenticate('google', { scope: ['profile', 'email'] })
// );

// router.get('/auth/google/callback',
//     passport.authenticate('google', { failureRedirect: '/login' }),
//     (req, res) => {

      
//         if (req.user.isBlocked) {

//             req.logout(() => {
//                 req.session.destroy(() => {
//                     return res.render("user/login", {
//                         errorMessage: "User is Blocked. Please contact Admin"
//                     });
//                 });
//             });

//         } else {

//             // Save session
//             req.session.userId = req.user._id;
//             res.redirect('/');
//         }
//     }
// );



// //profile Management
// router.get("/user/forgotPassword",profileController.getForgot_password);
// router.post("/forgot-email-valid",profileController.postForgot_password);
// router.post('/verify-passForgot-otp',profileController.verifyPassForgotOtp)
// router.get('/reset-password',profileController.getResetPassword);
// router.post("/resend-forgot-otp",profileController.resend_ForgotPass_Otp);
// router.post("/reset-password",profileController.resetPassword);
// router.get("/user/profile",authMiddleware,profileController.userProfile);
// router.get('/user/edit-profile', authMiddleware, profileController.getEditProfile);
// router.post(
//     '/user/profileEdit',
//     authMiddleware,
//     upload.single('profileImage'),   
//     profileController.postEditProfile
// );



// //address Management
// router.get("/user/addresseManagement",authMiddleware,profileController.userAddressManagement);
// router.post("/user/add-address",authMiddleware,profileController.addAddress);
// router.delete("/user/delete-address/:id",authMiddleware,profileController.deleteAddress);
// router.get("/user/edit-address/:id",authMiddleware,profileController.getEditAddress);
// router.patch("/user/edit-address/:id",authMiddleware,profileController.postEditAddress);
// router.patch('/user/set-default-address/:id',authMiddleware,profileController.setDefaultAddress);

// // change password
// router.patch("/user/change-password",authMiddleware,profileController.changePassword);

// //change email
// router.get("/user/ChangeEmail-valid",authMiddleware,profileController.getchangeEmail_valid);
// router.post("/user/ChangeEmail-valid",authMiddleware,profileController.postchangeEmail);
// router.post("/user/ChangeEmail-OtpVerify",authMiddleware,profileController.verifyChangeEmail_otp);
// router.post("/user/resendOtp-changeEmail",authMiddleware,profileController.resend_changeEmail_Otp);
// router.get("/user/changeEmail",authMiddleware,profileController.getchangeEmail)
// router.post("/user/changeEmail",authMiddleware,profileController.changeEmail);



// //Cart Management

// router.post("/cart/add",authMiddleware,cartController.addToCart);
// router.get("/cart",authMiddleware,cartController.getCart);
// router.post("/cart/update-quantity",authMiddleware,cartController.updateQuantity);
// router.post("/cart/remove-item",authMiddleware,cartController.removeItem);


// //checkout Management

// router.get("/checkout",authMiddleware,checkoutController.getCheckoutPage);
// router.get("/checkout/AddAddress",authMiddleware,checkoutController.checkoutAdd_Address);
// router.post("/checkout/AddAddress",authMiddleware,checkoutController.checkoutAddAddress);
// router.post("/place-order/:addressId", checkoutController.placeOrderCOD);
// router.get("/order-success/:orderId", checkoutController.orderSuccessPage);


// //Order management

// router.get("/orders", authMiddleware, ordersController.listOrders);

// // View order details
// router.get("/orders/detail/:orderId", authMiddleware, ordersController.orderDetail);

// // Cancel order or individual product
// router.post("/orders/cancel-entire", authMiddleware, ordersController.cancelEntireOrder);
// router.post('/orders/cancel-product',authMiddleware,ordersController.cancelProduct);

// // Return order or individual product
// router.post("/return-order", ordersController.returnOrder);


// // Download invoice as PDF
// router.get("/order/invoice/:orderId", ordersController.downloadInvoice);





// module.exports= router;


