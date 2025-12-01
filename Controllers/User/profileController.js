const User = require("../../model/user");
const nodemailer = require("nodemailer");
const UserAddress = require("../../model/address");
const address = require("../../model/address");
const bcrypt = require("bcryptjs");
const fs = require('fs')
const path = require("path")

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
        const enteredOtp = req.body.otp; 

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
        res.render("page-404")
    }
};

const resend_ForgotPass_Otp = async (req,res)=>{
    try {
        const email = req.session.userData;

        if (!email) {
            return res.status(400).json({ success: false, message: "Session expired. Please try again." });
        }

        const otp = generateOtp();
        req.session.otp = otp;

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
        if(req.session.Otp){
            req.session.Otp = null
        }
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

// User profile


const userProfile = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) return res.redirect('/login'); // Safety check

        const userData = await User.findById(userId).lean(); // lean() returns plain JS object
        if (!userData) return res.redirect('/login'); // If user not found

        res.render("User/profileInfo", {
            user: userData,        // pass user to EJS
            activeLink: 'profile'  // tells sidebar which menu is active
        });

    } catch (error) {
        console.log(error);
        res.render("page-404", { error: error });
    }
};


//editprofile
const getEditProfile = async (req, res) => {
    try {
        const userId = req.session.userId; // get logged-in user id from session
       

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).render('page-404', { errorMessage: "User not found" });
        }

        res.render('User/editProfile', { user }); // pass user data to ejs

    } catch (error) {
        console.error("Error loading edit profile page:", error);
        res.status(500).render('page-404', { errorMessage: "Something went wrong" });
    }
};

const postEditProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).send("User not found");

    const { name, phoneNumber, dob, removeImage } = req.body;

    user.name = name;
    user.phoneNumber = phoneNumber;
    user.dob = dob ? new Date(dob) : null;

    // Remove image
    if (removeImage === "true") {
      if (user.profileImage && user.profileImage !== "/images/user-default.png") {
        const oldImagePath = path.resolve('public', user.profileImage.substring(1));
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }
      user.profileImage = "/images/user-default.png";
    }

    // Upload new image
    else if (req.file) {
      if (user.profileImage && user.profileImage !== "/images/user-default.png") {
        const oldImagePath = path.resolve('public', user.profileImage.substring(1));
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }
      user.profileImage = `/uploads/profile-images/${req.file.filename}`;
    }

    await user.save();
    res.redirect("/user/profile");

  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};




// Change Password

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;

    const userData = await User.findById(userId);

    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Compare current password using bcrypt
    const isMatch = await userData.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    // Update password
    userData.password = newPassword;
    await userData.save();

    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




//change Email



const getchangeEmail_valid = async (req,res)=>{
    try {

        res.render("User/changeEmail-valid");
        
    } catch (error) {
        console.log(error)
        res.status(500).render("page-404",{errorMessage:"server Error"})
    }
}

const postchangeEmail = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email: email });
        if (!user) {
            return res.render("User/changeEmail-valid", {
                errorMessage: "Email does not exist"
            });
        }

        const otp = generateOtp();
        req.session.otp = otp;
        req.session.userData = email;

        console.log("Generated OTP: " + otp);

        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) console.log("OTP wasn't sent");

        return res.render("User/changeEmailOtp-verify");

    } catch (error) {
        console.error("Error during sending otp:", error);
        return res.status(500).render("page-404", {
            errorMessage: "Error. Please try again." + error
        });
    }
};

const verifyChangeEmail_otp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
      

        if (!enteredOtp) {
            return res.json({ success: false, message: "OTP is missing" });
        }

        console.log("Entered OTP:", enteredOtp);
        console.log("Session OTP:", req.session.otp);

        if (enteredOtp.toString() === req.session.otp.toString()) {
            return res.json({ success: true, redirectUrl: "/user/changeEmail" });
        } else {
            return res.json({ success: false, message: "OTP not matching" });
        }

    } catch (error) {
        console.log("Verify OTP error:", error);
        return res.status(500).json({ success: false, message: "An error occurred" });
    }
};



const resend_changeEmail_Otp = async (req,res)=> {
    try {
        const email = req.session.userData;

        if (!email) {
            return res.status(400).json({ success: false, message: "Session expired. Please try again." });
        }

        const otp = generateOtp();
        req.session.otp = otp; 

        console.log("Resending OTP to:", email, "OTP:", otp);

        const emailSent = await sendVerificationEmail(email, otp);

        if (emailSent) {
            return res.status(200).json({ success: true, message: "OTP resend successful" });
        } else {
            return res.status(500).json({ success: false, message: "Failed to send OTP" });
        }

    } catch (error) {
        console.error("Error in resend OTP:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getchangeEmail = async (req, res) => {
    try {
        res.render("User/changeEmail");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};



const changeEmail = async (req, res) => {
    try {
        const { newEmail } = req.body;
        const email = req.session.userData;  

       

        const user = await User.findOne({ email });

       
        user.email =newEmail;
        await user.save();

        res.redirect("/user/profile");

    } catch (error) {
        console.error("Error resetting password:", error);
        res.redirect("/pageNotFound");
    }
};


















// User Address management (CRUD)


const userAddressManagement = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId)

        // Get all addresses of this user
        const userAddresses = await UserAddress.find({ user: userId });

        res.render("User/addressManagement", {
            user,
            addresses: userAddresses,
            activeLink: 'profile'
        });

    } catch (error) {
        console.error(error);
        res.render("page-404");
    }
};



const addAddress = async (req, res) => { 
    try {
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not logged in" });
        }

        const { fullname, email, mobile, houseName, locality, pincode, district, state, isDefault: userSetDefault } = req.body;

        // Basic server-side validation
        if (!fullname || !email || !mobile || !houseName || !locality || !pincode || !district || !state) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Check if the user already has addresses
        const existingAddresses = await UserAddress.find({ user: userId });

        // Determine if this should be default
        let isDefault = existingAddresses.length === 0 ? true : false;
        if (userSetDefault) {
            // If user wants this as default, unset previous default
            await UserAddress.updateMany({ user: userId, isDefault: true }, { $set: { isDefault: false } });
            isDefault = true;
        }

        const newAddress = new UserAddress({
            user: userId,
            fullname,
            email,
            mobile,
            houseName,
            locality,
            pincode,
            district,
            state,
            isDefault
        });

        await newAddress.save();

        // Return the newly added address so frontend can update UI dynamically
        res.json({ success: true, message: "New address added", address: newAddress });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


const deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.session.userId;

        // Ensure the address belongs to the logged-in user
        const address = await UserAddress.findOne({ _id: addressId, user: userId });
        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        await UserAddress.deleteOne({ _id: addressId });

        res.json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


// GET: Edit Address Page
const getEditAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.session.userId;

        if (!userId) throw new Error("User not found, try again");

        const address = await UserAddress.findOne({ _id: addressId, user: userId });
        if (!address) throw new Error("Address not found");

        res.render("User/editAddress", { address });

    } catch (error) {
        console.log(error);
        res.render("page-404");
    }
};

// POST: Save Edited Address
const postEditAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.session.userId;

        if (!userId) return res.json({ success: false, message: "User not found" });

        const updatedData = req.body;

        const address = await UserAddress.findOneAndUpdate(
            { _id: addressId, user: userId },
            { $set: updatedData },
            { new: true }
        );

        if (!address) return res.json({ success: false, message: "Address not found" });

        res.json({ success: true, message: "Address updated successfully!" });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Server error" });
    }
};

const setDefaultAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;
        //console.log("UserId:", userId, "AddressId:", addressId);

        if (!userId) return res.json({ success: false, message: "User not found" });

        // Set all user addresses to false
        await UserAddress.updateMany({ user: userId }, { isDefault: false });

        // Set selected address to true
        const updated = await UserAddress.findOneAndUpdate(
            { _id: addressId, user: userId },
            { isDefault: true },
            { new: true }
        );

        if (!updated) return res.json({ success: false, message: "Address not found" });

        res.json({ success: true, message: "Default address updated successfully" });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Server error" });
    }
};

















module.exports = {
    getForgot_password,
    postForgot_password,
    verifyPassForgotOtp,
    getResetPassword,
    resend_ForgotPass_Otp,
    resetPassword,
    userProfile,
    getEditProfile,
    postEditProfile,
    userAddressManagement,
    addAddress,
    deleteAddress,
    getEditAddress,
    postEditAddress,
    setDefaultAddress,
    changePassword,
    getchangeEmail_valid,
    postchangeEmail,
    verifyChangeEmail_otp,
    resend_changeEmail_Otp,
    getchangeEmail,
    changeEmail,
    
};
