const express = require("express");
const app = express();
const env = require('dotenv').config();
const DB = require("./model/db");
const path = require("path");
const session = require("express-session");
const UserRoutes = require("./Routes/UserRoutes") 


const Port = process.env.PORT
DB();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,  // set false to avoid saving empty sessions
    cookie: {
        secure: false,          // true only for HTTPS
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000 // 72 hours
    }
}));

// Prevent caching for login/signup pages (and other protected pages)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.set("view engine","ejs");
app.set('views', path.join(__dirname, 'views'));
app.use(express.static("public"))






app.use("/",UserRoutes)


app.listen(Port,()=>{
    console.log(`Server Running ${process.env.PORT}`);
})