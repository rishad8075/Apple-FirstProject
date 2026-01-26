module.exports = (req, res, next) => {

    
    if (!req.session.isAdmin) {
        return res.redirect("/admin/login");
    }


    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    next();
};