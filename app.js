const express = require("express");
const app = express();
const env = require('dotenv').config();
const DB = require("./model/db");
const path = require("path");
const UserRoutes = require("./Routes/UserRoutes") 


const Port = process.env.PORT
DB();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.set("view engine","ejs");
app.set('views', path.join(__dirname, 'views'));
app.use(express.static("public"))






app.use("/",UserRoutes)


app.listen(Port,()=>{
    console.log(`Server Running ${process.env.PORT}`);
})