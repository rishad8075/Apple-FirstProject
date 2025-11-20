const User = require("../../model/user");
const session = require("express-session");
const Category = require('../../model/category');
const Product = require("../../model/Product");
const nodemailer =require("nodemailer");
const { render } = require("ejs");






const loadHome = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect("/login");
        }

        // Fetch user
        const userData = await User.findById(req.session.userId).lean();

        // Fetch available, unblocked products sorted by newest
        const products = await Product.find({ 
            isBlocked: false,
            status: "Available"
        })
        .sort({ createdAt: -1 })
        .lean();

        // Map products to include first variant info and precompute display price
        const displayProducts = products.map(product => {
            const firstVariant = product.variants[0] || {};
            const price = firstVariant.salePrice && firstVariant.salePrice < firstVariant.regularPrice
                ? firstVariant.salePrice
                : firstVariant.regularPrice || 0;

            return {
                ...product,
                image: firstVariant.images || [],
                displayPrice: price,
                regularPrice: firstVariant.regularPrice || 0,
                hasDiscount: firstVariant.salePrice && firstVariant.salePrice < firstVariant.regularPrice
            };
        });

        return res.render('User/home', { 
            user: userData,
            products: displayProducts
        });

    } catch (error) {
        console.error("Error loading home:", error);
        return res.status(500).send('Server error: ' + error);
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
       req.session.userId = saveUserData._id;
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
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

    if (!req.session.userId) {
        return res.render("User/login");
    }
    return res.redirect("/");
};

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



const loadShopPage = async (req, res) => {
    try {
        if (!req.session.userId) return res.redirect('/login');

        const queryParams = {
            search: req.query.search || '',
            category: req.query.category || '',
            price: req.query.price || '',
            sort: req.query.sort || '',
            page: Math.max(1, parseInt(req.query.page) || 1)
        };

        // Base query
        const query = { isBlocked: false };

        // Search
        if (queryParams.search) {
            query.$or = [
                { productName: { $regex: queryParams.search, $options: 'i' } },
                { description: { $regex: queryParams.search, $options: 'i' } }
            ];
        }

        // Category
        if (queryParams.category) query.category = queryParams.category;

        // Price filter (variant prices)
        if (queryParams.price) {
            const [min, max] = queryParams.price.split('-').map(Number);
            query['variants.regularPrice'] = {};
            if (!isNaN(min)) query['variants.regularPrice'].$gte = min;
            if (!isNaN(max)) query['variants.regularPrice'].$lte = max;
        }

        // Sort by variant price or name
        const sortOptions = {
            'price_asc': { 'variants.0.regularPrice': 1 },
            'price_desc': { 'variants.0.regularPrice': -1 },
            'name_asc': { productName: 1 },
            'name_desc': { productName: -1 },
            '': { createdAt: -1 }
        };
        const sort = sortOptions[queryParams.sort] || sortOptions[''];

        const perPage = 12;
        const skip = (queryParams.page - 1) * perPage;

        // Get total products (filtered) and products for current page
        const [totalProducts, products, categories] = await Promise.all([
            Product.countDocuments(query),
            Product.find(query)
                .sort(sort)
                .skip(skip)
                .limit(perPage)
                .lean(),
            Category.aggregate([
                { $match: { isListed: true } },
                {
                    $lookup: {
                        from: 'products',
                        let: { categoryId: '$_id' },
                        pipeline: [
                            { 
                                $match: { 
                                    $expr: { $eq: ['$category', '$$categoryId'] },
                                    isBlocked: false
                                }
                            }
                        ],
                        as: 'categoryProducts'
                    }
                },
                { $project: { name: 1, productCount: { $size: '$categoryProducts' } } }
            ])
        ]);

        const generateShopUrl = (newParams) => {
            const params = { ...queryParams, ...newParams };
            if (newParams.search !== undefined || newParams.category !== undefined || 
                newParams.price !== undefined || newParams.sort !== undefined) {
                params.page = 1;
            }
            Object.keys(params).forEach(key => { if (!params[key]) delete params[key]; });
            return '/shop?' + new URLSearchParams(params).toString();
        };

        res.render('user/shop', {
            products,
            categories,
            currentPage: queryParams.page,
            totalPages: Math.ceil(totalProducts / perPage),
            searchQuery: queryParams.search,
            categoryFilter: queryParams.category,
            priceFilter: queryParams.price,
            sortOption: queryParams.sort,
            generateShopUrl,
            user: await User.findById(req.session.userId)
        });

    } catch (error) {
        console.error('Shop error:', error);
        res.status(500).send('Error loading shop: ' + error.message);
    }
};



const loadProductDetail = async (req, res) => {
  try {
    const productId = req.params.id;

    // Fetch main product
    const product = await Product.findById(productId).lean();
    if (!product) return res.status(404).send("Product not found");

    // Fetch related products (same category, excluding current product)
    let relatedProducts = [];
    if (product.category) {
      relatedProducts = await Product.find({
        category: product.category,
        _id: { $ne: product._id }
      })
        .limit(4)
        .lean();
    }

    // Render template with safe checks
    res.render("User/productDetails", {
      product,
      relatedProducts,
      message: req.query.message || null
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};










const Logout = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log("Logout error:", err);
            return res.status(500).send("Logout failed");
        }
        res.clearCookie('connect.sid'); // clear session cookie
        return res.redirect('/login'); // redirect and stop execution
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
 loadShopPage,
loadProductDetail,
  Logout,
};
