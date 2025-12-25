const Coupon = require("../../model/Coupon");






exports.getCoupon = async(req,res)=>{
    try {
        const coupons = await Coupon.find().sort({createdAt:-1})
        res.status(200).render("Admin/coupon-list",{coupons})
        
    } catch (error) {
        console.log(error)
        res.status(500).render("adminpage-500");
    }
}


exports.addCoupon = async (req,res)=>{
    try {
        res.render("Admin/add-coupon");

    } catch (error) {
        console.log(error);
        res.status(500).render("adminpage-500");
    }
}



exports.postAddCoupon = async (req, res) => {
    try {
        let {
            code,
            description,
            discountType,
            discountValue,
            maxDiscount,
            minAmount,
            maxUses,
            startDate,
            endDate
        } = req.body;

        code = code.trim().toUpperCase();

        
        if (!code || !discountType || !discountValue || !maxUses || !startDate || !endDate) {
            return res.json({ success: false, message: "Please fill all required fields." });
        }

        
        const existing = await Coupon.findOne({ code });
        if (existing) {
            return res.json({ success: false, message: "A coupon with this code already exists." });
        }

       
        if (discountType === "percentage") {
            if (!maxDiscount || maxDiscount <= 0) {
                return res.json({ success: false, message: "Max Discount Amount is required for percentage coupons." });
            }
        } else if (discountType === "fixed") {
            maxDiscount = null; 
        }

      
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            return res.json({ success: false, message: "End date must be after start date." });
        }

        
        const newCoupon = new Coupon({
            code,
            description,
            discountType,
            discountValue,
            maxDiscountAmount: maxDiscount || null,
            minOrderAmount: minAmount || 0,
            maxUses,
            startDate:start,
            expiryDate: end,
            isActive: true
        });

        await newCoupon.save();

        res.json({ success: true, message: "Coupon added successfully!" });

    } catch (error) {
        console.error("Error while adding coupon:", error);
        res.json({ success: false, message: "Something went wrong while creating the coupon." });
    }
};

exports.getEditPage = async (req, res) => {
    try {
        const couponId = req.params.id; 
        const coupon = await Coupon.findById(couponId); 
        if (!coupon) {
            return res.redirect("/admin/coupons"); 
        }

        res.status(200).render("Admin/edit-coupon", { coupon });
    } catch (error) {
        console.log(error);
        res.status(500).render("adminpage-500");
    }
};


exports.editCoupon = async (req, res) => {
    try {
        const {
            code,
            discountType,
            discountValue,
            maxDiscount,
            minAmount,
            maxUses,
            startDate,
            endDate,
            description
        } = req.body;

        
        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ success: false, message: "End date must be after start date." });
        }

       
        const couponId = req.params.id; 
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                code,
                discountType,
                discountValue,
                maxDiscountAmount: maxDiscount || null,
                minOrderAmount: minAmount,
                maxUses,
                startDate,
                expiryDate: endDate,
                description
            },
            { new: true, runValidators: true } 
        );

        if (!updatedCoupon) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }

        res.json({
            success: true,
            message: "Coupon updated successfully.",
            coupon: updatedCoupon
        });

    } catch (error) {
        console.error("Edit coupon error:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again." });
    }
};



exports.deleteCoupon = async (req, res) => {
    try {
        const couponId = req.params.id;
        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

        if (!deletedCoupon) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }

        res.json({
            success: true,
            message: "Coupon deleted successfully."
        });
    } catch (error) {
        console.error("Delete coupon error:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again." });
    }
};






