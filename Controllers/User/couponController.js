const Coupon = require('../../model/Coupon');
const User = require("../../model/user")


const getUserCoupons = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) return res.redirect('/login');
        const user = await User.findById(userId)

        
        const coupons = await Coupon.find().lean();

       
        const today = new Date();
        coupons.forEach(coupon => {
            coupon.isExpired = new Date(coupon.expiryDate) < today;
        });

        res.render('User/coupons', {
            user, 
            coupons,
         activeLink: "coupon"
        });
    } catch (err) {
        console.error('Error fetching coupons:', err);
        res.redirect('/');
    }
};

module.exports = {
    getUserCoupons
};
