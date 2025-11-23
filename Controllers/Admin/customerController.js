const User = require("../../model/user");

const customerInfo =  async (req, res) => {
    try {
        if(req.session.isAdmin){
        let { search, page } = req.query;
        const limit = 5; // Users per page
        page = parseInt(page) || 1;
        let query = {};

        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: "i" } }, // Case-insensitive search
                    { email: { $regex: search, $options: "i" } },
                    { phoneNumber: { $regex: search, $options: "i" } }
                ]
            };
        }

        const totalUsers = await User.countDocuments(query);
        const users = await User.find(query)
            .sort({ _id: -1 }) // Latest users first
            .skip((page - 1) * limit)
            .limit(limit);

       return res.render('admin/userManagement', { users, search, totalUsers, limit, page });
    }
    return res.redirect('/admin/logout')
    } catch (error) {
        res.status(500).send('Error fetching users');
    }

};

// Block User
const BlockUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isBlocked: true },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        
        if (req.session.user && req.session.user._id.toString() === req.params.id.toString()) {
            req.session.user.isBlocked = true;
        }

        res.json({ success: true, message: "User blocked successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error blocking user" });
    }
};
 
// Unblock User
const UnblockUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isBlocked: false },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

       
        if (req.session.user && req.session.user._id.toString() === req.params.id.toString()) {
            req.session.user.isBlocked = false;
        }

        res.json({ success: true, message: "User unblocked successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error unblocking user" });
    }
};

module.exports = {
  customerInfo,
  BlockUser,
  UnblockUser,

};
