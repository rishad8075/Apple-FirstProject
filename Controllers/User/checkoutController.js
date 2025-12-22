
const Address = require("../../model/address");
const Cart = require("../../model/Cart");
const Product = require("../../model/Product");
const User = require("../../model/user");
const Orders = require("../../model/Orders");
const { v4: uuidv4 } = require("uuid");// for unique id
const Payment = require("../../model/payment");
const Razorpay = require("razorpay");
const Coupon = require("../../model/Coupon");
const Wallet = require("../../model/wallet");
const { calculateFinalPrice } = require('../../utils/priceHelper');



const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const user = await User.findById(userId).lean();
    const addresses = await Address.find({ user: userId }).lean();

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) return res.redirect("/cart");

    
    const items = cart.items.map(item => {
      const product = item.productId;
      const variant = product.variants.find( 
        v => v._id.toString() === item.variantId.toString()
      );

      const price = item.price; 

      return {
        name: product.productName,
        image: variant?.images?.[0] || "/images/no-image.png",
        qty: item.quantity,
        price,
        total: price * item.quantity
      };
    });

    // Totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = (subtotal * 18) / 100;
    const shipping = 70;
    const deliveryCharge = 40
    

   
    let discountAmount = 0;
    let appliedCoupon = req.session.appliedCoupon || null;

    if (appliedCoupon) {
      const coupon = await Coupon.findOne({ code: appliedCoupon, isActive: true });
      const now = new Date();

      if (
        coupon &&
        coupon.startDate <= now &&
        coupon.expiryDate >= now &&
        coupon.usedCount < coupon.maxUses &&
        subtotal >= coupon.minOrderAmount
      ) {
        if (coupon.discountType === "percentage") {
          discountAmount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
          }
        } else {
          discountAmount = coupon.discountValue;
        }
      } else {
        req.session.appliedCoupon = null;
        appliedCoupon = null;
      }
    }

    const grandTotal = subtotal + tax + shipping + deliveryCharge - discountAmount;

    res.render("User/checkout", {
      user,
      addresses,
      items,
      subtotal,
      tax,
      shipping,
      couponDiscount: discountAmount,
      discountAmount,
      deliveryCharge,
      total: grandTotal,
      appliedCoupon
    });

  } catch (err) {
    console.error("Checkout Error:", err);
    res.status(500).render("page-404");
  }
};






const checkoutAdd_Address = async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) return res.redirect('/login');

        const userAddresses = await Address.find({ user: userId });

        res.render("User/addAddress", {
            user: userId,
            addresses: userAddresses,
            activeLink: 'profile'
        });

    } catch (error) {
        console.error(error);
        res.render("page-404");
    }
};

//   Add Address
const checkoutAddAddress = async (req, res) => { 
    try {
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not logged in" });
        }

        const { fullname, email, mobile, houseName, locality, pincode, district, state, isDefault } = req.body;

        
        if (!fullname || !email || !mobile || !houseName || !locality || !pincode || !district || !state) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        
        const existingAddresses = await Address.find({ user: userId });

        
        let defaultFlag = false;
        if (existingAddresses.length === 0) {
            defaultFlag = true; 
        } else if (isDefault) {
           
            await Address.updateMany({ user: userId, isDefault: true }, { $set: { isDefault: false } });
            defaultFlag = true;
        }

        const newAddress = new Address({
            user: userId,
            fullname,
            email,
            mobile,
            houseName,
            locality,
            pincode,
            district,
            state,
            isDefault: defaultFlag
        });

        await newAddress.save();

        res.json({ success: true, message: "New address added successfully", address: newAddress });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


const paymentPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addressId = req.query.addressId;

    if (!userId) return res.redirect("/login");
    if (!addressId) return res.redirect("/checkout");

    const wallet = await Wallet.findOne({ userId }).lean();
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) return res.redirect("/cart");

    const user = await User.findById(userId).lean();

    
    const items = cart.items.map(item => {
      const product = item.productId;
      const variant = product.variants.find(
        v => v._id.toString() === item.variantId.toString()
      );

      const price = item.price; 
    const offerDiscount = (item.OriginalPrice -price)*item.quantity
      return {
        productId: product._id,
        variantId: variant._id,
        name: product.productName,
        discount:offerDiscount,
        qty: item.quantity,
        price,
        total: price * item.quantity,
        image: variant?.images?.[0] || "/images/no-image.png"
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const tax = (subtotal * 18) / 100;
    const shipping = 70;

    
    let couponDiscount = 0;
    let appliedCoupon = null;

    if (req.session.appliedCoupon) {
      const coupon = await Coupon.findOne({
        code: req.session.appliedCoupon,
        isActive: true
      });

      if (coupon) {
        appliedCoupon = coupon.code;

        if (coupon.discountType === "percentage") {
          couponDiscount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount) {
            couponDiscount = Math.min(couponDiscount, coupon.maxDiscountAmount);
          }
        } else {
          couponDiscount = coupon.discountValue;
        }
      }
    }
    const deliveryCharge = 40


    const grandTotal = subtotal + tax + shipping + deliveryCharge - couponDiscount;
    const selectedAddress = await Address.findById(addressId).lean();

    res.render("User/payment", {
      user,
      userId,
      walletBalance: wallet ? wallet.balance : 0,
      items,
      selectedAddress,
      subtotal,
      tax,
      shipping,
      couponDiscount,
      appliedCoupon,
      deliveryCharge,
      total: grandTotal
    });

  } catch (err) {
    console.error(err);
    res.redirect("/checkout");
  }
};



// PLACE ORDER (COD or Wallet) with coupon
const placeOrder = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const { paymentMethod, shippingAddress } = req.body;
    if (!shippingAddress || !shippingAddress._id) {
      return res.status(400).json({ success: false, message: "Address not provided" });
    }

    const addressDoc = await Address.findById(shippingAddress._id);
    if (!addressDoc) {
      return res.json({ success: false, message: "Address not found" });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart empty" });
    }

 
    const orderItems = cart.items.map(item => {
      const product = item.productId;
      const variant = product.variants.find(
        v => v._id.toString() === item.variantId.toString()
      );

      const price = item.price; 
      const subtotal = price * item.quantity;
      const tax = (subtotal * 18) / 100;
      const offerDiscount = (item.OriginalPrice -price)*item.quantity

      return {
        productId: product._id,
        variantId: variant._id,
        name: product.productName,
        discount:offerDiscount,
        image: variant?.images?.[0] || "/images/no-image.png",
        quantity: item.quantity,
        price,
        subtotal,
        tax,
        
      };
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
    const tax = orderItems.reduce((sum, i) => sum + i.tax, 0);
    const shippingCharge = 70;

   
    let couponDiscount = 0;
    let appliedCouponCode = null;

    if (req.session.appliedCoupon) {
      const coupon = await Coupon.findOne({ code: req.session.appliedCoupon, isActive: true });

      if (coupon) {
        appliedCouponCode = coupon.code;

        if (coupon.discountType === "percentage") {
          couponDiscount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount) {
            couponDiscount = Math.min(couponDiscount, coupon.maxDiscountAmount);
          }
        } else {
          couponDiscount = coupon.discountValue;
        }

        coupon.usedCount += 1;
        coupon.appliedUsers.push({ userId, usedAt: new Date() });
        await coupon.save();
      }
    }
    const deliveryCharge = 40
  
    const totalPrice = subtotal + tax + shippingCharge + deliveryCharge - couponDiscount;

    const order = new Orders({
      orderId: uuidv4(),
      userId,
      orderItems,
      address: {
        fullName: addressDoc.fullname,
        phone: addressDoc.mobile,
        street: `${addressDoc.houseName}, ${addressDoc.locality}`,
        city: addressDoc.district,
        state: addressDoc.state,
        postalCode: addressDoc.pincode,
        country: "India",
        isDefault: addressDoc.isDefault
      },
      paymentMethod,
      paymentStatus:
        paymentMethod === "COD" || paymentMethod === "WALLET" ? "Pending" : "Paid",
      shippingCharge,
      coupon: couponDiscount, 
      
      totalPrice
    });

    await order.save();

    for (const item of cart.items) {
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": -item.quantity } }
      );
    }

    await Cart.deleteOne({ userId });
    req.session.appliedCoupon = null;

    res.json({ success: true, redirectUrl: `/order-success/${order._id}` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// RAZORPAY: Create Order
const createRazorpayOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        const options = {
            amount: Math.round(amount * 100), // in paise
            currency: "INR",
            receipt: uuidv4()
        };

        const order = await razorpayInstance.orders.create(options);
        res.json({ success: true, order });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Razorpay order creation failed" });
    }
};

// RAZORPAY: Verify Payment
const verifyRazorpayPayment = async (req, res) => {
    try {
        const { orderDetails } = req.body;
        const userId = orderDetails.userId;
        const addressId = orderDetails.addressId;

        
        const addressDoc = await Address.findById(addressId).lean();
        if (!addressDoc) return res.status(400).json({ success: false, message: "Address not found" });

         const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart empty" });
    }

      
          const orderItems = cart.items.map(item => {
      const product = item.productId;
      const variant = product.variants.find(
        v => v._id.toString() === item.variantId.toString()
      );

      const price = item.price;
      const subtotal = price * item.quantity;
      const tax = (subtotal * 18) / 100;
      const offerDiscount = (item.OriginalPrice -price)*item.quantity

      return {
        productId: product._id,
        variantId: variant._id,
        name: product.productName,
        discount:offerDiscount,
        image: variant?.images?.[0] || "/images/no-image.png",
        quantity: item.quantity,
        price,
        subtotal,
        tax,
        
      };
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
    const tax = orderItems.reduce((sum, i) => sum + i.tax, 0);
    const shippingCharge = 70;

        // 3️⃣ Coupon discount
        let couponDiscount = 0;
        if (req.session.appliedCoupon) {
            const coupon = await Coupon.findOne({ code: req.session.appliedCoupon });
            if (coupon) {
                if (coupon.discountType === "percentage") {
                    couponDiscount = (subtotal * coupon.discountValue) / 100;
                    if (coupon.maxDiscountAmount) couponDiscount = Math.min(couponDiscount, coupon.maxDiscountAmount);
                } else {
                    couponDiscount = coupon.discountValue;
                }

               
                coupon.usedCount += 1;
                coupon.appliedUsers.push({ userId, usedAt: new Date() });
                await coupon.save();
            }
        }
    const deliveryCharge = 40
       
        const totalPrice = subtotal + tax + shippingCharge +deliveryCharge - couponDiscount;
        

        
        const order = new Orders({
            orderId: uuidv4(),
            userId,
            orderItems,
            address: {
                fullName: addressDoc.fullname,
                phone: addressDoc.mobile,
                street: `${addressDoc.houseName}, ${addressDoc.locality}`,
                city: addressDoc.district,
                state: addressDoc.state,
                postalCode: addressDoc.pincode,
                country: "India",
                isDefault: addressDoc.isDefault
            },
            paymentMethod: "Razorpay",
            status: "Pending",
            shippingCharge,
            coupon: couponDiscount,
            totalPrice
        });

        await order.save();

       
        for (const item of order.orderItems) {
            await Product.updateOne(
                { _id: item.productId },
                { $inc: { "variants.0.stock": -item.quantity } }
            );
        }
        await Cart.deleteMany({ userId });
        req.session.appliedCoupon = null;

        res.json({ success: true, redirectUrl: `/order-success/${order._id}` });

    } catch (err) {
        console.error("Razorpay Payment Error:", err);
        res.redirect(`/order-failure?reason=Payment verification failed`);
    }
};

// Order Success Page
const orderSuccessPage = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Orders.findById(orderId);
        const user = await User.findById(req.session.userId);
        if (!order) return res.redirect("/");
        res.render("User/order-success", { order, user });
    } catch (err) {
        console.error(err);
        res.redirect("/");
    }
};

const orderFailurePage = async (req, res) => {
    try {
       
        const reason = req.query.reason || "Transaction failed";

        
        res.render("User/order-failure", { reason });
    } catch (err) {
        console.error(err);
        res.redirect("/checkout");
    }
};



// APPLY COUPON
const applyCoupon = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { couponCode } = req.body;

        if (!userId) return res.status(401).json({ success: false, message: "User not logged in" });

        const cart = await Cart.findOne({ userId }).populate("items.productId");
        if (!cart || cart.items.length === 0) return res.json({ success: false, message: "Cart is empty" });
        
        const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase(), isActive: true });
        if (!coupon) return res.json({ success: false, message: "Invalid coupon code" });

        const now = new Date();
        if (coupon.startDate > now || coupon.expiryDate <= now) {
            return res.json({ success: false, message: "Coupon expired or not started yet" });
        }

        if (coupon.usedCount >= coupon.maxUses) {
            return res.json({ success: false, message: "Coupon usage limit reached" });
        }

        if (coupon.appliedUsers.some(u => u.userId.toString() === userId.toString())) {
            return res.json({ success: false, message: "You have already used this coupon" });
        }

        const subtotal = cart.items.reduce((acc, item) => {
            const price = item.productId.variants.find(v => v._id.toString() === item.variantId.toString()).salePrice ||
                item.productId.variants.find(v => v._id.toString() === item.variantId.toString()).regularPrice;
            return acc + price * item.quantity;
        }, 0);

        if (subtotal < coupon.minOrderAmount) {
            return res.json({ success: false, message: `Minimum order ₹${coupon.minOrderAmount} required` });
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === "percentage") {
            discountAmount = (subtotal * coupon.discountValue) / 100;
            if (coupon.maxDiscountAmount) discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
        } else {
            discountAmount = coupon.discountValue;
        }

      
        req.session.appliedCoupon = coupon.code;

        res.json({
            success: true,
            message: "Coupon applied",
            discountAmount,
            code: coupon.code
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// REMOVE COUPON
const removeCoupon = async (req, res) => {
    try {
        req.session.appliedCoupon = null;
        res.json({ success: true, message: "Coupon removed" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = {
    getCheckoutPage,
    checkoutAdd_Address,
    checkoutAddAddress,
    placeOrder,
    createRazorpayOrder,
    verifyRazorpayPayment,
    orderSuccessPage,
    paymentPage,
    orderFailurePage,
    applyCoupon,
    removeCoupon
};