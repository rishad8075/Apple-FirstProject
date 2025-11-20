const User = require("../../model/user");
const nodemailer = require("nodemailer");

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {
        console.log('sending email to ' + email);

        if (!email) return false;

        const transport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const info = await transport.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your Account",
            html: `<b>Your OTP: ${otp}</b>`
        });

        console.log("Email send response:", info.accepted);

        return info.accepted && info.accepted.length > 0;

    } catch (error) {
        console.log("Error sending email:", error);
        return false;
    }
}

const getForgot_password = async (req, res) => {
    try {
        return res.render("User/forgot-password");
    } catch (error) {
        return res.render("page-404");
    }
};

const postForgot_password = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email: email });
        if (!user) {
            return res.render("User/forgot-password", {
                errorMessage: "Email does not exist"
            });
        }

        const otp = generateOtp();
        req.session.otp = otp;
        req.session.userData = email;

        console.log("Generated OTP: " + otp);

        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) console.log("OTP wasn't sent");

        return res.render("User/forgotPass-otp");

    } catch (error) {
        console.error("Error during sending otp:", error);
        return res.status(500).render("page-404", {
            errorMessage: "Error. Please try again." + error
        });
    }
};

const verifyPassForgotOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp; // FIXED

        if (!enteredOtp) {
            return res.json({ success: false, message: "OTP is missing" });
        }

        if (enteredOtp.toString() === req.session.otp.toString()) {
            return res.json({ success: true, redirectUrl: "/reset-password" });
        } else {
            return res.json({ success: false, message: "OTP not matching" });
        }

    } catch (error) {
        console.log("Verify OTP error:", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};

const getResetPassword = async (req, res) => {
    try {
        res.render("User/resetPassword");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

const resend_ForgotPass_Otp = async (req,res)=>{
    try {
        const email = req.session.userData;

        if (!email) {
            return res.status(400).json({ success: false, message: "Session expired. Please try again." });
        }

        const otp = generateOtp();
        req.session.Otp = otp;

        console.log("Resending OTP to:", email);

        const emailSent = await sendVerificationEmail(email, otp);

        if (emailSent) {
            console.log("Resend OTP:"+otp+"to : "+email);
            return res.status(200).json({ success: true, message: "OTP resend successful" });
        } else {
            return res.status(500).json({ success: false, message: "Failed to send OTP" });
        }

    } catch (error) {
        console.error("Error in resend OTP:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const resetPassword = async (req, res) => {
    try {
        const { newPass1, newPass2 } = req.body;
        const email = req.session.userData;  

        if (newPass1 !== newPass2) {
            return res.render("User/resetPassword", { message: "Passwords do not match" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.render("User/resetPassword", { message: "User not found" });
        }

        user.password = newPass1;
        await user.save();

        res.redirect("/login");

    } catch (error) {
        console.error("Error resetting password:", error);
        res.redirect("/pageNotFound");
    }
};

module.exports = {
    getForgot_password,
    postForgot_password,
    verifyPassForgotOtp,
    getResetPassword,
    resend_ForgotPass_Otp,
    resetPassword,
};
