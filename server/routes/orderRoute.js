import express from 'express';
import {
    getAllOrders,
    getUserOrders,
    placePrintOrder,
    placeOrder,
    updateOrderStatus,
    createPosOrder,
    cleanupOldFiles,
    updateOrderAndRecalculate,
    generateThermalBillPDF,
    generateRazorpayLink,
    createRazorpayOrder,
    verifyRazorpayPayment,
    downloadCustomerFile,
    deleteOrder,
    refundOrderWallet,
    verifyRazorpayLink,
    markOrderAsPaid,
    markUserOrdersAsPaid
} from '../controllers/orderController.js';
import authUser from '../middlewares/authUser.js';
import authSeller from '../middlewares/authSeller.js';
import { upload } from '../configs/multer.js';

const orderRouter = express.Router();

orderRouter.post('/print', upload.array('files'), authUser, placePrintOrder);
orderRouter.post('/place', authUser, placeOrder);
orderRouter.get('/user', authUser, getUserOrders);
orderRouter.post('/pos', authSeller, createPosOrder);
orderRouter.get('/all', authSeller, getAllOrders);
orderRouter.post('/update-status', authSeller, updateOrderStatus);
orderRouter.post('/edit/:orderId', authSeller, updateOrderAndRecalculate);
orderRouter.post('/delete/:orderId', authSeller, deleteOrder);
orderRouter.post('/refund-wallet/:orderId', authSeller, refundOrderWallet);
orderRouter.post('/mark-paid/:orderId', authSeller, markOrderAsPaid);
orderRouter.post('/mark-user-paid/:userId', authSeller, markUserOrdersAsPaid);
orderRouter.get('/thermal-bill/:orderId', generateThermalBillPDF);
orderRouter.post('/payment-link/:orderId', authUser, generateRazorpayLink);
orderRouter.get('/download-file', authSeller, downloadCustomerFile);
orderRouter.delete('/cleanup', authSeller, cleanupOldFiles);

// Razorpay Routes
orderRouter.post('/razorpay-order', authUser, createRazorpayOrder);
orderRouter.post('/razorpay-verify', authUser, verifyRazorpayPayment);
orderRouter.post('/verify-link', authUser, verifyRazorpayLink);

export default orderRouter;