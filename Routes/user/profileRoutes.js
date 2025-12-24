const router = require("express").Router();
const auth = require("../../middleware/UserAuth");
const upload = require("../../helpers/multerProfile");
const profile = require("../../Controllers/User/profileController");

// Forgot / Reset Password
router.get("/user/forgotPassword", profile.getForgot_password);
router.post("/forgot-email-valid", profile.postForgot_password);
router.post("/verify-passForgot-otp", profile.verifyPassForgotOtp);
router.get("/reset-password", profile.getResetPassword);
router.post("/reset-password", profile.resetPassword);
router.post("/resend-forgot-otp", profile.resend_ForgotPass_Otp);
const checkBlock = require("../../middleware/checkBlock");

// Profile
router.get("/user/profile",checkBlock, auth, profile.userProfile);
router.get("/user/edit-profile", auth, profile.getEditProfile);

router.post(
    "/user/profileEdit",
    auth,
    upload.single("profileImage"),
    profile.postEditProfile
);

// Password
router.patch("/user/change-password", auth, profile.changePassword);

// Change email
router.get("/user/changeEmail", auth, profile.getchangeEmail);
router.post("/user/changeEmail", auth, profile.changeEmail);
router.get("/user/ChangeEmail-valid", auth, profile.getchangeEmail_valid);
router.post("/user/ChangeEmail-valid", auth, profile.postchangeEmail);
router.post("/user/ChangeEmail-OtpVerify", auth, profile.verifyChangeEmail_otp);
router.post("/user/resendOtp-changeEmail", auth, profile.resend_changeEmail_Otp);

module.exports = router;
