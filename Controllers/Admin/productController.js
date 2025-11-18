const Product = require('../../model/Product');
const Category = require('../../model/category');
const upload = require('../../helpers/multer');
const fs = require("fs");
const path = require("path")
const sharp = require('sharp');



const addProducts = async(req,res)=>{
    try {
        const category = await Category.find({isListed:true});
        res.render("Admin/productAdd",{
            cat:category
        })
    } catch (error) {
        console.error(error)
        res.status(500).send('server error');
    }
}


// const listProducts= async (req, res) => {
//     try {
//         const search = req.query.search || "";
//         const page = req.query.page || 1;
//         const limit = 4;

//         const productData = await Product.find({
//             $or: [
//                 { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
//             ]
//         })
//         .limit(limit * 1)
//         .skip((page - 1) * limit)
//         .populate("category")
//         .exec();

//         const count = await Product.find({
//             $or: [
//                 { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
//             ]
//         }).countDocuments();
        
//         const category = await Category.find({ isListed: true });
        
//         if (category) {
//             res.render("admin/products", {
//                 data: productData,
//                 currentPage: page,
//                 totalPages: Math.ceil(count / limit),
//                 cat: category,
//             });
//         } else {
//             res.render("page-404");
//         }
//     } catch (error) {
//         console.error("Error fetching products:", error);
//         res.status(500).send("Internal server issue. Please try again");
//     }
// }


module.exports={
   addProducts,
}