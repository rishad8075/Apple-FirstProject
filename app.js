const express = require("express");
const app = express();
const env = require('dotenv').config();
const passport = require("./config/passport")
const DB = require("./config/db");
const path = require("path");
const session = require("express-session");
const userRoutes = require("./Routes/user/userRoutes");
const adminRoutes = require("./Routes/admin/adminRoutes");
const errorMiddleware = require("./middleware/ErrorMiddleware");



const Port = process.env.PORT
DB();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,  
    cookie: {
        secure: false,         
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000 
    }
}));


app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
});


app.set("view engine","ejs");
app.set('views', path.join(__dirname, 'views'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static("public"))
app.use(passport.initialize());
app.use(passport.session());






app.use("/",userRoutes)
app.use(adminRoutes);

app.use(errorMiddleware);

app.listen(Port,()=>{
    console.log(`Server Running ${process.env.PORT}`);
})