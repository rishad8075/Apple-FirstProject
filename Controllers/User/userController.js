const User = require("../../model/user");
const session = require("express-session");
const Category = require('../../model/category');
const Product = require("../../model/Product");
const nodemailer =require("nodemailer");
const { render } = require("ejs");
const Wallet = require("../../model/wallet")
const { calculateFinalPrice } = require('../../utils/priceHelper');




const generateReferralCode = (name) => {
  return (
    name.substring(0, 4).toUpperCase() +
    Math.floor(1000 + Math.random() * 9000)
  );
};


const loadHome = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect("/login");
        }

        // Fetch user
        const userData = await User.findById(req.session.userId).lean();

        // Fetch available, unblocked products sorted by newest
       const products = await Product.aggregate([
            {
                $match: { isBlocked: false }
            },
            {
                $lookup: {
                    from: 'categories', // Make sure your collection name is correct
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            {
                $unwind: '$categoryInfo'
            },
            {
                $match: { 'categoryInfo.isListed': true } // Only products from listed categories
            }
        ]);
       

        // Map products to include first variant info and precompute display price
        const displayProducts = products.map(product => {
            const firstVariant = product.variants[0] || {};
            const price = firstVariant.salePrice && firstVariant.salePrice < firstVariant.regularPrice
                ? firstVariant.salePrice
                : firstVariant.regularPrice || 0;

                  const priceData = calculateFinalPrice({
        salePrice: firstVariant.salePrice,
        productOffer: firstVariant.productOffer || 0,
        categoryOffer: product.categoryInfo.categoryOffer || 0
      });

            return {
                ...product,
                image: firstVariant.images || [],
                displayPrice: price,
                regularPrice: firstVariant.regularPrice || 0,
                finalPrice:priceData.finalPrice,
                applyOffer:priceData.appliedOffer,
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
    const { name, email, password, phoneNumber, confirmPassword, referralCode } = req.body;
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
        req.session.userData = { email, password, phoneNumber, name,referralCode };
        
        res.render('User/verifyOtp');
    } catch (err) {
        console.error("Error during signup:", err);
        res.status(500).render('error', {
            message: 'Error  Please try again.'+err
        });
    }
}


const verifyOtp = async (req, res) => {
  const { otp } = req.body;

  try {
    if (req.session.userId) return res.redirect("/");

    if (otp == req.session.userOtp) {
      const userData = req.session.userData;

      // Generate unique referral code for new user
      const newReferralCode = generateReferralCode(userData.name);

      const newUser = new User({
        name: userData.name,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        password: userData.password,
        referralCode: newReferralCode,
        referredBy: userData.referralCode || null
      });

      await newUser.save();

      // Handle referral reward
      if (userData.referralCode) {
        const referrer = await User.findOne({ referralCode: userData.referralCode });
        if (referrer) {
          // Find wallet document
          let wallet = await Wallet.findOne({ userId: referrer._id });

          if (!wallet) {
            wallet = new Wallet({
              userId: referrer._id,
              balance: 0,
              transactions: []
            });
          }

          // Credit reward
          const rewardAmount = 100;
          wallet.balance += rewardAmount;
          wallet.transactions.push({
            amount: rewardAmount,
            type: "CREDIT",
            source: "REFERRAL",
            description: `Referral reward from ${newUser.name}`,
            date: new Date()
          });

          await wallet.save();
        }
      }

      req.session.userId = newUser._id;

      res.json({ success: true, redirectUrl: "/login" });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP. Please try again" });
    }
  } catch (error) {
    console.error("Error verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};


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

        // --- Get query params ---
        const queryParams = {
            search: req.query.search || '',
            category: req.query.category || '',
            price: req.query.price || '',
            sort: req.query.sort || '',
            page: Math.max(1, parseInt(req.query.page) || 1)
        };

        // --- Get all listed categories first ---
        const listedCategories = await Category.find({ isListed: true }).select('_id').lean();
        const listedCategoryIds = listedCategories.map(c => c._id);

        // --- Base product query ---
        const query = {
            isBlocked: false,
            category: { $in: listedCategoryIds } // Only products in listed categories
        };

        // --- Search filter ---
        if (queryParams.search) {
            query.$or = [
                { productName: { $regex: queryParams.search, $options: 'i' } },
                { description: { $regex: queryParams.search, $options: 'i' } }
            ];
        }

        // --- Category filter ---
        if (queryParams.category) {
            const selectedCategory = listedCategoryIds.find(
                id => id.toString() === queryParams.category
            );
            if (selectedCategory) {
                query.category = selectedCategory;
            }
        }

        // --- Price filter ---
        if (queryParams.price) {
            const [min, max] = queryParams.price.split('-').map(Number);
            query['variants.regularPrice'] = {};
            if (!isNaN(min)) query['variants.regularPrice'].$gte = min;
            if (!isNaN(max)) query['variants.regularPrice'].$lte = max;
        }

        // --- Sort options ---
        const sortOptions = {
            'price_asc': { 'variants.0.regularPrice': 1 },
            'price_desc': { 'variants.0.regularPrice': -1 },
            'name_asc': { productName: 1 },
            'name_desc': { productName: -1 },
            '': { createdAt: -1 }
        };
        const sort = sortOptions[queryParams.sort] || sortOptions[''];

        const perPage = 5;
        const skip = (queryParams.page - 1) * perPage;

        // --- Fetch products, categories, total count in parallel ---
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
                            { $match: { $expr: { $eq: ['$category', '$$categoryId'] }, isBlocked: false } }
                        ],
                        as: 'categoryProducts'
                    }
                },
                { $project: { name: 1, productCount: { $size: '$categoryProducts' } } }
            ])
        ]);

        // --- Generate URL helper for pagination, sort, filters ---
        const generateShopUrl = (newParams = {}) => {
            const params = { ...queryParams, ...newParams };

            // Reset page to 1 if filters/sort/search change
            if ('search' in newParams || 'category' in newParams || 'price' in newParams || 'sort' in newParams) {
                if (!('page' in newParams)) params.page = 1;
            }

            // Remove undefined/null
            Object.keys(params).forEach(key => {
                if (params[key] === undefined || params[key] === null) delete params[key];
            });

            return '/shop?' + new URLSearchParams(params).toString();
        };

        // --- Render shop page ---
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

    // Fetch main product with category populated
    const product = await Product.findById(productId).populate("category").lean();
    if (!product) return res.status(404).send("Product not found");

    // Fetch related products (same category, excluding current product)
    let relatedProducts = [];
    if (product.category) {
      relatedProducts = await Product.find({
        category: product.category._id,
        _id: { $ne: product._id }
      })
      .populate("category")
      .limit(4)
      .lean();
    }
            const priceData = calculateFinalPrice({
        salePrice: product.variants[0].salePrice,
        productOffer: product.variants[0].productOffer || 0,
        categoryOffer: product.categoryOffer || 0
      });

    // Render template
    const user = await User.findById(req.session.userId).lean();
    res.render("User/productDetails", {
        priceData,
      user,
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
        res.clearCookie('connect.sid'); 
        return res.redirect('/login'); 
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
