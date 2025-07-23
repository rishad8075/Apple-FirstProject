const express = require("express");
const app = express();
const env = require('dotenv').config();
const DB = require("./model/db");




DB();





app.listen(process.env.PORT,()=>{
    console.log(`Server Running ${process.env.PORT}`)
})