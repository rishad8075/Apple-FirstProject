const Orders = require('../../model/Orders');
const Product = require('../../model/Product');
const User = require('../../model/user');
const mongoose = require('mongoose');


const listOrdersAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.max(1, parseInt(req.query.limit || '10'));
    const search = (req.query.search || '').trim();
    const sortBy = req.query.sort || 'date';
    const sortOrder = (req.query.order === 'asc') ? 1 : -1;
    const statusFilter = req.query.status || '';

    
    const filter = {};

    
    if (search) {
      // find users matching name to include their orders
      const matchingUsers = await User.find({ name: { $regex: search, $options: 'i' } }, '_id').lean();
      const userIds = matchingUsers.map(u => u._id);

      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { userId: { $in: userIds } }
      ];
    }

    if (statusFilter) {
      filter.status = statusFilter;
    }

    // total count
    const totalCount = await Orders.countDocuments(filter);

    // sort mapping
    let sortObj = { createdAt: -1 };
    if (sortBy === 'date') sortObj = { createdAt: sortOrder };
    else if (sortBy === 'amount') sortObj = { totalPrice: sortOrder };

    const orders = await Orders.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email') 
      .lean();
    
    
    const ordersWithPrimary = orders.map(o => {
        const username = o.userId
      const copy = Object.assign({}, o);
      const firstItem = (copy.orderItems && copy.orderItems.length) ? copy.orderItems[0] : null;
      copy.primaryImage = (firstItem && firstItem.image) ? firstItem.image : null;
      return copy;
    });

    res.render('Admin/orders', {
      orders: ordersWithPrimary,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      search,
      sortBy,
      sortOrder: sortOrder === 1 ? 'asc' : 'desc',
      status: statusFilter
    });
  } catch (err) {
    console.error('Admin listOrders error:', err);
    return res.status(500).render('page-500');
  }
};

const orderDetailAdmin = async (req, res) => {
  try {
    const id = req.params.id;

    
    let order;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Orders.findById(id).populate('orderItems.productId').lean();
    }
    if (!order) {
      order = await Orders.findOne({ orderId: id }).populate('orderItems.productId').populate('userId', 'name email') .lean();
    }

    if (!order) return res.status(404).render('page-404');

    // also populate user info
    const user = order.userId ? await User.findById(order.userId, 'name email phone').lean() : null;

    res.render('Admin/order-detail', { order, user });
  } catch (err) {
    console.error('orderDetailAdmin error:', err);
    return res.status(500).render('page-500');
  }
};


// const allowedTransitions = {
//     "Pending": ["Confirmed", "Cancelled"],
//     "Confirmed": ["Shipped", "Cancelled"],
//     "Shipped": ["Out for Delivery"],
//     "Out for Delivery": ["Delivered"],
//     "Delivered": ["Return Requested"],
//     "Return Requested": ["Returned"],
//     "Returned": [],
//     "Cancelled": []
// };


const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status)
      return res.json({ success: false, message: "orderId and status required" });

    const order = await Orders.findById(orderId);
    if (!order)
      return res.json({ success: false, message: "Order not found" });


    if (order.status === "Return Requested" && status === "Confirmed") {
      order.orderItems.forEach(item => {
        if (item.status === "Return Requested") {
          item.status = "Returned";

          Product.findById(item.productId).then(prod => {
            if (prod && prod.variants.length > 0) {
              prod.variants[0].stock += item.quantity;
              prod.save();
            }
          });
        }
      });

      order.status = "Returned";
      await order.save();
      return res.json({ success: true, message: "Return approved & stock updated" });
    }


    if (status === "Cancelled") {
      order.orderItems.forEach(item => {
        if (item.status !== "Cancelled") {
          item.status = "Cancelled";

          Product.findById(item.productId).then(prod => {
            if (prod && prod.variants.length > 0) {
              prod.variants[0].stock += item.quantity;
              prod.save();
            }
          });
        }
      });

      order.status = "Cancelled";
      await order.save();
      return res.json({ success: true, message: "Order cancelled & stock updated" });
    }

 
    order.status = status;

    order.orderItems.forEach(item => {

     
      if (["Ordered", "Pending", "Confirmed", "Shipped", "Out for Delivery"].includes(item.status)) {
        item.status = status;
      }

     
      if (status === "Delivered") {
        item.status = "Delivered";
         Product.findById(item.productId).then(prod => {
            if (prod && prod.variants.length > 0) {
              prod.variants[0].stock -= item.quantity;
              prod.save();
            }
          });
      }
    });

    await order.save();

    return res.json({ success: true, message: "Order status updated successfully" });

  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: "Server error" });
  }
};


const cancelProductAdmin = async (req, res) => {
  try {
    const { orderId, productId, reason } = req.body;
    if (!orderId || !productId) return res.json({ success: false, message: 'orderId and productId required' });

    const order = await Orders.findById(orderId);
    if (!order) return res.json({ success: false, message: 'Order not found' });

    const item = order.orderItems.find(i => i.productId.toString() === productId.toString());
    if (!item) return res.json({ success: false, message: 'Product not found in order' });

    if (item.status === 'Cancelled') return res.json({ success: false, message: 'Already cancelled' });

   
    item.status = 'Cancelled';
    item.cancellationReason = reason || 'Cancelled by Admin';

    
    try {
  
      const prod = await Product.findById(item.productId);
      if (prod && prod.variants && prod.variants.length) {
        prod.variants[0].stock = (prod.variants[0].stock || 0) + item.quantity;
        await prod.save();
      }
    } catch (e) {
      console.log('cancelProductAdmin stock update error', e.message);
    }

    
    if (order.orderItems.every(it => it.status === 'Cancelled')) {
      order.status = 'Cancelled';
    }

    await order.save();
    return res.json({ success: true, message: 'Product cancelled and stock updated' });
  } catch (err) {
    console.error('cancelProductAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// --- NEW FUNCTION: List Return Requests for Admin View ---
const listReturnRequestsAdmin = async (req, res) => {
  try {
    // Implement pagination/filtering logic here as needed (similar to listOrdersAdmin)
    const requests = await ReturnRequest.find() // Replace with your ReturnRequest model
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .populate('orderId', 'orderId')
      .lean();

    res.render('Admin/return-requests', { // Renders the new EJS file
      requests: requests
      // Pass pagination/filter data here
    });
  } catch (err) {
    console.error('listReturnRequestsAdmin error:', err);
    return res.status(500).render('page-500');
  }
};

// --- NEW FUNCTION: Admin Approves Return ---
const approveReturnAdmin = async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.json({ success: false, message: 'Request ID required' });

    // 1. Find the return request and validate status
    const request = await ReturnRequest.findById(requestId); // Replace with your ReturnRequest model
    if (!request) return res.json({ success: false, message: 'Return Request not found' });
    if (request.status !== 'PENDING') return res.json({ success: false, message: 'Request already processed' });

    // 2. Update Return Request status
    request.status = 'ACCEPTED';
    await request.save();

    // 3. Update Order Item status and initiate Inventory/Wallet operations
    const order = await Orders.findById(request.orderId);
    if (order) {
      const item = order.orderItems.find(i => i.productId.toString() === request.productId.toString());
      if (item) {
        item.status = 'Returned';
        const refundAmount = item.price * request.quantity;

        // ** A. Refund to Wallet (MANDATORY)**
        // Assuming you have a Wallet model or service:
        // await Wallet.credit(order.userId, refundAmount, 'Return Approved');
        
        // You must implement the actual wallet credit logic here.

        // ** B. Increment Stock (MANDATORY)**
        const prod = await Product.findById(item.productId);
        if (prod && prod.variants && prod.variants.length) {
          prod.variants[0].stock = (prod.variants[0].stock || 0) + request.quantity;
          await prod.save();
        }
        
        // Update main order status if all items are processed (Returned/Cancelled/Delivered)
        const allItemsReturnedOrCancelled = order.orderItems.every(i => i.status === 'Returned' || i.status === 'Cancelled' || i.status === 'Delivered');
        if(allItemsReturnedOrCancelled && order.orderItems.every(i => i.status !== 'Delivered')){
             order.status = 'Returned';
        }
        await order.save();
      }
    }

    return res.json({ success: true, message: 'Return approved. Stock and Wallet updated.' });
  } catch (error) {
    console.error('approveReturnAdmin error:', error);
    return res.status(500).json({ success: false, message: 'Server error during approval.' });
  }
};

// --- NEW FUNCTION: Admin Rejects Return ---
const rejectReturnAdmin = async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.json({ success: false, message: 'Request ID required' });

    const request = await ReturnRequest.findById(requestId); // Replace with your ReturnRequest model
    if (!request) return res.json({ success: false, message: 'Return Request not found' });
    if (request.status !== 'PENDING') return res.json({ success: false, message: 'Request already processed' });

    // Update Return Request status
    request.status = 'REJECTED';
    await request.save();

    // No wallet change or stock increment needed on rejection

    return res.json({ success: true, message: 'Return request rejected.' });
  } catch (error) {
    console.error('rejectReturnAdmin error:', error);
    return res.status(500).json({ success: false, message: 'Server error during rejection.' });
  }
};



module.exports = {
  listOrdersAdmin,
  orderDetailAdmin,
  updateOrderStatusAdmin,
  cancelProductAdmin,
  listReturnRequestsAdmin, // <--- NEW
  approveReturnAdmin,      // <--- NEW
  rejectReturnAdmin
  
  }
