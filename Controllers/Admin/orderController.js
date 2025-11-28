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

const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId || !status) return res.json({ success: false, message: 'orderId and status required' });

    const order = await Orders.findById(orderId);
    if (!order) return res.json({ success: false, message: 'Order not found' });

    
    if (status === 'Cancelled' && order.status !== 'Cancelled') {
      
      for (let item of order.orderItems) {
        if (item.status !== 'Cancelled') {
          
          try {
            await Product.findByIdAndUpdate(item.productId, { $inc: { 'variants.$[v].stock': item.quantity } }, {
              arrayFilters: [{ 'v.images': { $exists: true } }], 
              new: true
            });
          } catch (e) {
          
            console.log('Variant stock update fallback for product', item.productId);
          }
          item.status = 'Cancelled';
          item.cancellationReason = req.body.reason || 'Cancelled by Admin';
        }
      }
      order.status = 'Cancelled';
    } else {
     
      order.status = status;
      if(order.orderItems.length==1){
        order.orderItems[0].status=status
      }

      
      if (status === 'Delivered') {
        order.orderItems.forEach(it => {
          it.status = 'Delivered';
        });
      } else if (status === 'Shipped' || status === 'Out for Delivery' || status === 'Pending' || status === 'Confirmed') {
      
        order.orderItems.forEach(it => {
          if (it.status === 'Ordered' || it.status === 'Pending') it.status = status;
        });
      }
    }

    await order.save();
    return res.json({ success: true, message: 'Order status updated' });
  } catch (err) {
    console.error('updateOrderStatusAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
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



module.exports = {
  listOrdersAdmin,
  orderDetailAdmin,
  updateOrderStatusAdmin,
  cancelProductAdmin,
  
  }
