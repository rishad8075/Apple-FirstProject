// File: Routes/user/walletRoutes.js
const express = require('express');
const router = express.Router();
const walletController = require('../../Controllers/User/walletController');
const auth = require("../../middleware/UserAuth");

router.get('/wallet', auth, walletController.getWalletPage);
router.post('/wallet/add-balance/create-order', auth, walletController.createOrder);
router.post('/wallet/add-balance/verify-payment', auth, walletController.verifyPayment);
router.post('/wallet/use-wallet', walletController.useWalletForOrder)


module.exports = router;
