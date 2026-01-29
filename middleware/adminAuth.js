module.exports = (req, res, next) => {

  
  if (
    req.originalUrl === "/admin/login" ||
    req.originalUrl === "/admin/logout"
  ) {
    return next();
  }

  if (!req.session.isAdmin) {
    return res.redirect("/admin/login");
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  next();
};
