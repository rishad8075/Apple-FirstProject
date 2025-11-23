module.exports = function (req, res, next) {
    if (req.session.user && req.session.user.isBlocked) {
        req.session.destroy(() => {
            return res.redirect('/login?message=Your account has been blocked');
        });
    }
    next();
};