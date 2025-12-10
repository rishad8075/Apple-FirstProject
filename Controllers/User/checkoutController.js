
const Address = require("../../model/address");
const Cart = require("../../model/Cart");
const Product = require("../../model/Product");
const User = require("../../model/user");
const Orders = require("../../model/Orders");
const { v4: uuidv4 } = require("uuid");// for unique id
const Payment = require("../../model/payment")
const Razorpay = require("razorpay");

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.userId;

    const user = await User.findById(userId);

    
    const addresses = await Address.find({ user: userId }).lean();

    
     const cart = await Cart.findOne({ userId })
      .populate("items.productId"); 

    if (!cart) return res.redirect("/cart");

    const items = cart.items.map(item => {

     
      const product = item.productId;
      const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());

      return {
        name: product.productName,
        image: variant?.images?.[0] || "/images/no-image.png",
        qty: item.quantity,
        price: variant.salePrice || variant.regularPrice,
        total: (variant.salePrice || variant.regularPrice) * item.quantity
      };
    });

      const subtotal = items.reduce((acc, item) => acc + item.total, 0);

    
    const tax = (subtotal*18)/100
    const shipping = 70;
   

    const couponDiscount = 0;

    const grandTotal = subtotal + tax + shipping - couponDiscount;

    res.render("User/checkout", {
        user,
        addresses,
      items,
      subtotal,
      tax,
      shipping,
    
      couponDiscount,
      total: grandTotal
    });

  } catch (err) {
    console.log("Checkout Error:", err);
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
            // If user checked "set as default", unset previous default
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

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) return res.redirect("/cart");

    const items = cart.items.map(item => {
      const product = item.productId;
      const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
      const price = variant.salePrice || variant.regularPrice;
      return {
        productId: product._id,
        variantId: variant._id,
        name: product.productName,
        qty: item.quantity,
        price,
        total: price * item.quantity,
        image: variant.images[0] || "/images/no-image.png"
      };
    });

    const subtotal = items.reduce((acc, i) => acc + i.total, 0);
    const tax = (subtotal * 18) / 100;
    const shipping = 70;
    const total = subtotal + tax + shipping;

    const selectedAddress = await Address.findById(addressId).lean();
    if (!selectedAddress) return res.redirect("/checkout");

    res.render("User/payment", {
      userId,
      items,
      selectedAddress,
      subtotal,
      tax,
      shipping,
      total,
      walletBalance: 0 // optional
    });

  } catch (err) {
    console.error(err);
    res.redirect("/checkout");
  }
};



// PLACE ORDER (COD or Wallet)
const placeOrder = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) return res.status(401).json({ success: false, message: "User not logged in" });

        const { paymentMethod, shippingAddress } = req.body;

        if (!shippingAddress || !shippingAddress._id) {
            return res.status(400).json({ success: false, message: "Address not provided" });
        }

        const addressDoc = await Address.findById(shippingAddress._id);
        if (!addressDoc) return res.json({ success: false, message: "Address not found" });

        const cart = await Cart.findOne({ userId }).populate("items.productId");
        if (!cart || cart.items.length === 0) return res.json({ success: false, message: "Cart empty" });

        const orderItems = cart.items.map(item => {
            const product = item.productId;
            const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
            const price = variant.salePrice || variant.regularPrice;
            const subtotal = price * item.quantity;
            const tax = (subtotal * 18) / 100;
            return {
                productId: product._id,
                name: product.productName,
                image: variant.images[0] || "/images/no-image.png",
                quantity: item.quantity,
                price,
                subtotal,
                tax
            };
        });

        const subtotal = orderItems.reduce((acc, i) => acc + i.subtotal, 0);
        const tax = orderItems.reduce((acc, i) => acc + i.tax, 0);
        const shippingCharge = 70;
        const totalPrice = subtotal + tax + shippingCharge;

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
            paymentStatus: paymentMethod === "COD" || paymentMethod === "WALLET" ? "Pending" : "Paid",
            shippingCharge,
            totalPrice
        });

        await order.save();

        // Update stock
        for (const item of orderItems) {
            await Product.updateOne(
                { _id: item.productId },
                { $inc: { "variants.0.stock": -item.quantity } }
            );
        }

        await Cart.deleteMany({ userId });

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

        // 1️⃣ Fetch full address
        const addressDoc = await Address.findById(addressId).lean();
        if (!addressDoc) {
            return res.status(400).json({ success: false, message: "Address not found" });
        }

        const fullAddress = {
            fullName: addressDoc.fullname,
            phone: addressDoc.mobile,
            street: `${addressDoc.houseName}, ${addressDoc.locality}`,
            city: addressDoc.district,
            state: addressDoc.state,
            postalCode: addressDoc.pincode,
            country: "India",
            isDefault: addressDoc.isDefault
        };

        // 2️⃣ Create order
        const order = new Orders({
            orderId: uuidv4(),
            userId,
            orderItems: orderDetails.orderItems,
            address: fullAddress,
            paymentMethod: "Razorpay", 
            status: "Pending",
            shippingCharge: 70,
            totalPrice: orderDetails.grandTotal
        });

        await order.save();

        // 3️⃣ Update stock
        for (const item of order.orderItems) {
             await Product.updateOne(
                { _id: item.productId },
                { $inc: { "variants.0.stock": -item.quantity } }
            );
        }

        // 4️⃣ Clear user cart
        await Cart.deleteMany({ userId });

        // 5️⃣ Respond with success
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
        const user = await User.findById(order.userId);
        if (!order) return res.redirect("/");
        res.render("User/order-success", { order, user });
    } catch (err) {
        console.error(err);
        res.redirect("/");
    }
};

const orderFailurePage = async (req, res) => {
    try {
        // Grab reason from query params
        const reason = req.query.reason || "Transaction failed";

        
        res.render("User/order-failure", { reason });
    } catch (err) {
        console.error(err);
        res.redirect("/checkout");
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
    orderFailurePage
};