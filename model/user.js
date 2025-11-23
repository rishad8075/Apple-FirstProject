const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },

    phoneNumber: {
      type: String,
      default: null
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    password: {
      type: String,
    },
 
    addresses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Address"
      }
    ],

    isBlocked: {
      type: Boolean,
      default: false
    },

    isAdmin: {
      type: Boolean,
      default: false
    },

    cart: {
      type: Array
    },

    wallet: {
      type: Number,
      default: 0,
    },
     profileImage: {
      type: String,          
      default: '/images/user-default.png' 
    },

    wishlist: [
      {
        type: Schema.Types.ObjectId,
        ref: "Wishlist"
      }
    ],

    orderHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Order"
      }
    ],

    createdOn: {
      type: Date,
      default: Date.now,
    },
  },
);

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function (Password) {
  return await bcrypt.compare(Password, this.password);
};

module.exports = mongoose.model('User', userSchema);
