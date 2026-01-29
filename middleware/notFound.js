module.exports = (req,res,next)=> {
    const error = new Error("page Not Founded");
    error.statusCode = 404 ;
    next(error)
}
