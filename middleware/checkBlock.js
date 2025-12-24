const User = require("../model/user");

module.exports = async function (req, res, next) {
    try {
        if (!req.session.userId) {
            return res.redirect("/login");
        }

        const user = await User.findById(req.session.userId);

       
        if (!user || user.isBlocked) {
            return req.session.destroy(() => {
                return res.redirect("/login?message=Your account has been blocked");
            });
        }

       
        req.user = user;
        next();

    } catch (error) {
        console.log(error);
        res.redirect("/login");
    }
};
