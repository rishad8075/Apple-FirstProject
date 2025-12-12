const mongoose = require("mongoose");
const { Schema } = mongoose;

const VariantSchema = new Schema({
  attributes: { type: Map, of: String },  
  regularPrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },

  
  productOffer: { type: Number, default: 0 }, 
  productOfferPrice: { type: Number, default: 0 },   

  stock: { type: Number, required: true },
  images: { type: [String], required: true }
}, { _id: true });

const ProductSchema = new Schema({
  productName: { type: String, required: true },
  description: { type: String, required: true },

  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },

  variants: [VariantSchema],

  isBlocked: { type: Boolean, default: false },
  status: { type: String, enum: ["Available", "Out of Stock", "Discontinued"], default: "Available" },

  categoryOffer: { type: Number, default: 0 }
}, { timestamps: true });

//  Helper method to compute best offer for a variant
ProductSchema.methods.getBestOfferPrice = function(variantIndex) {
  const variant = this.variants[variantIndex];
  const basePrice = variant.salePrice || variant.regularPrice;

  const productOffer = variant.productOffer || 0;
  const categoryOffer = this.categoryOffer || 0;

  // Pick maximum offer
  const bestOffer = Math.max(productOffer, categoryOffer);

  const discountAmount = (basePrice * bestOffer) / 100;
  return {
    finalPrice: Math.round(basePrice - discountAmount),
    bestOffer
  };
};

module.exports = mongoose.model("Product", ProductSchema);
