const mongoose = require("mongoose");
const { Schema } = mongoose;

const ProductSchema = new Schema({
  productName: { type: String, required: true, index: "text" },
  description: { type: String, required: true },
      category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  regularPrice: { type: Number, required: true },
  salePrice: { type: Number, required: true }, 
  productOffer: { type: Number, default: 0 },
  Color: { type: String, required: true },
  storage: { type: String, required: true, enum: ["128GB", "256GB", "512GB", "1TB"] },
  attributes: { type: Map, of: String },
  stock: { type: Number, required: true },
  image: { type: [String], required: true },
  isBlocked: { type: Boolean, default: false },
  status: { type: String, enum: ["Available", "Out of Stock", "Discontinued"], default: "Available" },
}, { timestamps: true });




module.exports = mongoose.model("Product", ProductSchema);
