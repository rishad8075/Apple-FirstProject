const Wallet = require("../../model/wallet");
const Razorpay = require("razorpay");
const User = require("../../model/user");
const Orders = require('../../model/Orders');
const crypto  = require("crypto");
const  Address = require("../../model/address");
const Cart = require("../../model/Cart")
const Coupon = require("../../model/Coupon")
const { v4: uuidv4 } = require("uuid");// for unique id
const Product = require("../../model/Product")


//razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


// wallet page

exports.getWalletPage = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);

        let wallet = await Wallet.findOne({ userId: userId });
        if (!wallet) {
            wallet = new Wallet({ userId: userId, balance: 0, transactions: [] });
            await wallet.save();
        }

        // Pagination logic
        const page = parseInt(req.query.page) || 1; // current page
        const limit = 5;                            // transactions per page
        const skip = (page - 1) * limit;

        const totalTxns = wallet.transactions.length;
        const totalPages = Math.ceil(totalTxns / limit);

        // Sort transactions by latest first and slice for current page
        const walletHistory = wallet.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(skip, skip + limit);

        res.render("User/wallet", {
            walletBalance: wallet.balance,
            walletHistory,
            currentPage: page,
            totalPages,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            user,
            activeLink: "wallet"
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).render("page-500");
    }
};

// Create Razorpay Order for Wallet Top-up
exports.createOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.session.userId;

        if (!amount || amount < 1) {
            return res.json({ success: false, message: "Invalid amount" });
        }

        const options = {
            amount: amount * 100, // paise
            currency: "INR",
            receipt: "WL_" + userId.toString().slice(-6) + "_" + Date.now().toString().slice(-6)

        };

        const order = await razorpay.orders.create(options);

        return res.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency
            }
        });

    } catch (err) {
        console.error("Wallet createOrder error:", err);
        return res.json({ success: false, message: "Server error creating Razorpay order" });
    }
};

// 📌 2. Verify Razorpay Payment + Add Balance to Wallet
exports.verifyPayment = async (req, res) => {
    try {
        const { payment_id, order_id, signature, amount } = req.body;
        const userId = req.session.userId;

        const generated_signature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(order_id + "|" + payment_id)
            .digest("hex");

        if (generated_signature !== signature) {
            return res.json({ success: false, message: "Payment verification failed" });
        }

        let wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: 0,
                transactions: []
            });
        }

        wallet.balance += amount / 100;
        let cash = amount /100

        wallet.transactions.push({
            amount: amount / 100,
            type: "CREDIT",
            source: "TOPUP",
            description:`Added to wallet RS : ${cash}`,
            date: new Date()
        });

        await wallet.save();

        return res.json({ success: true });

    } catch (err) {
        console.error("Wallet verifyPayment error:", err);
        return res.json({ success: false, message: "Server error verifying payment" });
    }
};

exports.useWalletForOrder =async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, message: "User not logged in" });

    const { shippingAddress } = req.body;
    if (!shippingAddress || !shippingAddress._id) {
      return res.status(400).json({ success: false, message: "Address not provided" });
    }

    const addressDoc = await Address.findById(shippingAddress._id);
    if (!addressDoc) return res.json({ success: false, message: "Address not found" });

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) return res.json({ success: false, message: "Cart empty" });

    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.balance <= 0) return res.json({ success: false, message: "Wallet is empty" });

    // Calculate order totals
    const orderItems = cart.items.map(item => {
      const product = item.productId;
      const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
      const price = item.price;
      const subtotal = price * item.quantity;
      const tax = (subtotal * 18) / 100;
      const discount= (item.OriginalPrice-item.price)*item.quantity
      return { productId: product._id, name: product.productName, quantity: item.quantity,discount:discount, price, subtotal, tax, image: variant.images[0] || "/images/no-image.png" };
    });

    const subtotal = orderItems.reduce((acc, i) => acc + i.subtotal, 0);
    const tax = orderItems.reduce((acc, i) => acc + i.tax, 0);
    const shippingCharge = 70;
    let couponDiscount = 0;

    // ✅ Coupon handling (optional)
    if (req.session.appliedCoupon) {
      const coupon = await Coupon.findOne({ code: req.session.appliedCoupon });
      if (coupon && coupon.isActive) {
        if (coupon.discountType === "percentage") {
          couponDiscount = Math.min((subtotal * coupon.discountValue) / 100, coupon.maxDiscountAmount || Infinity);
        } else {
          couponDiscount = coupon.discountValue;
        }
        coupon.usedCount += 1;
        coupon.appliedUsers.push({ userId, usedAt: new Date() });
        await coupon.save();
      }
    }

    const grandTotal = subtotal + tax + shippingCharge - couponDiscount;

    if (wallet.balance < grandTotal) {
      return res.json({ success: false, message: "Insufficient wallet balance" });
    }

    // Deduct wallet balance & add transaction
    wallet.balance -= grandTotal;
    wallet.transactions.push({
      amount: grandTotal,
      type: "DEBIT",
      source: "ORDER_PAYMENT",
      description: "Wallet purchase ",
      date: new Date()
    });
    await wallet.save();

    // Create order
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
      paymentMethod: "Wallet",
      paymentStatus: "Paid",
      shippingCharge,
      coupon: couponDiscount,
      totalPrice: grandTotal
    });

    await order.save();

    // Update stock
    for (const item of orderItems) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { "variants.0.stock": -item.quantity } }
      );
    }

    // Clear cart
    await Cart.deleteMany({ userId });

    req.session.appliedCoupon = null;

    res.json({ success: true, redirectUrl: `/order-success/${order._id}` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};