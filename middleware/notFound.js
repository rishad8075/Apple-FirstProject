module.exports = (req, res, next) => {
  // Ignore Chrome DevTools & browser internal requests
  if (req.originalUrl.startsWith("/.well-known")) {
    return res.status(204).end(); // No Content
  }

  const error = new Error("Page not found");
  error.statusCode = 404;
  next(error);
};

