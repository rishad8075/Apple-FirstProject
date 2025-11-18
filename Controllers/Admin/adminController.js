const env = require("dotenv").config();
const session = require("express-session");









const loadDashboard = async(req,res)=>{

    if(req.session.isAdmin){
         return res.render("Admin/dashboard");
    }
    return res.redirect("/admin/login");

}

const loadlogin = async(req,res)=>{
    if(req.session.isAdmin){
        return res.redirect("/admin");
    }
    return res.render("Admin/login");
}

const Adminlogin =  async (req, res) => {
    const { email, password } = req.body;
    try {
        if (process.env.Admin.toString() === email && process.env.password.toString() === password) {
            req.session.isAdmin = true;
            return res.redirect('/admin'); 
        } else {
            return res.status(401).render('Admin/login',{errorMessage:"invalid password"});
        }
    } catch (err) {
        return res.status(500).send('Something went wrong. Please restart and try again.');
    }
}


const adminLogout = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Logout failed. Try again.');
        }
        res.clearCookie('connect.sid'); // clear session cookie
        res.redirect('/admin/login');
    });
};






module.exports={
    loadDashboard,
    loadlogin,
    Adminlogin,
    adminLogout,
}

