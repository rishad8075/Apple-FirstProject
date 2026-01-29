const Product = require('../../model/Product'); 
const Cart = require('../../model/Cart');  
const Category = require("../../model/category")  
const Wishlist = require("../../model/wishlist");
const User = require("../../model/user");
const mongoose = require("mongoose");
const { calculateFinalPrice } = require('../../utils/priceHelper');


const addToCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId, variantId, quantity } = req.body;
    const Quantity = Number(quantity);


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

  
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }
      const priceData = calculateFinalPrice({
      salePrice: variant.salePrice,
      productOffer: variant.productOffer,
      categoryOffer: product.categoryOffer|| 0
    });

    
    const existingItem = cart.items.find(
      item => item.productId.equals(productId) && item.variantId.equals(variantId)
    );

    if (existingItem) {
    
      const newQty = existingItem.quantity + Quantity;
      if (newQty > variant.stock) {
        return res.json({ success: false, message: "Cannot exceed stock limit" });
      }
      existingItem.quantity = newQty;
    existingItem.price = priceData.finalPrice;
      existingItem.offer = priceData.appliedOffer;
      existingItem.OriginalPrice=variant.regularPrice||variant.salePrice

    } else {
      cart.items.push({
        productId,
        variantId,
        quantity: Quantity,
        OriginalPrice:variant.regularPrice||variant.salePrice,
        price: priceData.finalPrice,
        offer: priceData.appliedOffer
      });
    }
    await cart.save();

    return res.json({ success: true, message: "Added to cart", cart });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getCart = async (req, res,next) => {
  try {
    const userId = req.session.userId;
    const userData = await User.findById(userId)

    const cart = await Cart.findOne({ userId }).lean();

    let items = [];
    let subtotal = 0;

    if (cart && cart.items.length > 0) {
      const itemsWithDetails = await Promise.all(
        cart.items.map(async item => {
          const product = await Product.findById(item.productId).lean();
          if (!product) return null; 

         
          if (product.isBlocked) return null;

        
          const category = await Category.findById(product.category).lean();
          if (!category || !category.isListed) return null; 

          const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
          if (!variant) return null;
            const priceData = calculateFinalPrice({
      salePrice: variant.salePrice,
      productOffer: variant.productOffer,
      categoryOffer: product.categoryOffer|| 0
    });

          const isOutOfStock = variant.stock === 0;

          const itemSubtotal = item.price * item.quantity;
          subtotal += itemSubtotal;

          return {
            productId: item.productId,
            variantId: item.variantId,
            name: product.productName,
            image: variant.images[0] || '/uploads/product-images/default.png',
            price: item.price,
            quantity: item.quantity,
            subtotal: itemSubtotal,
            stock: variant.stock,
            offer: item.offer,
            isOutOfStock
          };
        })
      );

      items = itemsWithDetails.filter(i => i !== null);
    }

    res.render('User/cart', { user:userData,items, subtotal });
  } catch (err) {
    console.error(err);
    res.render('User/cart', { items: [], subtotal: 0, error: err.message });
  }
};




const updateQuantity = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId, quantity } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.json({ success: false, message: "Cart not found" });

    const prodId = new mongoose.Types.ObjectId(productId);
    const item = cart.items.find(i => i.productId.equals(prodId));
    if (!item) return res.json({ success: false, message: "Item not in cart" });

    // Get product & variant
    const product = await Product.findById(prodId);
    if (!product) return res.json({ success: false, message: "Product not found" });

    const variant = product.variants.id(item.variantId);
    if (!variant) return res.json({ success: false, message: "Variant not found" });

 
    if (quantity > item.quantity && quantity > variant.stock) {
  return res.json({ 
    success: false, 
    message: `Cannot exceed stock limit (${variant.stock})`,
    item: { ...item._doc, quantity: item.quantity }
  });
}


    const MAX_LIMIT = variant.maxQtyPerUser || 5;
    if (quantity > MAX_LIMIT) {
      return res.json({
        success: false,
        message: `You can only buy up to ${MAX_LIMIT} units of this product`,
        item: { ...item._doc, quantity: item.quantity }
      });
    }

    
    item.quantity = quantity;
    await cart.save();

    //  Calculate totals 
    const itemSubtotal = item.price * item.quantity;
    const cartSubtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return res.json({
      success: true,
      item: { ...item._doc, subtotal: itemSubtotal },
      cart: { subtotal: cartSubtotal, total: cartSubtotal } 
    });

  } catch (err) {
    console.error("Update quantity error:", err);
    return res.status(500).json({ success: false, message: err.message });
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


const addToCartFromWishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { productId } = req.body;
        const quantity = 1;

        if (!userId) {
            return res.json({ success: false, message: "User not logged in" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.json({ success: false, message: "Product not found" });
        }

       
        if (!product.variants || product.variants.length === 0) {
            return res.json({ success: false, message: "Product has no variants" });
        }

        const defaultVariant = product.variants[0]; 
        const variantId = defaultVariant._id;
        const price = defaultVariant.salePrice;
        const originalPrice = defaultVariant.salePrice || defaultVariant.regularPrice ;

        
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({
                userId,
                items: [{
                    productId,
                    variantId,
                    quantity,
                    price,
                    OriginalPrice: originalPrice
                }]
            });
        } else {
            const existingItem = cart.items.find(
                item =>
                    item.productId.toString() === productId &&
                    item.variantId.toString() === variantId.toString()
            );

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.items.push({
                    productId,
                    variantId,
                    quantity,
                    price,
                    OriginalPrice: originalPrice
                });
            }
        }

        await cart.save();

        // 2️⃣ REMOVE FROM WISHLIST
        await Wishlist.updateOne(
            { userId },
            { $pull: { products: { productId } } }
        );

        return res.json({
            success: true,
            message: "Product added to cart (default variant) & removed from wishlist"
        });

    } catch (error) {
        console.error("Add-from-wishlist error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};







module.exports = { 
    addToCart,
    getCart,
    updateQuantity,
    removeItem,
    addToCartFromWishlist

 };
