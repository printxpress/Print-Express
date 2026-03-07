import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    files: [{
        url: String,
        originalName: String,
        fileType: String,
        pageCount: Number
    }],
    printOptions: [{
        fileIndex: { type: Number, default: 0 },
        mode: { type: String, enum: ['B/W', 'Color'] },
        side: { type: String, enum: ['Single', 'Double'] },
        paperSize: { type: String, enum: ['A4', 'A3'], default: 'A4' },
        copies: { type: Number, default: 1 },
        binding: { type: String, enum: ['Loose Papers', 'Spiral', 'Staple', 'Hard', 'Chart'], default: 'Loose Papers' },
        bindingQuantity: { type: Number, default: 1 },
        pagesPerSheet: { type: Number, default: 1 },
        orientation: { type: String, default: 'Portrait' },
        layout: { type: String, default: 'Full' },
        pageRangeType: { type: String, default: 'All' },
        customPages: { type: String, default: '' },
        notes: { type: String, default: '' },
        price: { type: Number, default: 0 }
    }],
    pricing: {
        printingCharge: Number,
        bindingCharge: Number,
        deliveryCharge: Number,
        couponDiscount: { type: Number, default: 0 },
        walletUsed: { type: Number, default: 0 },
        totalAmount: Number
    },
    fulfillment: {
        method: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
        pickupLocation: { type: String }
    },
    deliveryDetails: {
        pincode: String,
        address: String,
        district: String,
        state: String,
        landmark: String,
        phone: String
    },
    status: {
        type: String,
        enum: ['received', 'printing', 'ready', 'delivered', 'picked_up', 'cancelled', 'failed'],
        default: 'received'
    },
    payment: {
        method: { type: String, enum: ['UPI', 'COD', 'Wallet', 'UPI+Wallet', 'RAZORPAY'] },
        isPaid: { type: Boolean, default: false },
        transactionId: String,
        razorpayOrderId: String,
        razorpayPaymentId: String,
        razorpaySignature: String
    },
    couponCode: { type: String },
    whatsappSent: { type: Boolean, default: false },
    trackingDetails: {
        courierName: String,
        trackingNumber: String,
        updatedAt: Date
    },
    displayId: { type: String, unique: true }
}, { timestamps: true });

const Order = mongoose.models.order || mongoose.model('order', orderSchema);

export default Order;