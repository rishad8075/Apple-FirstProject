const razorpay = require('../../config/razorpay'); // your Razorpay instance
const Orders = require('../../model/Orderss');
const Product = require('../../model/Product');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// --------------- Create Razorpay Order -----------------
exports.createRazorpayOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        const options = {
            amount: Math.round(amount * 100), // paise
            currency: "INR",
            receipt: `rcpt_${uuidv4()}`,
        };

        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Failed to create Razorpay order." });
    }
};

// --------------- Verify Razorpay Payment -----------------
exports.verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderDetails } = req.body;

        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generated_signature === razorpay_signature) {
            // Save order in DB
            const orderId = uuidv4();
            const order = new Orders({
                orderId,
                userId: orderDetails.userId,
                orderItems: orderDetails.orderItems,
                address: orderDetails.shippingAddress,
                paymentMethod: 'Online',
                paymentId: razorpay_payment_id,
                totalPrice: orderDetails.grandTotal,
            });

            await order.save();

            // Update stock
            for (const item of order.orderItems) {
                await Product.updateOne(
                    { _id: item.productId },
                    { $inc: { 'variants.0.stock': -item.quantity } }
                );
            }

            // Clear user's cart
            // await Cart.deleteMany({ userId: orderDetails.userId });

            return res.json({ success: true, redirectUrl: `/order-success/${order._id}` });
        } else {
            return res.json({ success: false, redirectUrl: '/order-failure' });
        }
    } catch (err) {
        console.error(err);
        res.json({ success: false, redirectUrl: '/order-failure' });
    }
};
