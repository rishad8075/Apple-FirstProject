module.exports = (req, res, next) => {

    // If admin is not logged in → redirect to login
    if (!req.session.isAdmin) {
        return res.redirect("/admin/login");
    }

    // Disable caching to prevent back-button access
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    next();
};