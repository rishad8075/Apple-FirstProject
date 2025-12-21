const env = require("dotenv").config();
const session = require("express-session");
const User = require("../../model/user");
const Product = require("../../model/Product");
const Category = require("../../model/category");
const Order = require("../../model/Orders");

const { calculateSalesMetrics } = require("../../utils/saleHelper");
const loadDashboard = async (req, res) => {
  try {
    const range = req.query.range || "monthly";
    let groupFormat;
    let limit;
    if (range === "yearly") {
      groupFormat = "%Y";
      limit = 5;
    } else {
      groupFormat = "%Y-%m";
      limit = 12;
    }
    // SALES METRICS (use same range)
    const { totalSales, totalOrders, totalRevenue } =
      await calculateSalesMetrics(range);
    const totalUsers = await User.countDocuments({ isAdmin: false });
    /* ---------------- TOP PRODUCTS ---------------- */
    const topProducts = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.productId",
          soldQty: { $sum: "$orderItems.quantity" }
        }
      },
      { $sort: { soldQty: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" }
    ]);
    /* ---------------- TOP CATEGORIES ---------------- */
    const topCategories = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $unwind: "$orderItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category",
          soldQty: { $sum: "$orderItems.quantity" }
        }
      },
      { $sort: { soldQty: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" }
    ]);
    /* ---------------- TOP BRANDS ---------------- */
    const topBrands = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $unwind: "$orderItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.brand",
          soldQty: { $sum: "$orderItems.quantity" }
        }
      },
      { $sort: { soldQty: -1 } },
      { $limit: 10 }
    ]);
    /* ---------------- SALES CHART ---------------- */
const salesChart = await Order.aggregate([
  {
    $match: {
      status: "Delivered",
      paymentStatus: { $ne: "Refunded" }
    }
  },
  {
    $group: {
      _id: {
        $dateToString: {
          format: groupFormat,
          date: "$createdAt",
          timezone: "Asia/Kolkata"
        }
      },
     total: {
  $sum: {
    $sum: {
      $map: {
        input: "$orderItems",
        as: "item",
        in: {
          $multiply: ["$$item.price", "$$item.quantity"]
        }
      }
    }
  }
}

    }
  },
  { $sort: { _id: 1 } }   // IMPORTANT: ascending only
]);
    /* ---------------- PAYMENT METHOD PIE ---------------- */
    const paymentChart = await Order.aggregate([
      { $match: { status: "Delivered" } },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 }
        }
      }
    ]);
    res.render("Admin/dashboard", {
      dashboard: {
        totalSales,
        totalOrders,
        totalUsers,
        totalRevenue
      },
      topProducts,
      topCategories,
      topBrands,
      salesChart,
      paymentChart,
      range
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).render("page-500");
  }
};


const loadlogin = async(req,res)=>{
    if(req.session.isAdmin){
        return res.redirect("/admin");
    }
    return res.render("Admin/login");
}

const Adminlogin =  async (req, res) => {
    const { email, password } = req.body;
    try {
        if (process.env.Admin.toString() === email && process.env.password.toString() === password) {
            req.session.isAdmin = true;
            return res.redirect('/admin'); 
        } else {
            return res.status(401).render('Admin/login',{errorMessage:"invalid password"});
        }
    } catch (err) {
        return res.status(500).send('Something went wrong. Please restart and try again.');
    }
}


const adminLogout = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Logout failed. Try again.');
        }
        res.clearCookie('connect.sid'); // clear session cookie
        res.redirect('/admin/login');
    });
};






module.exports={
    loadDashboard,
    loadlogin,
    Adminlogin,
    adminLogout,
}

