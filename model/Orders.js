const mongoose = require('mongoose');
const { Schema } = mongoose;

const OrdersSchema = new Schema({
  orderId: { type: String, required: true, unique: true }, // custom unique orderID
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum:  ["Pending", "Confirmed", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned"], default: 'Pending' },
  orderItems: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    image: String,
    quantity: Number,
    price: Number,
    subtotal: Number,
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    status: { type: String, enum: ["Pending", "Confirmed", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned"], default: 'Ordered' },
    cancellationReason: { type: String, default: null },
    returnReason: { type: String, default: null }
  }],
  address: {
    fullName: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    isDefault: { type: Boolean, default: false }
  },
  coupon: { type: String, default: null },
  paymentMethod: { type: String, enum: ['COD', 'Online'], default: 'COD' },
  shippingCharge: { type: Number, default: 0 },
  totalPrice: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Orders', OrdersSchema);
