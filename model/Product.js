const mongoose = require("mongoose");
const { Schema } = mongoose;

const VariantSchema = new Schema({
  attributes: { type: Map, of: String },  // dynamic variant attributes
  regularPrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },
  productOffer: { type: Number, default: 0 },
  stock: { type: Number, required: true },
  images: { type: [String], required: true }
}, { _id: true });

const ProductSchema = new Schema({
  productName: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  variants: [VariantSchema],
  isBlocked: { type: Boolean, default: false },
 categoryOffer: { type: Number, default: 0 },
  status: { type: String, enum: ["Available", "Out of Stock", "Discontinued"], default: "Available" },
}, { timestamps: true });

module.exports = mongoose.model("Product", ProductSchema);

