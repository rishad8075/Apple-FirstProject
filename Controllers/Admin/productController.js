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

const addProductPost = async (req, res) => {
    try {
        const { productName, description, category, status } = req.body;

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
            const files = Array.isArray(req.files)
                ? req.files.filter(f => f.fieldname === fileField)
                : [];

            if (!files || files.length < 3) {
                throw new Error(`Variant ${i + 1} must have at least 3 images.`);
            }

            const images = [];

            for (let f of files) {
                const inputPath = f.path; // Original uploaded file
                const filename = `product-${Date.now()}-${Math.round(Math.random()*1e9)}.jpeg`;
                const outputPath = path.join(process.cwd(), 'public/uploads/product-images', filename);

                // Ensure folder exists
                fs.mkdirSync(path.dirname(outputPath), { recursive: true });

                // Resize image using Sharp
                await sharp(inputPath)
                    .resize(400, 400, { fit: 'contain' })
                    .jpeg({ quality: 80 })
                    .toFile(outputPath);

             

                images.push(`/uploads/product-images/${filename}`);
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
            formData: req.body
        });
    }
};



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

    const original = await Product.findById(id);
    if (!original) throw new Error('Product not found');

    const finalVariants = [];

    // Group uploaded files by fieldname
    const filesByField = {};
    (Array.isArray(req.files) ? req.files : []).forEach(f => {
      if (!filesByField[f.fieldname]) filesByField[f.fieldname] = [];
      filesByField[f.fieldname].push(f);
    });

    for (let v of incomingVariants) {
      // New uploaded images
      const uploadedFiles = (filesByField[v.fileFieldName] || []).map(f => `/uploads/product-images/${f.filename}`);
      // Existing images user kept
      const keptExisting = Array.isArray(v.existingImages) ? v.existingImages.filter(i => typeof i === 'string') : [];

      const combinedImages = [...keptExisting, ...uploadedFiles];

      if (combinedImages.length < 3) {
        throw new Error(`Variant "${v.attributes.Color || ''} ${v.attributes.storage || ''}" must have at least 3 images.`);
      }

      finalVariants.push({
        _id: v.id || new mongoose.Types.ObjectId(),
        attributes: {
          color: v.attributes.Color || v.attributes.color || '',
          storage: v.attributes.storage || ''
        },
        regularPrice: Number(v.regularPrice || 0),
        salePrice: Number(v.salePrice || 0),
        productOffer: Number(v.productOffer || 0),
        stock: Number(v.stock || 0),
        images: combinedImages
      });

      // Delete old images removed by user
      if (v.id) {
        const origVariant = original.variants.find(ov => ov._id.toString() === v.id);
        if (origVariant && Array.isArray(origVariant.images)) {
          origVariant.images.forEach(origImg => {
            if (!keptExisting.includes(origImg) && !uploadedFiles.includes(origImg)) {
              const rel = origImg.startsWith('/') ? origImg.slice(1) : origImg;
              const diskPath = path.join(process.cwd(), 'public', rel);
              try { if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath); }
              catch(e){ console.log('Cannot delete file:', diskPath, e.message); }
            }
          });
        }
      }
    }

    // Update product in MongoDB
    await Product.findByIdAndUpdate(id, {
      productName,
      description,
      category: category ? new mongoose.Types.ObjectId(category) : undefined,
      variants: finalVariants
    }, { new: true });

    return res.redirect('/admin/products');

  } catch(err) {
    console.error('Edit product error:', err);
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