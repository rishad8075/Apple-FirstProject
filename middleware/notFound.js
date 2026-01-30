module.exports = (req, res, next) => {

  if (req.originalUrl.startsWith("/.well-known")) {
    return res.status(204).end(); 
  }

  const error = new Error("Page not found");
  error.statusCode = 404;
  next(error);
};

