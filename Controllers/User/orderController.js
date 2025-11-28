const Orders = require("../../model/Orders");
const Products = require("../../model/Product");
const User = require("../../model/user");
const PDFDocument = require("pdfkit");

//  LIST ORDERS 
const listOrders = async (req, res) => {
    try {
        const userId = req.user._id;

        const search = req.query.search || "";  
        const user = await User.findById(userId)

        const orders = await Orders.find({
            userId,
            orderId: { $regex: search, $options: "i" }
        }).sort({ createdAt: -1 });

        res.render("User/orders-list", {
            user,
            orders,
            search,            
            activeLink: "orders"
        });

    } catch (error) {
        console.log(error);
        res.render("page-404");   // If you don't have this page, create it or redirect.
    }
};


// ORDER DETAIL 
const orderDetail = async (req, res) => {
    try {
        const orderId = req.params.orderId; // make sure this matches :id
        const order = await Orders.findById(orderId);
        if (!order) return res.status(404).send("Order not found");

        res.render("User/order-detail", { order, activeLink: 'orders' });
    } catch (error) {
        console.error(error);
        res.status(500).render("page-404"); // or your error page
    }
};

//  CANCEL ORDER OR ITEM
const cancelEntireOrder = async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        const order = await Orders.findById(orderId);
        if(!order) return res.json({ success: false, message: 'Order not found' });

        // Update stock for all products
        for(const item of order.orderItems){
            await Products.updateOne(
                { _id: item.productId },
                { $inc: { 'variants.0.stock': item.quantity } } 
            );
        }

        // Mark order and all items as cancelled
        for(let item of order.orderItems){
            item.status = "Cancelled"
            item.cancellationReason=reason
        }
        await order.save();

        res.json({ success: true });
    } catch(err){
        res.json({ success: false, message: err.message });
    }
};
const cancelProduct = async (req, res) => {
    try {
        const { orderId, productId, reason } = req.body;
        const order = await Orders.findById(orderId);
        if(!order) return res.json({ success: false, message: 'Order not found' });

        const item = order.orderItems.find(i => i.productId.toString() === productId);
        if(!item) return res.json({ success: false, message: 'Product not found in order' });

      
        await Products.updateOne(
            { _id: item.productId },
            { $inc: { 'variants.0.stock': item.quantity } } 
        );

        item.status = 'Cancelled';
        item.cancellationReason = reason || 'No reason';
        await order.save();

        res.json({ success: true });
    } catch(err){
        res.json({ success: false, message: err.message });
    }
};


const returnOrder = async (req, res) => {
    try {
        const { orderId, productId, reason } = req.body;

        if (!reason || reason.trim() === "") {
            return res.status(400).json({ success: false, message: "Return reason is required." });
        }

        const order = await Orders.findOne({ orderId });
        if (!order) return res.status(404).json({ success: false, message: "Order not found." });

        // Single Product Return
        if (productId) {
            const item = order.orderItems.find(item => item.productId.toString() === productId);
            if (!item) return res.status(404).json({ success: false, message: "Product not found in this order." });
            if (item.status !== "Delivered") 
                return res.status(400).json({ success: false, message: "Product cannot be returned before delivery." });

            item.status = "Returned";
            item.returnReason = reason;

            // Check if all items returned → update order status
            if (order.orderItems.every(i => i.status === "Returned")) order.status = "Returned";

        } else {
            // Full Order Return
            let returnedCount = 0;
            order.orderItems.forEach(item => {
                if (item.status === "Delivered") {
                    item.status = "Returned";
                    item.returnReason = reason;
                    returnedCount++;
                }
            });

            if (returnedCount === 0) 
                return res.status(400).json({ success: false, message: "No delivered items available for return." });

            order.status = "Returned";
        }

        await order.save();

        return res.status(200).json({ success: true, message: "Return request submitted successfully." });

    } catch (error) {
        console.error("Return Error:", error);
        return res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
};

// DOWNLOAD INVOICE 
const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Orders.findOne({ orderId }).populate("orderItems.productId").lean();

        if (!order) return res.redirect("/orders");

        const doc = new PDFDocument();

        // Pipe the PDF output FIRST
        res.setHeader("Content-Disposition", `attachment; filename=Invoice-${orderId}.pdf`);
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);

        // Title
        doc.fontSize(22).text("INVOICE", { align: "center" }).moveDown(1.5);

        // Order Info
        doc.fontSize(12);
        doc.text(`Order ID: ${order.orderId}`);
        doc.text(`Order Date: ${new Date(order.createdAt).toLocaleString()}`);
        doc.text(`Order Status: ${order.status}`);
        doc.text(`Payment Method: ${order.paymentMethod}`);
        doc.moveDown();

        // Customer Address
        const a = order.address;
        doc.fontSize(14).text("Billing Address:", { underline: true }).moveDown(0.3);
        doc.fontSize(12);
        doc.text(`${a.fullName}`);
        doc.text(`${a.street}`);
        doc.text(`${a.city}, ${a.state}, ${a.postalCode}`);
        doc.text(`${a.country}`);
        doc.moveDown();

        // Items Section
        doc.fontSize(14).text("Items:", { underline: true }).moveDown(0.5);
        doc.fontSize(12);

        order.orderItems.forEach((item, idx) => {
            doc.text(`${idx + 1}. ${item.name}`);
            doc.text(`Price: ₹${item.price} x ${item.quantity} = ₹${item.subtotal}`);
            doc.moveDown(0.4);
        });

        doc.moveDown();

        // Price Summary
        const subtotal = order.orderItems.reduce((sum, i) => sum + i.subtotal, 0);
        const tax = order.orderItems.reduce((sum, i) => sum + i.tax, 0);

        doc.fontSize(14).text("Price Summary:", { underline: true }).moveDown(0.5);
        doc.fontSize(12);
        doc.text(`Subtotal: ₹${subtotal}`);
        doc.text(`Tax: ₹${tax}`);
        doc.text(`Shipping Charge: ₹${order.shippingCharge}`);
        doc.text(`------------------------------------------`);
        doc.text(`Grand Total: ₹${order.totalPrice}`, { bold: true });

        // End document AFTER writing everything
        doc.end();
    } catch (err) {
        console.error(err);
        res.redirect("/orders");
    }
};


module.exports = {
    listOrders,
    orderDetail,
    cancelEntireOrder,
    cancelProduct,
    returnOrder,
    downloadInvoice
};
