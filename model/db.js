const mongoose = require("mongoose");
const env = require("dotenv").config();



const ConnectDB = async()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
            console.log('MongoDB Connected');
      
    } catch (error) {
        console.log('MongoDB not connected',error.message);
        process.exit(1);
    }
}

module.exports= ConnectDB;