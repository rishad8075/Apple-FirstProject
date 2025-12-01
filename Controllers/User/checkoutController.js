
const Address = require("../../model/address");
const Cart = require("../../model/Cart");
const Product = require("../../model/Product");
const User = require("../../model/user");
const Orders = require("../../model/Orders");
const { v4: uuidv4 } = require("uuid");// for unique id

const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.userId;

    const user = await User.findById(userId);

    
    const addresses = await Address.find({ user: userId }).lean();

    
     const cart = await Cart.findOne({ userId })
      .populate("items.productId"); 

    if (!cart) return res.redirect("/cart");

    const items = cart.items.map(item => {

     
      const product = item.productId;
      const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());

      return {
        name: product.productName,
        image: variant?.images?.[0] || "/images/no-image.png",
        qty: item.quantity,
        price: variant.salePrice || variant.regularPrice,
        total: (variant.salePrice || variant.regularPrice) * item.quantity
      };
    });

      const subtotal = items.reduce((acc, item) => acc + item.total, 0);

    
    const tax = (subtotal*18)/100
    const shipping = 70;
   

    const couponDiscount = 0;

    const grandTotal = subtotal + tax + shipping - couponDiscount;

    res.render("User/checkout", {
        user,
        addresses,
      items,
      subtotal,
      tax,
      shipping,
    
      couponDiscount,
      total: grandTotal
    });

  } catch (err) {
    console.log("Checkout Error:", err);
    res.status(500).render("page-404");
  }
};





const checkoutAdd_Address = async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) return res.redirect('/login');

        const userAddresses = await Address.find({ user: userId });

        res.render("User/addAddress", {
            user: userId,
            addresses: userAddresses,
            activeLink: 'profile'
        });

    } catch (error) {
        console.error(error);
        res.render("page-404");
    }
};

//   Add Address
const checkoutAddAddress = async (req, res) => { 
    try {
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not logged in" });
        }

        const { fullname, email, mobile, houseName, locality, pincode, district, state, isDefault } = req.body;

        
        if (!fullname || !email || !mobile || !houseName || !locality || !pincode || !district || !state) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        
        const existingAddresses = await Address.find({ user: userId });

        
        let defaultFlag = false;
        if (existingAddresses.length === 0) {
            defaultFlag = true; 
        } else if (isDefault) {
            // If user checked "set as default", unset previous default
            await Address.updateMany({ user: userId, isDefault: true }, { $set: { isDefault: false } });
            defaultFlag = true;
        }

        const newAddress = new Address({
            user: userId,
            fullname,
            email,
            mobile,
            houseName,
            locality,
            pincode,
            district,
            state,
            isDefault: defaultFlag
        });

        await newAddress.save();

        res.json({ success: true, message: "New address added successfully", address: newAddress });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};



const placeOrderCOD = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.addressId;

       

        const cart = await Cart.findOne({ userId: userId }).populate("items.productId");
        if (!cart || cart.items.length === 0) return res.redirect("/cart");

        const addressDoc = await Address.findById(addressId);
        if (!addressDoc) return res.redirect("/checkout");

        const orderItems = cart.items.map(item => {
            const product = item.productId;
            const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
            const price = variant.salePrice || variant.regularPrice;
            const subtotal = price * item.quantity;
            const tax = (subtotal * 18) / 100;

            return {
                productId: product._id,
                name: product.productName,
                image: variant.images[0] || "/images/no-image.png",
                quantity: item.quantity,
                price,
                subtotal,
                tax,
            };
        });

        const subtotal = orderItems.reduce((acc, i) => acc + i.subtotal, 0);
        const tax = orderItems.reduce((acc, i) => acc + i.tax, 0);
        const shippingCharge = 70;
        const totalPrice = subtotal + tax + shippingCharge;

        const order = new Orders({
            orderId: uuidv4(),
            userId,
            orderItems,
            address: {
                fullName: addressDoc.fullname,
                phone: addressDoc.mobile,
                street: addressDoc.houseName + ", " + addressDoc.locality,
                city: addressDoc.district,
                state: addressDoc.state,
                postalCode: addressDoc.pincode,
                country: "India",
                isDefault: addressDoc.isDefault
            },
            paymentMethod: "COD",
            shippingCharge,
            totalPrice
        });

        await order.save();
          for(const item of order.orderItems){
                    await Product.updateOne(
                        { _id: item.productId },
                        { $inc: { 'variants.0.stock': -item.quantity } } // assuming first variant if no variantId
                    );
                }
      
        await Cart.deleteMany({ userId: userId });

        res.redirect(`/order-success/${order._id}`);
    } catch (err) {
        console.error("Place Order Error:", err);
        res.status(500).render("page-500");
    }
};


const orderSuccessPage = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Orders.findById(orderId);
        const user = await User.findById(order.userId)

        if (!order) return res.redirect("/");

        res.render("User/order-success", { order,user });
    } catch (err) {
        console.error(err);
        res.redirect("/");
    }
};










module.exports ={
    getCheckoutPage,
    checkoutAdd_Address,
    checkoutAddAddress,
    placeOrderCOD,
    orderSuccessPage,
}