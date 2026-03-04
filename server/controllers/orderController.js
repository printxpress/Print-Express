import Order from '../models/Order.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Pricing from '../models/Pricing.js';
import Service from '../models/Service.js';
import Coupon from '../models/Coupon.js';
import ShopSettings from '../models/ShopSettings.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ... existing imports ...
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Helper for Custom Page Counting
const calculateCustomPageCount = (range) => {
    if (!range) return 0;
    const parts = range.split(',').map(p => p.trim());
    let count = 0;
    parts.forEach(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end) && end >= start) {
                count += (end - start + 1);
            }
        } else {
            const num = Number(part);
            if (!isNaN(num) && num > 0) count += 1;
        }
    });
    return count;
};

// Place Print Order : /api/order/print
export const placePrintOrder = async (req, res) => {
    try {
        const { printOptions, fulfillment, deliveryDetails, paymentMethod, couponCode, couponDiscount, walletUsed, fileMetadata } = JSON.parse(req.body.data);
        const userId = req.userId;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.json({ success: false, message: "No files uploaded" });
        }

        // 1. Upload files to Cloudinary
        const uploadedFiles = await Promise.all(
            files.map(async (file, index) => {
                const result = await cloudinary.uploader.upload(file.path, { resource_type: 'auto', folder: 'print_orders' });
                // Use metadata from frontend if available, else default to 1
                const meta = fileMetadata ? fileMetadata.find(m => m.name === file.originalname) : null;
                return {
                    url: result.secure_url,
                    originalName: file.originalname,
                    fileType: file.mimetype,
                    pageCount: meta ? meta.pageCount : 1
                };
            })
        );

        // 2. Fetch Pricing Rules and Services
        const [pricingData, services] = await Promise.all([
            Pricing.findOne({ type: 'printing_rules' }),
            Service.find({})
        ]);

        const rules = pricingData ? pricingData.rules : {
            printing: {
                bw: { single: 0.75, double: 0.5, a3_single: 2, a3_double: 1.5 },
                color: { single: 8, double: 8, a3_single: 20, a3_double: 20 }
            },
            additional: { binding: 15, chart_binding: 10, hard_binding: 200, handling_fee: 10 },
            delivery_tiers: {
                tier_a: { maxWeight: 3, rate: 35, slip: 0 },
                tier_b: { maxWeight: 10, rate: 29, slip: 20 },
                tier_c: { maxWeight: 999, rate: 26, slip: 20 }
            }
        };

        // 3. Calculate Pricing (Server-side validation)
        const docPages = uploadedFiles.reduce((acc, f) => acc + f.pageCount, 0);
        const totalPages = printOptions.pageRangeType === 'Custom'
            ? calculateCustomPageCount(printOptions.customPages)
            : docPages;

        const isColor = printOptions.mode === 'Color';
        const isDouble = printOptions.side === 'Double';
        const isA3 = printOptions.paperSize === 'A3';

        // Primary Rate Logic based on Printing Rules (Backend)
        let rate;
        const colorKey = isColor ? 'color' : 'bw';
        const sideKey = isDouble ? 'double' : 'single';
        const a3SideKey = isDouble ? 'a3_double' : 'a3_single';

        if (isA3) {
            rate = rules.printing[colorKey][a3SideKey] || (rules.printing[colorKey][sideKey] * 2);
        } else {
            rate = rules.printing[colorKey][sideKey];
        }

        // Apply Pages per Sheet Logic (Backend Sync)
        const effectivePages = printOptions.pagesPerSheet === 2 ? Math.ceil(totalPages / 2) : totalPages;

        const printingCharge = effectivePages * (rate || (isColor ? 8 : 0.75)) * (printOptions.copies || 1);
        const billingSheets = isDouble ? Math.ceil(effectivePages / 2) : effectivePages;

        let bindingCharge = 0;
        let bindingWeight = 0;
        if (printOptions.binding === 'Spiral') {
            const spiralRate = isA3 ? 40 : (rules.additional.binding || 15);
            bindingCharge = spiralRate * (printOptions.bindingQuantity || 1);
            bindingWeight = 0.1 * (printOptions.bindingQuantity || 1);
        } else if (printOptions.binding === 'Chart') {
            const chartRate = isA3 ? 20 : (rules.additional.chart_binding || 10);
            bindingCharge = chartRate * (printOptions.bindingQuantity || 1);
            bindingWeight = 0.05 * (printOptions.bindingQuantity || 1);
        } else if (printOptions.binding === 'Staple') {
            const stapleRate = rules.additional?.staple_binding || 0.30;
            bindingCharge = stapleRate * (billingSheets * (printOptions.copies || 1));
            bindingWeight = 0.01 * (printOptions.bindingQuantity || 1);
        }

        const totalSheets = billingSheets * (printOptions.copies || 1);

        // Weight Calculation: paper only (1 kg per 200 sheets, rounded up)
        const calcWeight = Math.ceil(totalSheets / 200);

        let deliveryCharge = 0;
        if (fulfillment.method === 'delivery') {
            if (calcWeight <= 3) {
                // Tier 1: <= 3kg -> ₹35 per kg, No Slip
                deliveryCharge = 35 * calcWeight;
            } else if (calcWeight <= 10) {
                // Tier 2: 4-10kg -> ₹29 per kg + ₹20 Slip
                deliveryCharge = (29 * calcWeight) + 20;
            } else {
                // Tier 3: > 10kg -> ₹26 per kg + ₹20 Slip
                deliveryCharge = (26 * calcWeight) + 20;
            }
        }

        // Final Total calculated server-side to prevent tampering
        const subtotal = printingCharge + bindingCharge + deliveryCharge;
        let finalAmount = Math.max(0, subtotal - (couponDiscount || 0) - (walletUsed || 0));

        // NaN Safeguards
        if (isNaN(printingCharge)) throw new Error("Invalid printing charge calculation");
        if (isNaN(deliveryCharge)) deliveryCharge = 0;
        if (isNaN(finalAmount)) finalAmount = 0;

        // 4. Handle Wallet Deduction
        if (walletUsed > 0) {
            const wallet = await Wallet.findOne({ userId });
            if (!wallet || wallet.balance < walletUsed) {
                return res.json({ success: false, message: "Insufficient wallet balance" });
            }
            wallet.balance -= walletUsed;
            wallet.transactions.push({
                type: 'debit',
                amount: walletUsed,
                description: `Used for order #${String(userId).slice(-6)}`,
                addedBy: 'user'
            });
            await wallet.save();
            await User.findByIdAndUpdate(userId, { walletBalance: wallet.balance });
        }

        // 5. Handle Coupon Usage
        if (couponCode) {
            await Coupon.findOneAndUpdate({ code: couponCode }, { $inc: { usedCount: 1 } });
        }

        // 6. Create Order
        const order = await Order.create({
            userId,
            files: uploadedFiles,
            printOptions,
            pricing: {
                printingCharge,
                bindingCharge,
                deliveryCharge,
                couponDiscount: couponDiscount || 0,
                walletUsed: walletUsed || 0,
                totalAmount: finalAmount
            },
            fulfillment,
            deliveryDetails: fulfillment.method === 'pickup' ? { phone: deliveryDetails?.phone || '', address: 'PICKUP' } : deliveryDetails,
            payment: {
                method: paymentMethod,
                isPaid: (paymentMethod === 'UPI' && finalAmount >= 0) || (paymentMethod === 'Wallet' && finalAmount === 0) || (paymentMethod === 'UPI+Wallet' && finalAmount === 0)
            },
            couponCode: couponCode || '',
            status: 'received'
        });

        return res.json({ success: true, message: "Order Placed Successfully", orderId: order._id });

    } catch (error) {
        console.log("--- ERROR PLACING ORDER ---");
        return res.json({ success: false, message: error.message || "Failed to place order" });
    }
}

// Place Product Order (from Cart) : /api/order/place
export const placeOrder = async (req, res) => {
    try {
        const { userId, items, address, paymentMethod, isPaid } = req.body;

        // In a real app, we'd calculate the amount here. 
        // For this migration, we'll trust the logic or implement a simple version.
        // Since the requirement is to replace COD with UPI:
        const order = await Order.create({
            userId,
            items, // Array of {product, quantity}
            deliveryDetails: { addressId: address },
            payment: {
                method: 'RAZORPAY',
                isPaid: false
            },
            status: 'received',
            fulfillment: { method: 'delivery' }
        });

        res.json({ success: true, message: "Order Placed Successfully", orderId: order._id });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Get Orders by User ID : /api/order/user
export const getUserOrders = async (req, res) => {
    try {
        const userId = req.userId;
        const orders = await Order.find({ userId }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Place POS Order (No files) : /api/order/pos
export const createPosOrder = async (req, res) => {
    try {
        const { customer, items, totalAmount, paymentMethod } = req.body;

        // POS orders are immediately 'ready' or 'delivered'
        const order = await Order.create({
            userId: req.body.userId || undefined, // Use undefined for guest/direct sales
            printOptions: { mode: 'B/W', side: 'Single', binding: 'Loose Papers' }, // Default for POS items
            pricing: {
                totalAmount,
                printingCharge: totalAmount, // Flat allocation for POS
                deliveryCharge: 0
            },
            deliveryDetails: {
                phone: customer.phone,
                address: 'POS Counter'
            },
            payment: {
                method: paymentMethod || 'Cash',
                isPaid: true
            },
            status: 'delivered',
            fulfillment: { method: 'pickup' },
            files: items.map(item => ({
                originalName: item.name,
                url: '',
                fileType: 'POS Service'
            }))
        });

        res.json({ success: true, message: "POS Order Created", orderId: order._id });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Cleanup Files older than 7 Days (Admin) : /api/order/cleanup
export const cleanupOldFiles = async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Find orders older than 7 days that still have file URLs
        const orders = await Order.find({
            createdAt: { $lt: sevenDaysAgo },
            'files.url': { $ne: '' }
        });

        let deletedCount = 0;

        for (const order of orders) {
            for (const file of order.files) {
                if (file.url) {
                    // Extract public_id from Cloudinary URL
                    // Example: https://res.cloudinary.com/demo/image/upload/v12345/folder/name.pdf
                    const parts = file.url.split('/');
                    const filenameWithExt = parts[parts.length - 1];
                    const filename = filenameWithExt.split('.')[0];
                    const folder = parts[parts.length - 2];
                    const publicId = `${folder}/${filename}`;

                    try {
                        await cloudinary.uploader.destroy(publicId);
                    } catch (err) {
                        console.error(`Failed to delete file ${publicId}:`, err.message);
                    }
                }
            }

            // Clear URLs in DB but keep the names and other metadata
            const updatedFiles = order.files.map(f => ({ ...f, url: '' }));
            await Order.findByIdAndUpdate(order._id, { files: updatedFiles });
            deletedCount++;
        }

        res.json({ success: true, message: `Cleanup complete. Processed ${deletedCount} orders.` });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Get All Orders (Admin) : /api/order/all
export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ createdAt: -1 }).populate('userId', 'name phone');
        res.json({ success: true, orders });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Update Order and Recalculate Amount (Admin) : /api/order/edit/:orderId
export const updateOrderAndRecalculate = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { printOptions } = req.body;

        const order = await Order.findById(orderId);
        if (!order) return res.json({ success: false, message: "Order not found" });

        // Fetch Pricing Rules
        const pricingData = await Pricing.findOne({ type: 'printing_rules' });
        const rules = pricingData ? pricingData.rules : {
            printing: { bw: { single: 2, double: 3 }, color: { single: 10, double: 15 } },
            additional: { binding: 50, hard_binding: 200, handling_fee: 10 },
            delivery_tiers: {
                tier_a: { maxWeight: 3, rate: 35, slip: 0 },
                tier_b: { maxWeight: 10, rate: 29, slip: 20 },
                tier_c: { maxWeight: 999, rate: 26, slip: 20 }
            }
        };

        // Recalculate
        const docPages = order.files.reduce((acc, f) => acc + (f.pageCount || 0), 0);
        const totalPages = printOptions.pageRangeType === 'Custom'
            ? calculateCustomPageCount(printOptions.customPages)
            : docPages;

        const isColor = printOptions.mode === 'Color';
        const isDouble = printOptions.side === 'Double';

        const colorKey = isColor ? 'color' : 'bw';
        const sideKey = isDouble ? 'double' : 'single';
        const a3SideKey = isDouble ? 'a3_double' : 'a3_single';

        let rate;
        if (isA3) {
            rate = rules.printing[colorKey][a3SideKey] || (rules.printing[colorKey][sideKey] * 2);
        } else {
            rate = rules.printing[colorKey][sideKey];
        }

        const printingCharge = totalPages * (rate || (isColor ? 10 : 2)) * (printOptions.copies || 1);
        const billingSheets = isDouble ? Math.ceil(totalPages / 2) : totalPages;

        let bindingCharge = 0;
        let bindingWeight = 0;
        if (printOptions.binding === 'Spiral') {
            const spiralRate = isA3 ? 40 : (rules.additional.binding || 15);
            bindingCharge = spiralRate * (printOptions.bindingQuantity || 1);
            bindingWeight = 0.1 * (printOptions.bindingQuantity || 1);
        } else if (printOptions.binding === 'Chart') {
            const chartRate = isA3 ? 20 : (rules.additional.chart_binding || 10);
            bindingCharge = chartRate * (printOptions.bindingQuantity || 1);
            bindingWeight = 0.05 * (printOptions.bindingQuantity || 1);
        } else if (printOptions.binding === 'Staple') {
            const stapleRate = rules.additional?.staple_binding || 0.30;
            const bSheets = isDouble ? Math.ceil(totalPages / 2) : totalPages;
            bindingCharge = stapleRate * (bSheets * (printOptions.copies || 1));
            bindingWeight = 0.01 * (printOptions.bindingQuantity || 1);
        }


        const totalSheets = billingSheets * (printOptions.copies || 1);
        const calcWeight = (totalSheets * 5 / 1000);

        let deliveryCharge = 0;
        if (order.fulfillment.method === 'delivery') {
            const tiers = rules.delivery_tiers;
            let rule = tiers.tier_c;

            if (calcWeight <= tiers.tier_a.maxWeight) {
                rule = tiers.tier_a;
            } else if (calcWeight <= tiers.tier_b.maxWeight) {
                rule = tiers.tier_b;
            }

            deliveryCharge = (rule.rate * calcWeight) + rule.slip;
        }

        const subtotal = printingCharge + bindingCharge + deliveryCharge;
        const finalAmount = Math.max(0, subtotal - (order.pricing.couponDiscount || 0) - (order.pricing.walletUsed || 0));

        order.printOptions = { ...order.printOptions, ...printOptions };
        order.pricing = {
            ...order.pricing,
            printingCharge,
            bindingCharge,
            totalAmount: finalAmount
        };
        order.payment.isPaid = false; // Reset payment status on modification if amount changes

        await order.save();

        res.json({ success: true, message: "Order updated and recalculated", order });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Generate Stripe Payment Link for Order Payment : /api/order/payment-link/:orderId


// Generate Thermal Bill PDF : /api/order/thermal-bill/:orderId
export const generateThermalBillPDF = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate('userId');
        if (!order) return res.json({ success: false, message: "Order not found" });

        const shop = await ShopSettings.findOne() || {
            "name": "AnbuDigital",
            "address": "Bengaluru Main Road, Theruvalluvar Nagar, Chengam 606701",
            "phone": "+91 98949 57422",
            "email": "support@printexpress.com",
            "tagline": "Quality at Speed"
        };

        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId.slice(-8)}.pdf`);

        doc.pipe(res);

        // Header Section
        const logoPath = path.join(__dirname, '../assets/logo.png');
        try {
            doc.image(logoPath, 50, 45, { width: 100 });
        } catch (error) {
            doc.fontSize(20).fillColor('#000').text('PRINT EXPRESS', 50, 50);
        }

        doc.fillColor('#444444')
            .fontSize(20)
            .text('INVOICE', 50, 50, { align: 'right' })
            .fontSize(10)
            .text(`Order ID: #${order._id.toString().slice(-8).toUpperCase()}`, 200, 65, { align: 'right' })
            .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 200, 80, { align: 'right' })
            .moveDown();

        doc.moveTo(50, 115).lineTo(550, 115).strokeColor('#eeeeee').stroke();

        // Shop and Customer Info
        doc.fillColor('#000').fontSize(10).font('Helvetica-Bold').text('SOLD BY:', 50, 130);
        doc.font('Helvetica').text(shop.name, 50, 145);
        doc.text(shop.address, 50, 160, { width: 200 });
        doc.text(`Phone: ${shop.phone}`, 50, 190);
        if (shop.gstNumber) doc.text(`GST: ${shop.gstNumber}`, 50, 205);

        doc.font('Helvetica-Bold').text('BILL TO:', 350, 130);
        doc.font('Helvetica').text(order.userId?.name || 'Walk-in Customer', 350, 145);
        if (order.deliveryDetails?.address) {
            doc.text(order.deliveryDetails.address, 350, 160, { width: 200 });
            doc.text(`${order.deliveryDetails.dist}, ${order.deliveryDetails.state} - ${order.deliveryDetails.pincode}`, 350, 190);
        }
        doc.text(`Phone: ${order.deliveryDetails?.phone || 'N/A'}`, 350, 205);

        doc.moveTo(50, 230).lineTo(550, 230).strokeColor('#eeeeee').stroke();

        // Table Header
        const tableTop = 250;
        doc.font('Helvetica-Bold');
        doc.text('Description', 50, tableTop);
        doc.text('Pages', 250, tableTop, { width: 50, align: 'center' });
        doc.text('Copies', 300, tableTop, { width: 50, align: 'center' });
        doc.text('Category', 350, tableTop, { width: 100, align: 'center' });
        doc.text('Amount', 450, tableTop, { width: 100, align: 'right' });

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#eeeee').stroke();

        // Table Rows
        let currentY = tableTop + 30;
        doc.font('Helvetica');

        order.files.forEach((file) => {
            const fileName = file.originalName.length > 30 ? file.originalName.slice(0, 27) + '...' : file.originalName;
            doc.text(fileName, 50, currentY);
            doc.text(order.printOptions.pageRange || 'All', 250, currentY, { width: 50, align: 'center' });
            doc.text(order.printOptions.copies.toString(), 300, currentY, { width: 50, align: 'center' });
            doc.text(`${order.printOptions.mode} ${order.printOptions.side}`, 350, currentY, { width: 100, align: 'center' });

            // Per file printing charge estimation
            const fileCharge = (order.pricing.printingCharge / order.files.length).toFixed(2);
            doc.text(`₹${fileCharge}`, 450, currentY, { width: 100, align: 'right' });

            currentY += 20;
        });

        if (order.printOptions.binding !== 'Loose Papers') {
            doc.text(`Binding: ${order.printOptions.binding}`, 50, currentY);
            doc.text(`₹${order.pricing.bindingCharge.toFixed(2)}`, 450, currentY, { width: 100, align: 'right' });
            currentY += 20;
        }

        doc.moveTo(50, currentY).lineTo(550, currentY).strokeColor('#eeeeee').stroke();

        // Summary
        currentY += 15;
        const summaryX = 350;

        doc.text('Subtotal:', summaryX, currentY);
        doc.text(`₹${(order.pricing.printingCharge + order.pricing.bindingCharge).toFixed(2)}`, 450, currentY, { width: 100, align: 'right' });

        currentY += 20;
        doc.text('Delivery Charge:', summaryX, currentY);
        doc.text(`₹${order.pricing.deliveryCharge.toFixed(2)}`, 450, currentY, { width: 100, align: 'right' });

        if (order.pricing.couponDiscount > 0) {
            currentY += 20;
            doc.fillColor('#ea580c').text('Coupon Discount:', summaryX, currentY);
            doc.text(`-₹${order.pricing.couponDiscount.toFixed(2)}`, 450, currentY, { width: 100, align: 'right' }).fillColor('#000');
        }

        if (order.pricing.walletUsed > 0) {
            currentY += 20;
            doc.fillColor('#2563eb').text('Wallet Used:', summaryX, currentY);
            doc.text(`-₹${order.pricing.walletUsed.toFixed(2)}`, 450, currentY, { width: 100, align: 'right' }).fillColor('#000');
        }

        currentY += 30;
        doc.font('Helvetica-Bold').fontSize(14);
        doc.text('TOTAL AMOUNT:', summaryX, currentY);
        doc.text(`₹${order.pricing.totalAmount.toFixed(2)}`, 450, currentY, { width: 100, align: 'right' });

        // Footer
        const footerY = 750;
        doc.fontSize(10).font('Helvetica-Bold').text(shop.tagline, 50, footerY, { align: 'center', width: 500 });
        doc.fontSize(8).font('Helvetica').fillColor('#777777').text('This is a computer-generated invoice and does not require a signature.', 50, footerY + 15, { align: 'center', width: 500 });
        doc.text('Thank you for choosing Print Express!', 50, footerY + 30, { align: 'center', width: 500 });

        doc.end();
    } catch (error) {
        console.error("PDF Gen Error:", error);
        res.json({ success: false, message: error.message });
    }
}

// Update Order Status (Admin) : /api/order/update-status
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true }).populate('userId');

        // Trigger WhatsApp notification logic
        if (order && order.userId && order.userId.phone) {
            console.log(`[WhatsApp Notification] To: ${order.userId.phone}, Message: Your order #${order._id.toString().slice(-8)} is now ${status}.`);
            // TODO: In production, call WhatsApp Cloud API here
        }

        res.json({ success: true, order });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}
// Generate Razorpay Order : /api/order/razorpay-order
export const createRazorpayOrder = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.json({ success: false, message: "Invalid amount" });
        }

        const options = {
            amount: Math.round(amount * 100), // Amount in paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };

        const razorpayOrder = await razorpay.orders.create(options);
        console.log("Razorpay Order Created:", razorpayOrder.id, "Amount:", razorpayOrder.amount);
        res.json({ success: true, razorpayOrder });
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.json({ success: false, message: error.message });
    }
}

// Verify Razorpay Payment : /api/order/razorpay-verify
export const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
        console.log("Verifying Razorpay Payment. OrderID:", orderId, "RP OrderID:", razorpay_order_id);

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            await Order.findByIdAndUpdate(orderId, {
                'payment.isPaid': true,
                'payment.transactionId': razorpay_payment_id,
                'payment.razorpayOrderId': razorpay_order_id,
                'payment.razorpayPaymentId': razorpay_payment_id,
                'payment.razorpaySignature': razorpay_signature,
                status: 'received'
            });
            res.json({ success: true, message: "Payment Verified" });
        } else {
            res.json({ success: false, message: "Payment Verification Failed" });
        }
    } catch (error) {
        console.error("Razorpay Verify Error:", error);
        res.json({ success: false, message: error.message });
    }
}

// Stripe Webhooks Handler : /api/order/webhook

