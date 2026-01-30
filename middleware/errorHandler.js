module.exports = (err, req, res, next) => {
//  console.error(`[${req.method}] ${req.originalUrl} → ${err.message} ${err}`);
console.log(err)


  let statusCode = err.statusCode || 500;

 
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    err.message = "Resource not found";
  }

  const isAdmin = req.originalUrl.startsWith("/admin");

  if (statusCode === 404) {
    return res.status(404).render(
      isAdmin ? "adminpage-404" : "page-404",
      {
        errorMessage: err.message || "Page not found",
      }
    );
  }

  res.status(500).render(
    isAdmin ? "adminpage-500" : "page-500",
    {
      errorMessage: "Something went wrong. Please try again later.",
    }
  );
};
