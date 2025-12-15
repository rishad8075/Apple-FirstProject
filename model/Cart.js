const mongoose = require("mongoose");
const { Schema } = mongoose;

const CartItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  variantId: { type: Schema.Types.ObjectId, required: true }, // each variant has its own _id
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true } ,
  OriginalPrice: { type: Number, required: true } ,
  offer: { type: Number, default: 0 },
});

const CartSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  items: [CartItemSchema],
}, { timestamps: true });

const Cart = mongoose.model("Cart", CartSchema);
module.exports = Cart;
