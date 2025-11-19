const Product = require('../../model/Product');
const Category = require('../../model/category');
const multer = require('../../helpers/multer');
const fs = require("fs");
const path = require("path")
const sharp = require('sharp');
const mongoose = require("mongoose")



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

const  addProductPost = async (req, res) => {
    try {
        const { productName, description, category, status } = req.body;

        // The frontend sends a JSON string in `variants` hidden input
        if (!req.body.variants) throw new Error('Missing variants data');
        let incomingVariants;
        try {
            incomingVariants = JSON.parse(req.body.variants);
        } catch (err) {
            throw new Error('Invalid variants JSON');
        }

        const variants = [];
        for (let i = 0; i < incomingVariants.length; i++) {
            const v = incomingVariants[i];
            const fileField = v.fileFieldName; // e.g. variant_images_0[]
            const files = Array.isArray(req.files) ? req.files.filter(f => f.fieldname === fileField) : [];
            if (!files || files.length < 3) {
                throw new Error(`Variant ${i + 1} must have at least 3 images.`);
            }
            const images = files.map(f => `/uploads/product-images/${f.filename}`);

            variants.push({
                attributes: v.attributes || {},
                regularPrice: Number(v.regularPrice || v.regularPrice === 0 ? v.regularPrice : v.regularPrice),
                salePrice: Number(v.salePrice || v.salePrice === 0 ? v.salePrice : v.salePrice),
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
            status: status || 'Available',
            isBlocked: false
        });

        await newProduct.save();
        return res.redirect('/admin/products');
    } catch (error) {
        console.error('Error adding product:', error);
        const categories = await Category.find({ isListed: true });
        let errorMessage = 'Failed to add product';
        if (error.message && error.message.includes('Only jpeg|jpg|png|gif files are allowed')) {
            errorMessage = 'Please upload only JPEG, PNG, or GIF images';
        } else if (error.message && error.message.includes('at least 3 images')) {
            errorMessage = error.message;
        } else if (error.name === 'ValidationError') {
            errorMessage = Object.values(error.errors).map(val => val.message).join(', ');
        }
        return res.status(500).render('admin/productAdd', {
            error: errorMessage,
            cat: categories,
            formData: req.body // To repopulate form
        });
    }
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
                const prod = p.toObject ? p.toObject() : p;
                let displayImage = '/images/default-product.jpg';
                if (prod.variants && prod.variants.length > 0 && prod.variants[0].images && prod.variants[0].images.length > 0) {
                    displayImage = prod.variants[0].images[0].startsWith('/') ? prod.variants[0].images[0] : '/' + prod.variants[0].images[0];
                }
                prod.displayImage = displayImage;
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
        res.status(500).send("Internal server issue. Please try again");
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
    res.status(500).send('Server error');
  }
};

// POST -> handle edit submission
const editProductPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { productName, description, category } = req.body;

    if (!req.body.variants) throw new Error('Missing variants JSON');

    let incomingVariants;
    try {
      incomingVariants = JSON.parse(req.body.variants);
    } catch (err) {
      throw new Error('Invalid variants JSON');
    }

    // fetch original product to compare images for deletion
    const original = await Product.findById(id).lean();
    if (!original) throw new Error('Original product not found');

    const finalVariants = [];

    // req.files is an array (because multer.any()). group by fieldname
    const filesByField = {};
    (Array.isArray(req.files) ? req.files : []).forEach(f => {
      if (!filesByField[f.fieldname]) filesByField[f.fieldname] = [];
      filesByField[f.fieldname].push(f);
    });

    for (let idx = 0; idx < incomingVariants.length; idx++) {
      const v = incomingVariants[idx];

      const fieldName = v.fileFieldName; // variant_images_X[]
      const uploadedFiles = (filesByField[fieldName] || []).map(f => `/uploads/product-images/${f.filename}`);

      // existingImages sent from client are the server paths (kept by admin)
      const keptExisting = Array.isArray(v.existingImages) ? v.existingImages.filter(i => typeof i === 'string') : [];

      const combinedImages = [...keptExisting, ...uploadedFiles];

      if (combinedImages.length < 3) {
        throw new Error(`Variant ${idx + 1} must have at least 3 images.`);
      }

      finalVariants.push({
        attributes: v.attributes || {},
        regularPrice: Number(v.regularPrice || v.regularPrice === 0 ? v.regularPrice : v.regularPrice),
        salePrice: Number(v.salePrice || v.salePrice === 0 ? v.salePrice : v.salePrice),
        productOffer: Number(v.productOffer || 0),
        stock: Number(v.stock || 0),
        images: combinedImages
      });

      // Now, remove from disk any original images that were NOT kept
      // original.variants may be shorter/longer; safe check:
      const origVariant = (original.variants && original.variants[idx]) ? original.variants[idx] : null;
      if (origVariant && Array.isArray(origVariant.images)) {
        origVariant.images.forEach(origImg => {
          // if origImg not present in keptExisting, delete file
          // origImg might start with '/uploads/product-images/...'
          if (!keptExisting.includes(origImg)) {
            // map URL to disk path
            let rel = origImg;
            if (rel.startsWith('/')) rel = rel.slice(1); // remove leading slash
            const diskPath = path.join(__dirname, '..', '..', 'public', rel);
            if (fs.existsSync(diskPath)) {
              try {
                fs.unlinkSync(diskPath);
                console.log('Deleted old image:', diskPath);
              } catch (e) {
                console.error('Failed to delete old file:', diskPath, e);
              }
            }
          }
        });
      }
    }

    // update product
    await Product.findByIdAndUpdate(id, {
      productName,
      description,
      category: category ? new mongoose.Types.ObjectId(category) : undefined,
      variants: finalVariants
    }, { new: true });
    console.log("Uploaded files:", req.files);


    return res.redirect('/admin/products');
  } catch (err) {
    console.error('Edit product error:', err);
    // re-render edit page with message
    const categories = await Category.find({ isListed: true });
    return res.status(500).render('Admin/productEdit', {
      product: await Product.findById(req.params.id).lean(),
      cat: categories,
      error: err.message || 'Failed to update product'
    });
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
}