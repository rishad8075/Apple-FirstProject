const env = require("dotenv").config();
const session = require("express-session");
const User = require("../../model/user");
const Product = require("../../model/Product");
const Category = require("../../model/category");
const Order = require("../../model/Orders");

const { calculateSalesMetrics } = require("../../utils/saleHelper");
const loadDashboard = async (req, res,next) => {
  try {
    const range = req.query.range || "monthly";

  let groupFormat;
let limit;
let chartType;
let dateMatch = {};

if (range === "weekly") {
  groupFormat = "%Y-%m-%d";  
  limit = 7;
  chartType = "line";

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  dateMatch.createdAt = { $gte: weekStart };

} else if (range === "yearly") {
  groupFormat = "%Y";
  limit = 5;
  chartType = "bar";

} else {

  groupFormat = "%Y-%m";
  limit = 12;
  chartType = "line";
}

   
    const salesStats = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
          paymentStatus: { $ne: "Refunded" }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalPrice" },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const totalSales = salesStats[0]?.totalSales || 0;
    const totalOrders = salesStats[0]?.totalOrders || 0;

    const totalUsers = await User.countDocuments({ isAdmin: false });

    
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
  {
    $lookup: {
      from: "categories", 
      localField: "_id",
      foreignField: "_id",
      as: "categoryDetails"
    }
  },
  { $unwind: "$categoryDetails" },
  { $sort: { soldQty: -1 } },
  { $limit: 10 }
]);
   
   const salesChart = await Order.aggregate([
  {
    $match: {
      status: "Delivered",
      paymentStatus: { $ne: "Refunded" },
      ...dateMatch
    }
  },
  {
    $group: {
      _id: {
        $dateToString: {
          format: groupFormat,
          date: "$createdAt"
        }
      },
      total: { $sum: "$totalPrice" }
    }
  },
  { $sort: { _id: -1 } },
  { $limit: limit },
  { $sort: { _id: 1 } }
]);

   
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
      totalSales,
      totalOrders,
      totalUsers,
      topProducts,
      topCategories,
      salesChart,
      paymentChart,
      range,
      chartType
    });

  } catch (error) {
    next(error)
  }
};


const loadlogin = async(req,res)=>{
    if(req.session.isAdmin){
        return res.redirect("/admin");
    }
    return res.render("Admin/login");
}

const Adminlogin =  async (req, res,next) => {
    const { email, password } = req.body;
    try {
        if (process.env.Admin.toString() === email && process.env.password.toString() === password) {
            req.session.isAdmin = true;
            return res.redirect('/admin'); 
        } else {
            return res.status(401).render('Admin/login',{errorMessage:"invalid password"});
        }
    } catch (err) {
        next(err)
    }
}


const adminLogout = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Logout failed. Try again.');
        }
        res.clearCookie('connect.sid'); 
        res.redirect('/admin/login');
    });
};






module.exports={
    loadDashboard,
    loadlogin,
    Adminlogin,
    adminLogout,
}

