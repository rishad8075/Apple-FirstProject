const Product = require('../../model/Product'); 
const Cart = require('../../model/Cart');  
const Category = require("../../model/category")    
const mongoose = require("mongoose");


const addToCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId, variantId, quantity } = req.body;
    const Quantity = Number(quantity);

    // 1. Find product and variant
    const product = await Product.findById(productId);
    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.json({ success: false, message: "Variant not found" });
    }

    if (variant.stock < Quantity) {
      return res.json({ success: false, message: "Insufficient stock" });
    }

    // 2. Find or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // 3. Check if this product + variant already exists in cart
    const existingItem = cart.items.find(
      item => item.productId.equals(productId) && item.variantId.equals(variantId)
    );

    if (existingItem) {
      // Increase quantity but validate stock
      const newQty = existingItem.quantity + Quantity;
      if (newQty > variant.stock) {
        return res.json({ success: false, message: "Cannot exceed stock limit" });
      }
      existingItem.quantity = newQty;
      existingItem.price = variant.salePrice; // update price if changed
    } else {
      // Add new item
      cart.items.push({
        productId,
        variantId,
        quantity,
        price: variant.salePrice
      });
    }

    await cart.save();

    return res.json({ success: true, message: "Added to cart", cart });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: err.message });
  }
};

const getCart = async (req, res) => {
  try {
    const userId = req.session.userId;

    const cart = await Cart.findOne({ userId }).lean();

    let items = [];
    let subtotal = 0;

    if (cart && cart.items.length > 0) {
      const itemsWithDetails = await Promise.all(
        cart.items.map(async item => {
          const product = await Product.findById(item.productId).lean();
          if (!product) return null; // product deleted

          // Skip blocked products
          if (product.isBlocked) return null;

          // Fetch the category of the product
          const category = await Category.findById(product.category).lean();
          if (!category || !category.isListed) return null; // skip if category is unlisted

          const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
          if (!variant) return null;

          const isOutOfStock = variant.stock === 0;

          const itemSubtotal = variant.salePrice * item.quantity;
          subtotal += itemSubtotal;

          return {
            productId: item.productId,
            variantId: item.variantId,
            name: product.productName,
            image: variant.images[0] || '/uploads/product-images/default.png',
            price: variant.salePrice,
            quantity: item.quantity,
            subtotal: itemSubtotal,
            stock: variant.stock,
            isOutOfStock
          };
        })
      );

      items = itemsWithDetails.filter(i => i !== null);
    }

    res.render('User/cart', { items, subtotal });
  } catch (err) {
    console.error(err);
    res.render('User/cart', { items: [], subtotal: 0, error: err.message });
  }
};




const updateQuantity = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId, quantity } = req.body;

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.json({ success: false, message: "Cart not found" });

    const item = cart.items.find(i => i.productId.equals(productId));
    if (!item) return res.json({ success: false, message: "Item not found in cart" });

    // Check stock
    const product = await Product.findById(productId);
    const variant = product.variants.id(item.variantId);
    if (quantity > variant.stock) return res.json({ success: false, message: "Cannot exceed stock limit" });

    item.quantity = quantity;
    await cart.save();

    // Calculate item subtotal and cart subtotal
    const itemSubtotal = item.price * item.quantity;
    const cartSubtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return res.json({ success: true, item: { ...item.toObject(), subtotal: itemSubtotal }, cart: { subtotal: cartSubtotal } });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: err.message });
  }
};

// Remove Item
const removeItem = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId } = req.body;

    let cart = await Cart.findOne({ userId });
    if (!cart) return res.json({ success: false, message: "Cart not found" });

    // Remove item
    cart.items = cart.items.filter(i => !i.productId.equals(productId));
    await cart.save();

    // Calculate subtotal
    const cartSubtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return res.json({ success: true, cart: { subtotal: cartSubtotal, total: cartSubtotal } });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: err.message });
  }
};







module.exports = { 
    addToCart,
    getCart,
    updateQuantity,
    removeItem,

 };
