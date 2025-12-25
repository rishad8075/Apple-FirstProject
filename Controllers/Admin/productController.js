const Product = require('../../model/Product');
const Category = require('../../model/category');
const multer = require('../../helpers/multer');
const fs = require("fs");
const path = require("path")
const sharp = require('sharp');
const mongoose = require("mongoose")
const uploadToCloudinary = require("../../helpers/cloudinaryUpload");




const addProducts = async(req,res)=>{
    try {
        const category = await Category.find({isListed:true});
        res.render("Admin/productAdd",{
            cat:category
        })
    } catch (error) {
        console.error(error)
        res.status(500).render("adminpage-500");
    }
}

const addProductPost = async (req, res) => {
  try {
    const { productName, description, category, status } = req.body;

    if (!req.body.variants) throw new Error("Missing variants data");

    let incomingVariants;
    try {
      incomingVariants = JSON.parse(req.body.variants);
    } catch {
      throw new Error("Invalid variants JSON");
    }

    const variants = [];

    for (let i = 0; i < incomingVariants.length; i++) {
      const v = incomingVariants[i];
      const fileField = v.fileFieldName;

      const files = Array.isArray(req.files)
        ? req.files.filter(f => f.fieldname === fileField)
        : [];

      if (!files || files.length < 3) {
        throw new Error(`Variant ${i + 1} must have at least 3 images.`);
      }

      const images = [];

      for (const file of files) {
        
        const result = await uploadToCloudinary(file.buffer, "products");

        images.push(result.secure_url); 
      }

      variants.push({
        attributes: v.attributes || {},
        regularPrice: Number(v.regularPrice || 0),
        salePrice: Number(v.salePrice || 0),
        productOffer: Number(v.productOffer || 0),
        stock: Number(v.stock || 0),
        images
      });
    }

    const newProduct = new Product({
      productName,
      description,
      category: category ? new mongoose.Types.ObjectId(category) : undefined,
      variants,
      status: status || "Available",
      isBlocked: false
    });

    await newProduct.save();
    return res.redirect("/admin/products");

  } catch (error) {
    console.error("Error adding product:", error);

    const categories = await Category.find({ isListed: true });
    let errorMessage = "Failed to add product";

    if (error.message?.includes("Only image files are allowed")) {
      errorMessage = "Please upload only image files (JPEG, PNG, WEBP)";
    } else if (error.message?.includes("at least 3 images")) {
      errorMessage = error.message;
    } else if (error.name === "ValidationError") {
      errorMessage = Object.values(error.errors).map(v => v.message).join(", ");
    }

    return res.status(500).render("admin/productAdd", {
      error: errorMessage,
      cat: categories,
      formData: req.body
    });
  }
};


function calculateFinalPrice(salePrice, productOffer, categoryOffer) {
    const finalOffer = Math.max(productOffer || 0, categoryOffer || 0);
    const finalPrice = salePrice - Math.round((salePrice * finalOffer) / 100);

    return { finalOffer, finalPrice };
}




const listProducts= async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ]
        })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate("category")
        .exec();

        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ]
        }).countDocuments();
        
        const category = await Category.find({ isListed: true });
        
        if (category) {
            // Ensure each product has a displayImage (first image of first variant) for the list view
          const productsWithImage = productData.map(p => {
    const prod = p.toObject();

    // display image
    let displayImage = '/images/default-product.jpg';
    if (
        prod.variants?.length > 0 &&
        prod.variants[0].images?.length > 0
    ) {
        displayImage = prod.variants[0].images[0]
            ? prod.variants[0].images[0]
            : "/" + prod.variants[0].images[0];
    }
    prod.displayImage = displayImage;

    // 🟢 OFFER LOGIC STARTS HERE
    const categoryOffer = prod.category?.categoryOffer || 0;

    prod.variants.forEach(variant => {
        const { finalOffer, finalPrice } = calculateFinalPrice(
            variant.salePrice,
            variant.productOffer,
            categoryOffer
        );

        variant.finalOffer = finalOffer;
        variant.finalPrice = finalPrice;
    });
    // 🟢 OFFER LOGIC ENDS HERE

    return prod;
});


            res.render("Admin/products", {
                data: productsWithImage,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: category,
            });
        } else {
            res.render("page-404");
        }
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).render("adminpage-500");
    }
}





//block product
const blockProduct = async (req, res) => {
    try {
        const {id} = req.params;
        await Product.findOneAndUpdate({_id:id},{$set:{isBlocked:true}},{new:true})
        res.json({ success: true, message: "Product blocked successfully" });   
    } catch (error) {
        console.error("Error blocking product:", error);
        res.status(500).json({ success: false, message: "Error blocking product" });    
        
    }

}


//unblock product
const unblockProduct = async (req, res) => {
    try {
        const {id} = req.params;
        await Product.findByIdAndUpdate(id, { isBlocked: false });
        res.json({ success: true, message: "Product unblocked successfully" });   
    } catch (error) {               
        console.error("Error unblocking product:", error);
        res.status(500).json({ success: false, message: "Error unblocking product" });  




    }
}

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Product.findByIdAndDelete(id);

        if (!deleted) {
            return res.json({ success: false, message: "Product not found" });
        }

        return res.json({ success: true, message: "Product deleted successfully" });

    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ success: false, message: "Error deleting product" });
    }
}

const editProductGet = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).lean();
    if (!product) return res.status(404).send('Product not found');

    const categories = await Category.find({ isListed: true }).lean();

    res.render('Admin/productEdit', {
      product,
      cat: categories
    });
  } catch (err) {
    console.error('Edit product page error', err);
    res.status(500).render("adminpage-500");
  }
};

// POST -> handle edit submission
const editProductPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { productName, description, category } = req.body;

    if (!req.body.variants) throw new Error("Missing variants JSON");

    let incomingVariants;
    try {
      incomingVariants = JSON.parse(req.body.variants);
    } catch {
      throw new Error("Invalid variants JSON");
    }

    const original = await Product.findById(id);
    if (!original) throw new Error("Product not found");

    const finalVariants = [];

  
    const filesByField = {};
    (Array.isArray(req.files) ? req.files : []).forEach(file => {
      if (!filesByField[file.fieldname]) filesByField[file.fieldname] = [];
      filesByField[file.fieldname].push(file);
    });

    for (const v of incomingVariants) {
    
      const keptExisting = Array.isArray(v.existingImages)
        ? v.existingImages.filter(img => typeof img === "string")
        : [];

      
      const uploadedFiles = filesByField[v.fileFieldName] || [];
      const newImageUrls = [];

      for (const file of uploadedFiles) {
        const result = await uploadToCloudinary(file.buffer, "products");
        newImageUrls.push(result.secure_url);
      }

      const combinedImages = [...keptExisting, ...newImageUrls];

      if (combinedImages.length < 3) {
        throw new Error(
          `Variant "${v.attributes?.Color || ""} ${v.attributes?.storage || ""}" must have at least 3 images.`
        );
      }

      finalVariants.push({
        _id: v.id || new mongoose.Types.ObjectId(),
        attributes: {
          color: v.attributes?.Color || v.attributes?.color || "",
          storage: v.attributes?.storage || ""
        },
        regularPrice: Number(v.regularPrice || 0),
        salePrice: Number(v.salePrice || 0),
        productOffer: Number(v.productOffer || 0),
        stock: Number(v.stock || 0),
        images: combinedImages
      });
    }

    // Update product
    await Product.findByIdAndUpdate(
      id,
      {
        productName,
        description,
        category: category ? new mongoose.Types.ObjectId(category) : undefined,
        variants: finalVariants
      },
      { new: true }
    );

    return res.redirect("/admin/products");

  } catch (err) {
    console.error("Edit product error:", err);

    const categories = await Category.find({ isListed: true });

    return res.status(500).render("Admin/productEdit", {
      product: await Product.findById(req.params.id).lean(),
      cat: categories,
      error: err.message || "Failed to update product"
    });
  }
};




const addProductOffer = async (req, res) => {
  try {
    const { productId, variantId, offer } = req.body;

    if (offer < 1 || offer > 90) {
      return res.status(400).json({ message: "Invalid offer" });
    }

    await Product.updateOne(
      { _id: productId, "variants._id": variantId },
      { $set: { "variants.$.productOffer": offer } }
    );
   


    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};






const removeProductOffer = async (req, res) => {
  try {
    const { productId, variantId } = req.body;

    await Product.updateOne(
      { _id: productId, "variants._id": variantId },
      { $set: { "variants.$.productOffer": 0 } }
    );
    

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};




module.exports={
    listProducts,   
   addProducts,
   addProductPost,
    blockProduct,
    unblockProduct,
    deleteProduct,
    editProductGet,
    editProductPost,
    addProductOffer,
    removeProductOffer
}