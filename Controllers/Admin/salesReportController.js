const Order = require('../../model/Orders');
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");


const getDateFilter = (type, startDate, endDate) => {
  const now = new Date();
  let filter = {};

  switch (type) {
    case "daily":
      filter.createdAt = {
        $gte: new Date(now.setHours(0, 0, 0, 0)),
        $lte: new Date()
      };
      break;

    case "weekly":
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      filter.createdAt = { $gte: weekStart };
      break;

    case "monthly":
      filter.createdAt = {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1)
      };
      break;

    case "yearly":
      filter.createdAt = {
        $gte: new Date(now.getFullYear(), 0, 1)
      };
      break;

  case "custom": {

  if (!startDate || !endDate) {
    throw new Error("Please select both start and end dates");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();

  // normalize time
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  today.setHours(23, 59, 59, 999);

  if (start > end) {
    throw new Error("Start date cannot be after end date");
  }

  if (start > today || end > today) {
    throw new Error("Future dates are not allowed");
  }

  filter.createdAt = {
    $gte: start,
    $lte: end
  };

  break;
}
}


  return filter;
};


exports.getSalesReport = async (req, res,next) => {
  try {
    const { type = "daily", startDate, endDate } = req.query;

    let dateFilter;

  
    try {
      dateFilter = getDateFilter(type, startDate, endDate);
    } catch (err) {
      return res.render("Admin/salesReport", {
        sales: [],
        overallMetrics: {
          totalSales: 0,
          orderCount: 0,
          totalDiscount: 0,
          totalCoupon: 0
        },
        type,
        startDate,
        endDate,
        errorMessage: err.message,
        query: req.query
      });
    }

    const orders = await Order.find({
      status: "Delivered",
      paymentStatus: { $ne: "Refunded" },
      ...dateFilter
    }).sort({ createdAt: -1 });

    let overallMetrics = {
      totalSales: 0,
      orderCount: orders.length,
      totalDiscount: 0,
      totalCoupon: 0
    };

    const sales = orders.map(order => {
      let grossAmount = 0;
      let offerDiscount = 0;

      order.orderItems.forEach(item => {
        grossAmount += item.subtotal;
        offerDiscount += item.discount || 0;
      });

      const couponDiscount = Number(order.coupon || 0);
      const netRevenue =
        grossAmount - offerDiscount - couponDiscount + order.shippingCharge;

      overallMetrics.totalSales += netRevenue;
      overallMetrics.totalDiscount += offerDiscount;
      overallMetrics.totalCoupon += couponDiscount;

      return {
        _id: order._id,
        date: order.createdAt,
        amount: grossAmount,
        totalDiscount: offerDiscount,
        totalCoupon: couponDiscount
      };
    });

    res.render("Admin/salesReport", {
      sales,
      overallMetrics,
      type,
      startDate,
      endDate,
      query: req.query
    });

  } catch (error) {
   next(error)
  }
};



exports.downloadExcel = async (req, res) => {
  const { type, startDate, endDate } = req.query;
  const dateFilter = getDateFilter(type, startDate, endDate);

  const orders = await Order.find({
    status: "Delivered",
    paymentStatus: { $ne: "Refunded" },
    ...dateFilter
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sales Report");

  sheet.columns = [
    { header: "Date", key: "date" },
    { header: "Order ID", key: "orderId" },
    { header: "Gross Amount", key: "gross" },
    { header: "Offer Discount", key: "discount" },
    { header: "Coupon Discount", key: "coupon" },
    { header: "Net Revenue", key: "net" }
  ];

  orders.forEach(order => {
    let gross = 0;
    let discount = 0;

    order.orderItems.forEach(item => {
      gross += item.subtotal;
      discount += item.discount || 0;
    });

    const coupon = Number(order.coupon || 0);
    const net = gross - discount - coupon + order.shippingCharge;

    sheet.addRow({
      date: order.createdAt.toLocaleDateString(),
      orderId: order.orderId,
      gross,
      discount,
      coupon,
      net
    });
  });

  res.setHeader("Content-Disposition", "attachment; filename=sales-report.xlsx");
  await workbook.xlsx.write(res);
  res.end();
};


// exports.downloadPDF = async (req, res) => {
//   const { type, startDate, endDate } = req.query;
//   const dateFilter = getDateFilter(type, startDate, endDate);

//   const orders = await Order.find({
//     status: "Delivered",
//     paymentStatus: { $ne: "Refunded" },
//     ...dateFilter
//   });

//   const doc = new PDFDocument({ margin: 30 });
//   res.setHeader("Content-Disposition", "attachment; filename=sales-report.pdf");
//   doc.pipe(res);

//   doc.fontSize(18).text("Sales Report", { align: "center" });
//   doc.moveDown();

//   orders.forEach(order => {
//     let gross = 0;
//     let discount = 0;

//     order.orderItems.forEach(item => {
//       gross += item.subtotal;
//       discount += item.discount || 0;
//     });

//     const coupon = Number(order.coupon || 0);
//     const net = gross - discount - coupon + order.shippingCharge;

//     doc
//       .fontSize(10)
//       .text(`Order ID: ${order.orderId}`)
//       .text(`Date: ${order.createdAt.toLocaleDateString()}`)
//       .text(`Gross Amount: ₹${gross}`)
//       .text(`Offer Discount: ₹${discount}`)
//       .text(`Coupon Discount: ₹${coupon}`)
//       .text(`Net Revenue: ₹${net}`)
//       .moveDown();
//   });

//   doc.end();
// };

const calculateOrderAmounts = (order) => {
  let gross = 0;
  let discount = 0;

  order.orderItems.forEach(item => {
    gross += Number(item.subtotal || 0);
    discount += Number(item.discount || 0);
  });

  const coupon = Number(order.coupon || 0);
  const shipping = Number(order.shippingCharge || 0);

  const net = gross - discount - coupon + shipping;

  return { gross, discount, coupon, net };
};


exports.downloadPDF = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    const dateFilter = getDateFilter(type, startDate, endDate);

    const orders = await Order.find({
      status: "Delivered",
      paymentStatus: { $ne: "Refunded" },
      ...dateFilter
    }).lean();

    let rows = "";
    let totalRevenue = 0;

    orders.forEach(order => {
      const { gross, discount, net } = calculateOrderAmounts(order);
      totalRevenue += net;

      rows += `
        <tr>
          <td>${order.orderId}</td>
          <td>${order.createdAt.toLocaleDateString()}</td>
          <td>₹${gross}</td>
          <td>₹${discount}</td>
          <td>₹${net}</td>
        </tr>
      `;
    });

    let html = fs.readFileSync(
      path.join(__dirname, "../../views/Admin/salesReport.html"),
      "utf8"
    );

    html = html
      .replace("{{period}}", type.toUpperCase())
      .replace("{{date}}",endDate.toUpperCase())
      .replace("{{totalOrders}}", orders.length)
      .replace("{{netRevenue}}", totalRevenue)
      .replace("{{rows}}", rows);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales-report.pdf"
    );

    res.send(pdf);

  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to generate PDF");
  }
};
