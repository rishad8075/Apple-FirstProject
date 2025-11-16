const User = require("../../model/user");
const session = require("express-session");
const Product = require("../../model/Product");








const loadHome = async (req, res) => {

 
  try {
    const products = await Product.find({})
    return res.render("User/home",{products});

  } catch (error) {
    return res.status(500).send('Server error. Please try again.'+error);
  }
};

const loadSignup = async(req,res)=>{
    try {
       
            res.render("User/signup");
      
    } catch (error) {
        console.log('signup page not worked',error)
        res.status(500).send('server error please try agian',error.message);
    }
};

const signup = async(req,res)=>{
    const {name,email,password,phoneNumber} = req.body;
    try {
        const newUser = new User({name:name,email:email,password:password,phoneNumber:phoneNumber});
        newUser.save();

        res.redirect("/signup");
  
   
     
    } catch (error) {
        console.log('error for save user');
        res.status(500).send('internal issue')
    }
}

module.exports = {
  loadHome,
  loadSignup,
  signup,
};
