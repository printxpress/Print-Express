import Order from '../models/Order.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Pricing from '../models/Pricing.js';
import Service from '../models/Service.js';
import axios from 'axios';
import Coupon from '../models/Coupon.js';
import ShopSettings from '../models/ShopSettings.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Counter from '../models/Counter.js';
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
        let printOptions, fulfillment, deliveryDetails, paymentMethod, couponCode, couponDiscount, walletUsed, fileMetadata, uploadedFiles;

        if (req.body.data) {
            const parsed = JSON.parse(req.body.data);
            printOptions = parsed.printOptions;
            fulfillment = parsed.fulfillment;
            deliveryDetails = parsed.deliveryDetails;
            paymentMethod = parsed.paymentMethod;
            couponCode = parsed.couponCode;
            couponDiscount = parsed.couponDiscount;
            walletUsed = parsed.walletUsed;
            fileMetadata = parsed.fileMetadata;
        } else {
            // Support JSON body (no FormData)
            ({ printOptions, fulfillment, deliveryDetails, paymentMethod, couponCode, couponDiscount, walletUsed, uploadedFiles } = req.body);
        }

        const userId = req.userId;
        const files = req.files;

        // Determine final uploaded files
        let finalFiles = [];

        if (uploadedFiles && uploadedFiles.length > 0) {
            // Using Direct-to-Cloudinary URLs from frontend
            finalFiles = uploadedFiles;
        } else if (files && files.length > 0) {
            // Fallback: Upload files to Cloudinary from backend (might fail on Vercel > 4.5MB)
            finalFiles = await Promise.all(
                files.map(async (file, index) => {
                    const result = await cloudinary.uploader.upload(file.path, { resource_type: 'auto', folder: 'print_orders' });
                    const meta = fileMetadata ? fileMetadata.find(m => m.name === file.originalname) : null;
                    return {
                        url: result.secure_url,
                        originalName: file.originalname,
                        fileType: file.mimetype,
                        pageCount: meta ? meta.pageCount : 1
                    };
                })
            );
        }

        if (finalFiles.length === 0) {
            return res.json({ success: false, message: "No files uploaded" });
        }

        // 2. Fetch Pricing Rules
        const [pricingData] = await Promise.all([
            Pricing.findOne({ type: 'printing_rules' })
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

        // 3. Ensure printOptions is an array (backward compat)
        const optionsArray = Array.isArray(printOptions) ? printOptions : [printOptions];

        // 4. Calculate per-document pricing
        let totalPrintingCharge = 0;
        let totalBindingCharge = 0;
        let totalSheets = 0;

        optionsArray.forEach((opts, idx) => {
            const file = finalFiles[idx] || finalFiles[0];
            const docPages = file.pageCount || 1;
            const totalPages = opts.pageRangeType === 'Custom'
                ? calculateCustomPageCount(opts.customPages)
                : docPages;

            const isColor = opts.mode === 'Color';
            const isDouble = opts.side === 'Double';
            const isA3 = opts.paperSize === 'A3';

            const colorKey = isColor ? 'color' : 'bw';
            const singleKey = isA3 ? 'a3_single' : 'single';
            const doubleKey = isA3 ? 'a3_double' : 'double';
            const singleRate = rules.printing[colorKey][singleKey] || (isColor ? 8 : 0.75);
            const doubleRate = rules.printing[colorKey][doubleKey] || singleRate;

            // Effective pages after pagesPerSheet
            const effectivePages = opts.pagesPerSheet === 2 ? Math.ceil(totalPages / 2) : totalPages;

            let docPrintCharge = 0;
            if (isDouble) {
                // Simplified: Use doubleRate for all pages if Double is selected
                docPrintCharge = effectivePages * doubleRate;
            } else {
                docPrintCharge = effectivePages * singleRate;
            }

            docPrintCharge *= (opts.copies || 1);

            const totalPagesToPrint = effectivePages * (opts.copies || 1);
            const docSheets = isDouble ? Math.ceil(totalPagesToPrint / 2) : totalPagesToPrint;
            totalSheets += docSheets;

            let docBindCharge = 0;
            if (opts.binding === 'Spiral') {
                const spiralRate = isA3 ? 40 : (rules.additional.binding || 15);
                docBindCharge = spiralRate * (opts.bindingQuantity || 1);
            } else if (opts.binding === 'Chart') {
                const chartRate = isA3 ? 20 : (rules.additional.chart_binding || 10);
                docBindCharge = chartRate * (opts.bindingQuantity || 1);
            } else if (opts.binding === 'Staple') {
                const stapleRate = rules.additional?.staple_binding || 0.30;
                docBindCharge = stapleRate * docSheets;
            }

            opts.price = docPrintCharge + docBindCharge;
            totalPrintingCharge += docPrintCharge;
            totalBindingCharge += docBindCharge;
        });

        // 5. Weight: 1 kg per 200 sheets, rounded up
        const calcWeight = Math.ceil(totalSheets / 200);

        let deliveryCharge = 0;
        if (fulfillment.method === 'delivery') {
            if (calcWeight <= 3) {
                deliveryCharge = 35 * calcWeight;
            } else if (calcWeight <= 10) {
                deliveryCharge = (29 * calcWeight) + 20;
            } else {
                deliveryCharge = (26 * calcWeight) + 20;
            }
        }

        const subtotal = totalPrintingCharge + totalBindingCharge + deliveryCharge;

        // Referral Discount (10% max)
        const user = await User.findById(userId);
        let referralDiscount = 0;

        if (user) {
            const hundredDaysAgo = new Date();
            hundredDaysAgo.setDate(hundredDaysAgo.getDate() - 100);

            // Filter valid credits (not expired and not fully used)
            const validCredits = (user.referralCredits || []).filter(c =>
                new Date(c.earnedAt) > hundredDaysAgo && (c.amount - c.usedAmount) > 0
            );

            const totalValidBalance = validCredits.reduce((sum, c) => sum + (c.amount - c.usedAmount), 0);

            if (totalValidBalance > 0) {
                const maxDiscount = subtotal * 0.1;
                referralDiscount = Math.min(totalValidBalance, maxDiscount);
            }
        }

        const discountAmount = (couponDiscount || 0) + referralDiscount;
        const afterDiscounts = Math.max(0, subtotal - discountAmount);

        // 50/50 Split Pay Logic Enforced on Backend
        let validatedWalletUsed = walletUsed || 0;
        if (paymentMethod === 'UPI+Wallet') {
            const maxWalletAllowed = afterDiscounts / 2;
            if (validatedWalletUsed > maxWalletAllowed + 0.01) { // Allowing small float margin
                validatedWalletUsed = maxWalletAllowed;
            }
        }

        let finalAmount = Math.max(0, afterDiscounts - validatedWalletUsed);

        if (isNaN(totalPrintingCharge)) throw new Error("Invalid printing charge calculation");
        if (isNaN(deliveryCharge)) deliveryCharge = 0;
        if (isNaN(finalAmount)) finalAmount = 0;

        // 5. Handle Wallet Deduction
        if (validatedWalletUsed > 0) {
            const wallet = await Wallet.findOne({ userId });
            if (!wallet || wallet.balance < validatedWalletUsed) {
                return res.json({ success: false, message: "Insufficient wallet balance" });
            }
            wallet.balance -= validatedWalletUsed;
            wallet.transactions.push({
                type: 'debit',
                amount: validatedWalletUsed,
                description: `Used for order #${String(userId).slice(-6)}`,
                addedBy: 'user'
            });
            await wallet.save();
            await User.findByIdAndUpdate(userId, { walletBalance: wallet.balance });
        }

        // Handle Referral Balance Deduction
        if (referralDiscount > 0) {
            let remainingToDeduct = referralDiscount;
            const updatedCredits = user.referralCredits.map(credit => {
                if (remainingToDeduct <= 0) return credit;

                const available = credit.amount - credit.usedAmount;
                const toDeduct = Math.min(available, remainingToDeduct);

                remainingToDeduct -= toDeduct;
                return { ...credit.toObject(), usedAmount: (credit.usedAmount || 0) + toDeduct };
            });

            await User.findByIdAndUpdate(userId, {
                $inc: { referralBalance: -referralDiscount },
                $set: { referralCredits: updatedCredits }
            });
        }

        // 6. Handle Coupon Usage
        if (couponCode) {
            await Coupon.findOneAndUpdate({ code: couponCode }, { $inc: { usedCount: 1 } });
        }

        // 6. Generate Sequential Display ID
        const counter = await Counter.findOneAndUpdate(
            { id: 'orderId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const displayId = `ANPRE${String(counter.seq).padStart(3, '0')}`;

        // 7. Create Order
        const order = await Order.create({
            userId,
            displayId,
            files: finalFiles,
            printOptions: optionsArray.map((opts, i) => ({ ...opts, fileIndex: i })),
            pricing: {
                printingCharge: totalPrintingCharge,
                bindingCharge: totalBindingCharge,
                deliveryCharge,
                couponDiscount: couponDiscount || 0,
                referralDiscount: referralDiscount || 0,
                walletUsed: validatedWalletUsed,
                totalAmount: finalAmount
            },
            fulfillment,
            deliveryDetails: fulfillment.method === 'pickup' ? { phone: deliveryDetails?.phone || '', address: 'PICKUP' } : deliveryDetails,
            payment: {
                method: paymentMethod,
                isPaid: (paymentMethod === 'UPI' && finalAmount === 0) || (paymentMethod === 'Wallet' && finalAmount === 0) || (paymentMethod === 'UPI+Wallet' && finalAmount === 0)
            },
            couponCode: couponCode || '',
            status: 'received'
        });

        // 8. Handle First Order Referral Credit
        const userOrdersCount = await Order.countDocuments({ userId });
        if (userOrdersCount === 1) {
            const currentUser = await User.findById(userId);
            if (currentUser && currentUser.referredBy) {
                // Credit referrer ₹100
                const referralCredit = {
                    amount: 100,
                    earnedAt: new Date(),
                    usedAmount: 0,
                    description: `Referral bonus for ${currentUser.phone}'s first order`
                };

                await User.findByIdAndUpdate(currentUser.referredBy, {
                    $inc: { referralBalance: 100 },
                    $push: { referralCredits: referralCredit }
                });

                const referrerWallet = await Wallet.findOne({ userId: currentUser.referredBy });
                if (referrerWallet) {
                    referrerWallet.transactions.push({
                        type: 'credit',
                        amount: 100,
                        description: `Referral bonus for ${currentUser.phone}'s first order`,
                        addedBy: 'referral'
                    });
                    await referrerWallet.save();
                }
            }
        }

        return res.json({ success: true, message: "Order Placed Successfully", orderId: order._id });

    } catch (error) {
        console.log("--- ERROR PLACING ORDER ---");
        return res.json({ success: false, message: error.message || "Failed to place order" });
    }
}

// Place Product Order (from Cart) : /api/order/place
export const placeOrder = async (req, res) => {
    try {
        const { userId, items, address, paymentMethod, isPaid, referralDiscount, courierPartner, walletUsed } = req.body;

        // In a real app, we'd calculate the amount here. 
        // For this migration, we'll trust the logic or implement a simple version.
        // Since the requirement is to replace COD with UPI:
        // Generate Sequential Display ID
        const counter = await Counter.findOneAndUpdate(
            { id: 'orderId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const displayId = `ANPRE${String(counter.seq).padStart(3, '0')}`;

        // Deduct referral discount
        let appliedReferralDiscount = 0;
        if (referralDiscount && referralDiscount > 0) {
            const user = await User.findById(userId);
            if (user && user.referralBalance >= referralDiscount) {
                appliedReferralDiscount = referralDiscount;
                user.referralBalance -= appliedReferralDiscount;
                await user.save();
            }
        }

        // 5. Handle Wallet Deduction
        let validatedWalletUsed = walletUsed || 0;
        // Note: For cart orders, full amount isn't recalculated here yet, 
        // so we trust the walletUsed from frontend but ensure paymentMethod matches
        if (paymentMethod === 'UPI+Wallet' && validatedWalletUsed > 0) {
            // Further validation would require product price lookups here
        }

        if (validatedWalletUsed > 0) {
            const wallet = await Wallet.findOne({ userId });
            if (!wallet || wallet.balance < validatedWalletUsed) {
                return res.json({ success: false, message: "Insufficient wallet balance" });
            }
            wallet.balance -= validatedWalletUsed;
            wallet.transactions.push({
                type: 'debit',
                amount: validatedWalletUsed,
                description: `Used for cart order`,
                addedBy: 'user'
            });
            await wallet.save();
            await User.findByIdAndUpdate(userId, { walletBalance: wallet.balance });
        }

        const order = await Order.create({
            userId,
            displayId,
            items, // Array of {product, quantity}
            deliveryDetails: { addressId: address, courierPartner },
            payment: {
                method: paymentMethod || 'RAZORPAY',
                isPaid: isPaid || false
            },
            pricing: {
                referralDiscount: appliedReferralDiscount,
                walletUsed: validatedWalletUsed
            },
            status: 'received',
            fulfillment: { method: 'delivery' }
        });

        // Handle First Order Referral Credit
        const userOrdersCount = await Order.countDocuments({ userId });
        if (userOrdersCount === 1) {
            const currentUser = await User.findById(userId);
            if (currentUser && currentUser.referredBy) {
                // Credit referrer ₹100
                await User.findByIdAndUpdate(currentUser.referredBy, { $inc: { referralBalance: 100 } });
                const referrerWallet = await Wallet.findOne({ userId: currentUser.referredBy });
                if (referrerWallet) {
                    referrerWallet.transactions.push({
                        type: 'credit',
                        amount: 100,
                        description: `Referral bonus for ${currentUser.phone}'s first order`,
                        addedBy: 'referral'
                    });
                    await referrerWallet.save();
                }
            }
        }

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

        // Generate Sequential Display ID
        const counter = await Counter.findOneAndUpdate(
            { id: 'orderId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const displayId = `ANPRE${String(counter.seq).padStart(3, '0')}`;

        // POS orders are immediately 'ready' or 'delivered'
        const order = await Order.create({
            userId: customer._id, // Use undefined for guest/direct sales
            displayId,
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

        // Ensure printOptions is an array (backward compat)
        const optionsArray = Array.isArray(printOptions) ? printOptions : [printOptions];

        // Recalculate per-document
        let totalPrintingCharge = 0;
        let totalBindingCharge = 0;
        let totalSheets = 0;

        optionsArray.forEach((opts, idx) => {
            const file = order.files[idx] || order.files[0];
            const docPages = file?.pageCount || 1;
            const totalPages = opts.pageRangeType === 'Custom'
                ? calculateCustomPageCount(opts.customPages)
                : docPages;

            const isColor = opts.mode === 'Color';
            const isDouble = opts.side === 'Double';
            const isA3 = opts.paperSize === 'A3';

            const colorKey = isColor ? 'color' : 'bw';
            const singleKey = isA3 ? 'a3_single' : 'single';
            const doubleKey = isA3 ? 'a3_double' : 'double';
            const singleRate = rules.printing[colorKey][singleKey] || (isColor ? 8 : 0.75);
            const doubleRate = rules.printing[colorKey][doubleKey] || singleRate;

            const effectivePages = opts.pagesPerSheet === 2 ? Math.ceil(totalPages / 2) : totalPages;

            let docPrintCharge = 0;
            if (isDouble) {
                if (effectivePages === 1) {
                    docPrintCharge = doubleRate * 0.5;
                } else if (effectivePages % 2 !== 0) {
                    const pairedPages = effectivePages - 1;
                    docPrintCharge = (pairedPages * doubleRate) + (1 * singleRate);
                } else {
                    docPrintCharge = effectivePages * doubleRate;
                }
            } else {
                docPrintCharge = effectivePages * singleRate;
            }

            docPrintCharge *= (opts.copies || 1);

            const totalPagesToPrint = effectivePages * (opts.copies || 1);
            const docSheets = isDouble ? Math.ceil(totalPagesToPrint / 2) : totalPagesToPrint;
            totalSheets += docSheets;

            let docBindCharge = 0;
            if (opts.binding === 'Spiral') {
                const spiralRate = isA3 ? 40 : (rules.additional.binding || 15);
                docBindCharge = spiralRate * (opts.bindingQuantity || 1);
            } else if (opts.binding === 'Chart') {
                const chartRate = isA3 ? 20 : (rules.additional.chart_binding || 10);
                docBindCharge = chartRate * (opts.bindingQuantity || 1);
            } else if (opts.binding === 'Staple') {
                const stapleRate = rules.additional?.staple_binding || 0.30;
                docBindCharge = stapleRate * docSheets;
            }

            opts.price = docPrintCharge + docBindCharge;
            totalPrintingCharge += docPrintCharge;
            totalBindingCharge += docBindCharge;
        });

        const calcWeight = Math.ceil(totalSheets / 200);

        let deliveryCharge = 0;
        if (order.fulfillment.method === 'delivery') {
            if (calcWeight <= 3) {
                deliveryCharge = 35 * calcWeight;
            } else if (calcWeight <= 10) {
                deliveryCharge = (29 * calcWeight) + 20;
            } else {
                deliveryCharge = (26 * calcWeight) + 20;
            }
        }

        const subtotal = totalPrintingCharge + totalBindingCharge + deliveryCharge;
        const finalAmount = Math.max(0, subtotal - (order.pricing.couponDiscount || 0) - (order.pricing.walletUsed || 0));

        order.printOptions = optionsArray.map((opts, i) => ({ ...opts, fileIndex: i }));
        order.pricing = {
            ...order.pricing,
            printingCharge: totalPrintingCharge,
            bindingCharge: totalBindingCharge,
            totalAmount: finalAmount
        };
        order.payment.isPaid = false;

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
            "address": "7QWM+5WR, East Coast Rd, Chengam, Tamil Nadu 606709",
            "phone": "+91 7603-957422",
            "email": "support@printexpress.com",
            "tagline": "Quality at Speed"
        };

        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.displayId || orderId.slice(-8)}.pdf`);

        doc.pipe(res);

        // --- COLORS & STYLES ---
        const primaryColor = '#1e40af';
        const secondaryColor = '#444444';
        const lightGray = '#f8fafc';
        const borderColor = '#e2e8f0';
        const successColor = '#16a34a';
        const dangerColor = '#dc2626';

        // --- HEADER SECTION ---
        // Header Background Strip
        doc.rect(0, 0, 612, 100).fill('#f1f5f9');
        
        // Logo
        const logoPath = path.join(__dirname, '../assets/logo.png');
        try {
            doc.image(logoPath, 50, 25, { width: 120 });
        } catch (error) {
            doc.fontSize(24).fillColor(primaryColor).font('Helvetica-Bold').text('PRINT EXPRESS', 50, 35);
        }

        // Invoice Title & Status
        doc.fillColor(secondaryColor).fontSize(28).font('Helvetica-Bold').text('INVOICE', 350, 30, { align: 'right' });
        
        const isPaid = order.payment?.isPaid;
        const statusText = isPaid ? 'PAID' : 'UNPAID';
        const statusColor = isPaid ? successColor : dangerColor;
        
        // Status Badge
        doc.rect(480, 65, 70, 20).fill(statusColor);
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text(statusText, 480, 71, { width: 70, align: 'center' });

        // --- ORDER INFO SECTION (Below Header) ---
        doc.moveDown(4);
        const infoTop = 130;

        // Order Details (Right Aligned)
        doc.fillColor(secondaryColor).font('Helvetica').fontSize(10);
        doc.text('Order ID:', 350, infoTop, { width: 100, align: 'left' });
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12)
           .text(`${order.displayId || order._id.toString().slice(-8).toUpperCase()}`, 430, infoTop - 2, { 
               align: 'right', 
               link: `https://printexpress.in/order/${order._id}` 
           });

        doc.fillColor(secondaryColor).font('Helvetica').fontSize(10);
        doc.text('Date:', 350, infoTop + 20, { width: 100, align: 'left' });
        doc.font('Helvetica-Bold').text(`${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 430, infoTop + 20, { align: 'right' });

        // Bill Info
        doc.moveTo(50, 180).lineTo(550, 180).strokeColor(borderColor).lineWidth(1).stroke();

        // SOLD BY / BILL TO Blocks
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('SOLD BY', 50, 200);
        doc.fillColor(secondaryColor).font('Helvetica').fontSize(9);
        doc.moveDown(0.5);
        doc.text(shop.name, { font: 'Helvetica-Bold' });
        doc.font('Helvetica').text(shop.address, { width: 220 });
        doc.text(`Phone: ${shop.phone}`);
        if (shop.gstNumber) doc.text(`GST: ${shop.gstNumber}`);

        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('BILL TO', 350, 200);
        doc.fillColor(secondaryColor).font('Helvetica').fontSize(9);
        doc.moveDown(0.5);
        doc.text(order.userId?.name || 'Walk-in Customer', { font: 'Helvetica-Bold' });
        
        if (order.fulfillment?.method === 'pickup') {
            doc.fillColor(successColor).font('Helvetica-Bold').text('STORE PICKUP');
            doc.fillColor(secondaryColor).font('Helvetica');
            if (order.fulfillment.pickupLocation) {
                doc.text(order.fulfillment.pickupLocation, { width: 200 });
            }
        } else {
            const addr = order.deliveryDetails;
            if (addr?.address) {
                doc.text(addr.address, { width: 200 });
                const cityState = [addr.dist, addr.state].filter(Boolean).join(', ');
                const pin = addr.pincode ? ` - ${addr.pincode}` : '';
                if (cityState || pin) doc.text(`${cityState}${pin}`);
            }
        }
        doc.text(`Phone: ${order.deliveryDetails?.phone || order.userId?.phone || 'N/A'}`);

        // --- ITEMS TABLE ---
        const tableTop = 320;
        doc.rect(50, tableTop, 500, 25).fill(primaryColor);
        
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10);
        doc.text('Description', 60, tableTop + 8);
        doc.text('Pages', 250, tableTop + 8, { width: 60, align: 'center' });
        doc.text('Copies', 310, tableTop + 8, { width: 60, align: 'center' });
        doc.text('Category', 370, tableTop + 8, { width: 80, align: 'center' });
        doc.text('Amount', 460, tableTop + 8, { width: 80, align: 'right' });

        let currentY = tableTop + 25;
        doc.font('Helvetica').fontSize(9);

        order.files.forEach((file, idx) => {
            const opts = Array.isArray(order.printOptions) ? (order.printOptions[idx] || order.printOptions[0]) : order.printOptions;
            
            // Alternating Row Background
            if (idx % 2 === 1) {
                doc.rect(50, currentY, 500, 25).fill(lightGray);
            }

            doc.fillColor(secondaryColor);
            const fileName = file.originalName.length > 35 ? file.originalName.slice(0, 32) + '...' : file.originalName;
            doc.text(fileName, 60, currentY + 8, { width: 190 });
            doc.text(opts?.pageRangeType || 'All', 250, currentY + 8, { width: 60, align: 'center' });
            doc.text((opts?.copies || 1).toString(), 310, currentY + 8, { width: 60, align: 'center' });
            doc.text(`${opts?.mode || 'B/W'} ${opts?.side || 'Sngl'}`, 370, currentY + 8, { width: 80, align: 'center' });

            const fileCharge = opts?.price || (order.pricing.printingCharge / order.files.length);
            doc.font('Helvetica-Bold').text(`Rs. ${Number(fileCharge).toFixed(2)}`, 460, currentY + 8, { width: 80, align: 'right' }).font('Helvetica');

            currentY += 25;
        });

        // Binding Row (if applicable)
        const bindingOpts = Array.isArray(order.printOptions) ? order.printOptions : [order.printOptions];
        const hasBinding = bindingOpts.some(o => o?.binding && o.binding !== 'Loose Papers');
        if (hasBinding && order.pricing.bindingCharge > 0) {
            const bindTypes = [...new Set(bindingOpts.filter(o => o?.binding && o.binding !== 'Loose Papers').map(o => o.binding))];
            doc.text(`Binding: ${bindTypes.join(', ')}`, 60, currentY + 8);
            doc.font('Helvetica-Bold').text(`Rs. ${order.pricing.bindingCharge.toFixed(2)}`, 460, currentY + 8, { width: 80, align: 'right' }).font('Helvetica');
            currentY += 25;
        }

        // Border below table
        doc.moveTo(50, currentY).lineTo(550, currentY).strokeColor(borderColor).stroke();

        // --- SUMMARY SECTION ---
        currentY += 20;
        const summaryX = 350;

        doc.fontSize(10).fillColor(secondaryColor);
        doc.text('Subtotal:', summaryX, currentY);
        doc.font('Helvetica-Bold').text(`Rs. ${(order.pricing.printingCharge + order.pricing.bindingCharge).toFixed(2)}`, 460, currentY, { width: 80, align: 'right' }).font('Helvetica');

        currentY += 20;
        doc.text('Delivery Charge:', summaryX, currentY);
        doc.font('Helvetica-Bold').text(`Rs. ${order.pricing.deliveryCharge.toFixed(2)}`, 460, currentY, { width: 80, align: 'right' }).font('Helvetica');

        if (order.pricing.couponDiscount > 0) {
            currentY += 20;
            doc.fillColor('#ea580c').text('Coupon Discount:', summaryX, currentY);
            doc.text(`-Rs. ${order.pricing.couponDiscount.toFixed(2)}`, 460, currentY, { width: 80, align: 'right' });
        }

        if (order.pricing.walletUsed > 0) {
            currentY += 20;
            doc.fillColor(primaryColor).text('Wallet Used:', summaryX, currentY);
            doc.text(`-Rs. ${order.pricing.walletUsed.toFixed(2)}`, 460, currentY, { width: 80, align: 'right' });
        }

        // Total Amount Highlight
        currentY += 30;
        doc.rect(340, currentY - 10, 220, 40).fill(primaryColor);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(14);
        doc.text('TOTAL AMOUNT:', 350, currentY);
        doc.text(`Rs. ${order.pricing.totalAmount.toFixed(2)}`, 460, currentY, { width: 80, align: 'right' });

        // --- FOOTER SECTION ---
        const footerY = 740;
        doc.moveTo(50, footerY - 20).lineTo(550, footerY - 20).strokeColor(borderColor).stroke();
        
        doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold').text(shop.tagline, 50, footerY, { align: 'center', width: 500 });
        doc.fontSize(8).font('Helvetica').fillColor('#64748b');
        doc.text('This is a computer-generated invoice and does not require a physical signature.', 50, footerY + 15, { align: 'center', width: 500 });
        doc.moveDown(0.5);
        doc.fillColor(primaryColor).text('www.printexpress.in', { align: 'center', width: 500, link: 'https://printexpress.in' });
        doc.moveDown(0.5);
        doc.fillColor('#64748b').text('Thank you for choosing Print Express!', { align: 'center', width: 500 });

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
        console.log("SUCCESS: Razorpay Order Created:", razorpayOrder.id);
        res.json({ success: true, razorpayOrder });
    } catch (error) {
        console.error("ERROR: Razorpay Order Creation Failed:", error);
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

// Download customer-uploaded document controller
export const downloadCustomerFile = async (req, res) => {
    try {
        const { url, filename } = req.query;
        if (!url) {
            return res.status(400).json({ success: false, message: "File URL is required" });
        }

        let targetUrl = url;
        if (targetUrl.startsWith('//')) {
            targetUrl = 'https:' + targetUrl;
        } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
        }

        // Fetch the file as a stream from Cloudinary
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream'
        });

        // Set attachment headers
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || 'download')}"`);
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');

        // Pipe the stream to response
        response.data.pipe(res);
    } catch (error) {
        console.error("Error downloading file:", error);
        res.status(500).json({ success: false, message: "Failed to download file: " + error.message });
    }
};

