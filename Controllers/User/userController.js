const User = require("../../model/user");
const session = require("express-session");
const Product = require("../../model/Product");
const nodemailer =require("nodemailer");
const { render } = require("ejs");






const loadHome = async (req, res) => {
     
  const user =req.session?.userId
 
  try {
   if (!user) {
    return res.redirect("/login")
      
  }

        const product = await Product.find({})
            const userData = await User.findById(user);
            return res.render('user/home', { 
                user: userData,
                products:product
                
            
            });
  

  } catch (error) {
    return res.status(500).send('Server error. Please try again.'+error);
  }
};

const loadSignup = (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.render("User/signup");
};

function generateOtp(){
   return Math.floor(100000 + Math.random()*900000).toString();
};


async function sendVerificationEmail(email, otp) {
    try {
        console.log('Sending email to:', email);  // Debugging line

        if (!email) {
            console.log('Error: Email is undefined or empty');
            return false;
        }

        const transport = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const info = await transport.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Verify your Account',
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`
        });

        return info.accepted.length > 0;
    } catch (error) {
        console.log('Error sending email:', error);
        return false;
    }
}


const signup = async (req,res)=>{
    const {name,email,password,phoneNumber,confirmPassword} = req.body;
    try {
        if(req.session.userId){
          return res.redirect("/")
        }
     
     
      if(password!==confirmPassword){
        return res.render('User/signup',{errorMessage:"password not match"})
      }

      const findUser = await User.findOne({email});
      if(findUser){
        return res.render("User/signup",{errorMessage:"User with this email already exists"});
      }

      const otp =generateOtp() 

      console.log('Generated OTP:', otp); 
     
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.status(500).json({ error: 'Failed to send email' });
        }
        
        req.session.userOtp = otp;
        req.session.userData = { email, password, phoneNumber, name };
        
        res.render('User/verifyOtp');
    } catch (err) {
        console.error("Error during signup:", err);
        res.status(500).render('error', {
            message: 'Error  Please try again.'+err
        });
    }
}


const verifyOtp = async (req,res)=>{
  const {otp} = req.body;
  console.log(otp)

  try {

    if(req.session.userId){
      return res.redirect("/")
    }

    if(otp==req.session.userOtp){
      const user = req.session.userData
      const saveUserData = new User({
        name:user.name,
        email:user.email,
        phoneNumber:user.phoneNumber,
        password:user.password
      });
      saveUserData.save()
      console.log('signup completed')
       req.session.user = saveUserData._id;
            res.json({
                success:true,
                redirectUrl:'/login'})
        }else {
            res.status(400).json({success:false,message:'invalid OTP. Please try again'})
        }

    } catch (error) {
        console.error('Error verifying OTP',error);
        res.status(500).json({
            success:false,
            message:'An error occured'})
    }

}

const resendOtp = async (req, res) => {
    try {
        if (!req.session.userData || !req.session.userData.email) {
            return res.status(400).json({
                success: false,
                message: "Session expired. Please signup again"
            });
        }

        const { email } = req.session.userData;

        const otp = generateOtp();
        req.session.userOtp = otp;

        await req.session.save();

        const sent = await sendVerificationEmail(email, otp);

        if (!sent) {
            return res.status(500).json({
                success: false,
                message: "Failed to resend OTP"
            });
        }

        console.log("Resent OTP:", otp);

        res.json({
            success: true,
            message: "OTP sent successfully"
        });

    } catch (error) {
        console.log("Error in resendOtp:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};



const Loadlogin = async (req,res)=>{
    if(!req.session.userId){
      return res.render('user/login');
       
    }
     return res.redirect('/');
}

const login = async (req,res) => {
    const {email,password} = req.body;
    try{
        if(req.session.userId){
            return res.redirect('/')
        }
        const user = await User.findOne({email});
        if(!user){
            return res.render('user/login',{errorMessage:"not user found"})
        }
        if (user.isBlocked) {
            return res.render('user/login', { errorMessage: "Your account has been blocked. Contact support." });
        }
        const isMatch = await user.comparePassword(password);
        if(!isMatch){
            return res.status(400).render('user/login',{errorMessage:"invalid Password"});
        }

        req.session.userId = user._id; 
        await req.session.save();
        res.redirect('/');

    }catch(err){
        res.status(500).render('error', {
            message: 'Error login. Please try again.'
        });

    }
}








const Logout = async(req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log("Logout error:", err);
            return res.status(500).send("Logout failed");
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.redirect('/login'); // Redirect to login page
    });
}

module.exports = {
  loadHome,
  loadSignup,
  signup,
  verifyOtp,
  resendOtp,
  Loadlogin,
  login,
  Logout,
};
