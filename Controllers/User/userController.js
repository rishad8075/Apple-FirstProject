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
      return res.render('User/login');
       
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
            return res.render('User/login',{errorMessage:"not user found"})
        }
        if (user.isBlocked) {
            return res.render('User/login', { errorMessage: "Your account has been blocked. Contact support." });
        }
        const isMatch = await user.comparePassword(password);
        if(!isMatch){
            return res.status(400).render('User/login',{errorMessage:"invalid Password"});
        }

        req.session.userId = user._id; 
        await req.session.save();
        res.redirect('/');

    }catch(err){
        res.status(500).render('User/login', {
           errorMessage: 'Error login. Please try again.'
        });

    }
}



// const loadShopPage= async (req, res) => {
//     try {
//         if (!req.session.userId) return res.redirect('/login');

//         // Get query parameters with defaults
//         const queryParams = {
//             search: req.query.search || '',
//             category: req.query.category || '',
//             price: req.query.price || '',
//             sort: req.query.sort || '',
//             page: Math.max(1, parseInt(req.query.page) || 1)
//         };

//         // Build base query
//         const query = { 
//             isBlocked: false 
//         };

//         // Apply filters
//         if (queryParams.search) {
//             query.$or = [
//                 { productName: { $regex: queryParams.search, $options: 'i' } },
//                 { description: { $regex: queryParams.search, $options: 'i' } }
//             ];
//         }

//         if (queryParams.category) {
//             query.category = queryParams.category;
//         }

//         if (queryParams.price) {
//             const [min, max] = queryParams.price.split('-');
//             query.regularPrice = {};
//             if (min) query.regularPrice.$gte = Number(min);
//             if (max) query.regularPrice.$lte = Number(max);
//         }

//         // Set sort
//         const sortOptions = {
//             'price_asc': { regularPrice: 1 },
//             'price_desc': { regularPrice: -1 },
//             'name_asc': { productName: 1 },
//             'name_desc': { productName: -1 },
//             '': { createdAt: -1 } // default
//         };
//         const sort = sortOptions[queryParams.sort] || sortOptions[''];

//         // Pagination
//         const perPage = 12;
//         const skip = (queryParams.page - 1) * perPage;

        
//         const [totalProducts, products, categories] = await Promise.all([
//             Product.countDocuments(query),
//             Product.find(query)
//                 .sort(sort)
//                 .skip(skip)
//                 .limit(perPage)
//                 .lean(),
//             Category.aggregate([
//                 { $match: { isListed: true } },
//                 {
//                     $lookup: {
//                         from: 'products',
//                         let: { categoryId: '$_id' },
//                         pipeline: [
//                             { 
//                                 $match: { 
//                                     $expr: { $eq: ['$category', '$$categoryId'] },
                            
//                                     isBlocked: false
//                                 }
//                             }
//                         ],
//                         as: 'categoryProducts'
//                     }
//                 },
//                 {
//                     $project: {
//                         name: 1,
//                         productCount: { $size: '$categoryProducts' }
//                     }
//                 }
//             ])
//         ]);

        
//         const generateShopUrl = (newParams) => {
//             const params = { ...queryParams, ...newParams };
            
        
//             if (newParams.search !== undefined || newParams.category !== undefined || 
//                 newParams.price !== undefined || newParams.sort !== undefined) {
//                 params.page = 1;
//             }
            
         
//             Object.keys(params).forEach(key => {
//                 if (!params[key]) delete params[key];
//             });
            
//             return '/shop?' + new URLSearchParams(params).toString();
//         };

        
//         res.render("user/shop", {
//             products,
//             categories,
//             currentPage: queryParams.page,
//             totalPages: Math.ceil(totalProducts / perPage),
//             searchQuery: queryParams.search,
//             categoryFilter: queryParams.category,
//             priceFilter: queryParams.price,
//             sortOption: queryParams.sort,
//             generateShopUrl,
//             user: await User.findById(req.session.userId)
//         });

//     } catch (error) {
//         console.error('Shop error:', error);
//         res.status(500).send('Error loading shop: ' + error.message);
//     }
// };

// const productDetailPage = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const userData = await User.findById(userId);
//         const productId = req.params.id;
//         const product = await Product.findById(productId).populate('category');
//         const findCategory = product.category;
//         const categoryOffer = findCategory?.categoryOffer || 0;
//         const productOffer = product.productOffer || 0;
//         const totalOffer = categoryOffer + productOffer;
        
       
//         const relatedProducts = await Product.find({
//             category: findCategory._id,
//             _id: { $ne: productId } 
//         }).limit(4); 
        
//         res.render("user/productDetails", {
//             user: userData,
//             product: product,
//             quantity: product.stock,
//             totalOffer: totalOffer,
//             category: findCategory,
//             relatedProducts: relatedProducts 
//         });
//     } catch (error) {
//         console.error("Error fetching product details:", error);
//         res.render('page-404');
//     }
// };








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
//   loadShopPage,
//   productDetailPage,
  Logout,
};
