const Category = require("../../model/category");
const { trace } = require("../../Routes/adminRoutes");
const Product = require("../../model/Product")







const categoryInfo = async (req, res) => {
    try {
        let { search, page } = req.query;
        page = parseInt(page) || 1;
        const limit = 5;

        let query = {};
        if (search) {
            
            query.name = { $regex: search, $options: "i" };
        }

        const totalCategories = await Category.countDocuments(query);
        const totalPages = Math.ceil(totalCategories / limit);

        const categories = await Category.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 }); 

        res.render("Admin/category", {
            cat: categories,
            currentPage: page,
            totalPages,
            search: search || "",
        });
    } catch (err) {
        console.log(err);
        res.render("adminpage-500");
    }
}


const addCategory = async (req, res) => {
    try {
        let { name, description } = req.body;

       
        const isAlreadyExist = await Category.findOne({
            name: { $regex: new RegExp("^" + name + "$", "i") }
        });

        if (isAlreadyExist) {
            return res.status(400).json({ error: "Category already exists" });
        }

        const newCategory = new Category({
            name,
            description
        });

        await newCategory.save();

        return res.json({ message: "Category Added Successfully" });

    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const listCategory = async (req,res)=>{
    try {
         const { id } = req.body;
    await Category.findByIdAndUpdate(id, { isListed: true });
    return res.json({ message: "Category listed successfully" });

        
    } catch (error) {
         console.error(error);
        res.status(500).send("Server error");
    }
}

const unlistCategory = async (req,res)=>{
    try {
           const { id } = req.body;
    await Category.findByIdAndUpdate(id, { isListed: false });
    return res.json({ message: "Category unlisted successfully" });
    } catch (error) {
        console.error(error)
        res.status(500).render("adminpage-500");
    }
}

const getEditCategoryPage = async (req, res) => {
    try {
        const id = req.params.id;
        const category = await Category.findById(id);

        if (!category) {
            return res.redirect("/admin/category"); 
        }

        res.render("Admin/editCatagory", { category });
    } catch (error) {
        console.error(error);
        res.redirect("/admin/category");
    }
};



const editCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, description } = req.body;

        // Case-insensitive check for existing category
        const existingCategory = await Category.findOne({ 
            name: { $regex: `^${name}$`, $options: 'i' }, 
            _id: { $ne: id } 
        });

        if (existingCategory) {
            return res.status(400).json({ error: "Category name already exists" });
        }

        const category = await Category.findByIdAndUpdate(
            id,
            { name, description },
            { new: true }
        );

        if (!category) return res.status(404).json({ error: "Category not found" });

        return res.json({ message: "Category updated successfully", category });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};








const deleteCategory = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ error: "Category ID not provided" });
        }

        await Category.findOneAndDelete({_id:id});

        return res.json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error", details: error.message });
    }
};



const addCategoryOffer = async (req, res) => {
  try {
    const { categoryId, offer } = req.body;

    if (offer < 1 || offer > 90) {
      return res.status(400).json({ message: "Invalid offer" });
    }

    await Category.findByIdAndUpdate(categoryId, {
      categoryOffer: offer
    });

  await Product.updateMany(
      { category: categoryId },  // filter: all products in this category
      { categoryOffer: offer }   // update field
    );
    





    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};



const removeCategoryOffer = async (req, res) => {
  try {
    const { categoryId } = req.body;

    await Category.findByIdAndUpdate(categoryId, {
      categoryOffer: 0
    });
    await Product.updateMany(
      { category: categoryId },  // filter: all products in this category
      { categoryOffer: 0 }   // update field
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};








module.exports={
    categoryInfo,
    addCategory,
    listCategory,
    unlistCategory,
    getEditCategoryPage,
    editCategory,
    deleteCategory,
    addCategoryOffer,
    removeCategoryOffer

}