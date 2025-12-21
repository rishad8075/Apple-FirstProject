
const Order = require("../model/Orders");

const getDateFilter = (type,startDate,endDate)=>{
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
    case "custom":
      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      break;
  }
  return filter;
};
const calculateSalesMetrics = async (type = "monthly") => {
  const dateFilter = getDateFilter(type);
  const orders = await Order.find({
    status: "Delivered",
    paymentStatus: { $ne: "Refunded" },
    ...dateFilter
  });
  let totalSales = 0;
  let totalDiscount = 0;
  orders.forEach(order => {
    let grossAmount = 0;
    let offerDiscount = 0;
    order.orderItems.forEach(item => {
      grossAmount += item.subtotal;
      offerDiscount += item.discount || 0;
    });
    const couponDiscount = Number(order.coupon || 0);
    const netRevenue =
      grossAmount - offerDiscount - couponDiscount + order.shippingCharge;
    totalSales += netRevenue;
    totalDiscount += offerDiscount;
  });
  return {
    totalSales,
    totalOrders: orders.length,
    totalDiscount
  };
};
module.exports = { calculateSalesMetrics };
