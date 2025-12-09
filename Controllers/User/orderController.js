const Orders = require("../../model/Orders");
const Products = require("../../model/Product");
const User = require("../../model/user");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");


//  LIST ORDERS 
const listOrders = async (req, res) => {
    try {
        const userId = req.session.userId;

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
        order.status="Cancelled"
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
        const { orderId, productId, reason , quantity} = req.body;

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

    item.status = "Return Requested";
    item.returnReason = reason;

    // Update order status if any item has Return Requested
    if (order.orderItems.some(i => i.status === "Return Requested")) {
        order.status = "Return Requested";
    }
} else {
    // Full Order Return
    let returnedCount = 0;
    order.orderItems.forEach(item => {
        if (item.status === "Delivered") {
            item.status = "Return Requested";
            item.returnReason = reason;
            returnedCount++;
        }
    });

    if (returnedCount === 0) 
        return res.status(400).json({ success: false, message: "No delivered items available for return." });

    // Update order status if any item has Return Requested
    if (order.orderItems.some(i => i.status === "Return Requested")) {
        order.status = "Return Requested";
    }
}


await order.save();

return res.status(200).json({ success: true, message: "Return request submitted successfully." });

    } catch (error) {
        console.error("Return Error:", error);
        return res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
};

// DOWNLOAD INVOICE 

function getStatusStyle(status) {
  switch ((status || "").toString()) {
    case "Delivered":
      return { label: "Delivered", color: "#2ecc71" };      // green
    case "Cancelled":
      return { label: "Cancelled", color: "#e74c3c" };      // red
    case "Return Requested":
      return { label: "Return Requested", color: "#e67e22" }; // orange
    case "Returned":
      return { label: "Returned", color: "#3498db" };       // blue
    case "Shipped":
      return { label: "Shipped", color: "#f1c40f" };        // yellow
    case "Pending":
      return { label: "Pending", color: "#95a5a6" };        // gray
    default:
      return { label: status || "N/A", color: "#95a5a6" };
  }
}

// DRAW A BADGE (rounded rectangle with label)
function drawBadge(doc, x, y, label, color) {
  const paddingX = 6;
  const paddingY = 3;
  const fontSize = 9;

  doc.save();
  doc.roundedRect(x, y - 2, doc.widthOfString(label) + paddingX * 2, fontSize + paddingY * 2, 3)
    .fill(color);
  doc.fillColor("#ffffff").fontSize(fontSize).text(label, x + paddingX, y);
  doc.restore();
}

// Utility: add a page if needed
function ensureY(doc, y, marginBottom = 72) {
  if (y > doc.page.height - marginBottom) {
    doc.addPage();
    return doc.y; // new page y
  }
  return y;
}

const downloadInvoice =async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Orders.findOne({ orderId })
      .populate("orderItems.productId")
      .lean();

    if (!order) return res.redirect("/orders");

    const doc = new PDFDocument({ margin: 40 });

    // Headers for PDF download
    res.setHeader("Content-Disposition", `attachment; filename=Invoice-${orderId}.pdf`);
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // ------------------------------
    // HEADER – APPLE STORE
    // ------------------------------
    doc
      .fontSize(26)
      .font("Helvetica-Bold")
      .text("APPLE Store", { align: "center" })
      .moveDown(0.3);

    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("#666")
      .text("Official Purchase Invoice", { align: "center" })
      .moveDown(1.5);

    doc.fillColor("black");

    // ------------------------------
    // ORDER DETAILS
    // ------------------------------
    doc.fontSize(12);

    const addInfo = (label, value) => {
      doc
        .font("Helvetica-Bold")
        .text(`${label}: `, { continued: true })
        .font("Helvetica")
        .text(value, { lineGap: 6 });
    };

    addInfo("Order ID", order.orderId);
    addInfo("Order Date", new Date(order.createdAt).toLocaleString());
    addInfo("Payment Method", order.paymentMethod);
    addInfo("Order Status", order.status);

    doc.moveDown(1.2);

    // ------------------------------
    // BILLING ADDRESS
    // ------------------------------
    doc.font("Helvetica-Bold").fontSize(14).text("Billing Address").moveDown(0.4);

    const a = order.address;

    doc.font("Helvetica").fontSize(12);
    doc.text(`${a.fullName}`);
    doc.text(`${a.street}`);
    doc.text(`${a.city}, ${a.state} - ${a.postalCode}`);
    doc.text(`${a.country}`);
    doc.moveDown(1.2);

    // ------------------------------
    // ITEMS TABLE HEADER
    // ------------------------------
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("Order Items")
      .moveDown(0.5);

    // Table Column Titles
    doc
      .font("Helvetica-Bold")
      .fontSize(12);

    doc.text("Item", 40, doc.y, { continued: true, width: 200 });
    doc.text("Qty", 240, doc.y, { continued: true });
    doc.text("Price", 300, doc.y, { continued: true });
    doc.text("Status", 380, doc.y, { align: "right" });

    doc.moveDown(0.8);

    // Divider Line
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // ------------------------------
    // ITEMS LIST
    // ------------------------------
    doc.font("Helvetica").fontSize(12);

    order.orderItems.forEach((item) => {
      doc.text(item.name, 40, doc.y, { continued: true, width: 200 });
      doc.text(String(item.quantity), 240, doc.y, { continued: true });
      doc.text(`₹${item.price}`, 300, doc.y, { continued: true });
      doc.text(item.status, 380, doc.y, { align: "right" });

      doc.moveDown(0.5);
    });

    doc.moveDown(1);

    // ------------------------------
    // PRICE SUMMARY
    // ------------------------------
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("Price Summary")
      .moveDown(0.4);

    const subtotal = order.orderItems.reduce((sum, i) => sum + i.subtotal, 0);
    const tax = order.orderItems.reduce((sum, i) => sum + i.tax, 0);

    const addSummary = (label, value) => {
      doc
        .font("Helvetica")
        .fontSize(12)
        .text(`${label}: `, { continued: true })
        .font("Helvetica-Bold")
        .text(`₹${value}`);
    };

    addSummary("Subtotal", subtotal);
    addSummary("Tax", tax);
    addSummary("Shipping Charge", order.shippingCharge);

    doc.text("---------------------------------------------");

    addSummary("Grand Total", order.totalPrice);

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
