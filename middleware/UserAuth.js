module.exports = (req, res, next) => {

    // Disable caching to prevent back-button access
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Check if user is logged in
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    next();
};
