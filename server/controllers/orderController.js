import Order from '../models/Order.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Pricing from '../models/Pricing.js';
import Service from '../models/Service.js';
import axios from 'axios';
import Coupon from '../models/Coupon.js';
import ShopSettings from '../models/ShopSettings.js';
import RazorpayPkg from 'razorpay';
const Razorpay = RazorpayPkg.default || RazorpayPkg;
import crypto from 'crypto';
import Counter from '../models/Counter.js';
import { v2 as cloudinary } from 'cloudinary';

// Helper to get Razorpay instance
const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID?.trim().replace(/['"]/g, '');
    const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim().replace(/['"]/g, '');

    if (!key_id || !key_secret) {
        throw new Error("Razorpay API keys are missing in server environment. Please check your Vercel/Environment settings.");
    }
    return new Razorpay({
        key_id,
        key_secret,
    });
};

// ... existing imports ...
import PDFDocument from 'pdfkit';
import fs from 'fs';
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
                    const isPdf = file.mimetype === 'application/pdf' || file.originalname?.endsWith('.pdf');
                    const result = await cloudinary.uploader.upload(file.path, { 
                        resource_type: isPdf ? 'raw' : 'auto', 
                        folder: 'print_orders' 
                    });
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
                docBindCharge = stapleRate * (opts.copies || 1);
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
                    // Or for raw: https://res.cloudinary.com/demo/raw/upload/v12345/folder/name.pdf
                    const isRaw = file.url.includes('/raw/upload/');
                    const parts = file.url.split('/');
                    const filenameWithExt = parts[parts.length - 1];
                    const folder = parts[parts.length - 2];
                    
                    let publicId;
                    if (isRaw) {
                        publicId = `${folder}/${filenameWithExt}`;
                    } else {
                        const filename = filenameWithExt.split('.')[0];
                        publicId = `${folder}/${filename}`;
                    }

                    try {
                        await cloudinary.uploader.destroy(publicId, { resource_type: isRaw ? 'raw' : 'image' });
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
                docBindCharge = stapleRate * (opts.copies || 1);
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

// Generate Razorpay Payment Link for Order Payment : /api/order/payment-link/:orderId
export const generateRazorpayLink = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate('userId');

        if (!order) return res.json({ success: false, message: "Order not found" });
        if (order.payment.isPaid) return res.json({ success: false, message: "Order already paid" });

        const amount = Math.round(order.pricing.totalAmount * 100); // in paise

        // For mobile/intent, it's often better to return an order_id and use standard checkout
        // but if the frontend expects a URL, we create a Payment Link
        const paymentLink = await getRazorpayInstance().paymentLink.create({
            amount,
            currency: "INR",
            accept_partial: false,
            first_payment_min_amount: amount,
            description: `Payment for Print Express Order #${order.displayId || orderId.slice(-6)}`,
            customer: {
                name: order.userId?.name || "Customer",
                email: order.userId?.email || "customer@printexpress.in",
                contact: order.userId?.phone || ""
            },
            notify: {
                sms: true,
                email: true
            },
            reminder_enable: true,
            notes: {
                order_id: orderId
            },
            callback_url: `${process.env.VITE_FRONTEND_URL || 'https://print-express-ve.vercel.app'}/order-success?orderId=${orderId}`,
            callback_method: 'get'
        });

        res.json({ success: true, paymentUrl: paymentLink.short_url });
    } catch (error) {
        console.error("Payment Link Error:", error);
        res.json({ success: false, message: error.message });
    }
}

// Generate Thermal Bill PDF : /api/order/thermal-bill/:orderId
// Generate Thermal Bill PDF : /api/order/thermal-bill/:orderId
export const generateThermalBillPDF = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate('userId');
        if (!order) return res.json({ success: false, message: "Order not found" });

        const shop = await ShopSettings.findOne() || {
            "name": "Print Express",
            "address": "AnbuDigital, Bengaluru Main road, Thiruvalluvar Nagar, Chengam 606701",
            "phone": "+91 7603-957422",
            "email": "support@printexpress.com",
            "tagline": "Quality at Speed"
        };

        // Create document with autoPageBreak disabled to have absolute layout control
        const doc = new PDFDocument({ size: 'A4', margin: 40, autoPageBreak: false });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.displayId || orderId.slice(-8)}.pdf`);

        doc.pipe(res);

        // --- MODERN THEME COLOR TOKENS ---
        const themeNavy = '#0f172a'; // Slate 900
        const themeBlue = '#1d4ed8'; // Blue 700
        const themeAccent = '#2563eb'; // Blue 600
        const themeSlate = '#334155'; // Slate 700
        const themeMuted = '#64748b'; // Slate 500
        const lightGray = '#f8fafc'; // Slate 50
        const borderLight = '#e2e8f0'; // Slate 200
        const borderMuted = '#cbd5e1'; // Slate 300

        const isPaid = Boolean(order.payment?.isPaid);

        // Helper to draw modern footer on any page
        const drawFooter = () => {
            const footerY = 745;
            doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(borderLight).lineWidth(1).stroke();
            doc.rect(40, footerY, 140, 2).fill(themeBlue);

            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(themeNavy).text('Thank you for choosing Print Express!', 40, footerY + 8, { align: 'center', width: 515 });
            doc.font('Helvetica').fontSize(7.5).fillColor(themeMuted);
            doc.text('AnbuDigital, Bengaluru Main Road, Thiruvalluvar Nagar, Chengam - 606701  •  Phone: +91 7603-957422', 40, footerY + 19, { align: 'center', width: 515 });
            doc.fillColor(themeAccent).text('www.printexpress.in  •  support@printexpress.in', 40, footerY + 29, { align: 'center', width: 515, link: 'https://printexpress.in' });
            doc.fontSize(6.5).fillColor('#94a3b8').text('This is an authenticated computer-generated tax invoice and does not require a physical signature.', 40, footerY + 40, { align: 'center', width: 515 });
        };

        // Helper to start a new page for overflow items
        const startNewPage = (pageTitle = 'TAX INVOICE (Continued)') => {
            doc.addPage();
            doc.rect(40, 24, 515, 3).fill(themeBlue);
            doc.fillColor(themeNavy).fontSize(14).font('Helvetica-Bold').text(pageTitle, 40, 42);
            
            const newTableTop = 70;
            doc.roundedRect(40, newTableTop, 515, 23, 4).fill(themeNavy);
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
            doc.text('#', 50, newTableTop + 7, { width: 20 });
            doc.text('DOCUMENT / DESCRIPTION', 75, newTableTop + 7, { width: 185 });
            doc.text('PRINT SPECIFICATIONS', 265, newTableTop + 7, { width: 115 });
            doc.text('PAGES', 385, newTableTop + 7, { width: 45, align: 'center' });
            doc.text('COPIES', 435, newTableTop + 7, { width: 40, align: 'center' });
            doc.text('AMOUNT', 480, newTableTop + 7, { width: 65, align: 'right' });
            
            drawFooter();
            return newTableTop + 23;
        };

        // --- FIRST PAGE DESIGN ---
        // 1. Top Decorative Brand Bar
        doc.rect(40, 24, 515, 3).fill(themeBlue);

        // 2. Logo (Clean, prominent, no background clipping box)
        const logoPath = path.join(__dirname, '../assets/logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 40, 34, { fit: [175, 75] });
        } else {
            doc.fontSize(22).fillColor(themeNavy).font('Helvetica-Bold').text('PRINT', 40, 45, { continued: true })
               .fillColor(themeAccent).text('EXPRESS');
            doc.fontSize(8).fillColor(themeMuted).font('Helvetica-Oblique').text(shop.tagline || 'Your Ideas, Delivered Fast', 40, 70);
        }

        // 3. Invoice Header (Right Side)
        doc.font('Helvetica-Bold').fontSize(24).fillColor(themeNavy).text('TAX INVOICE', 320, 36, { align: 'right', width: 235 });

        const displayIdStr = `#${order.displayId || order._id.toString().slice(-8).toUpperCase()}`;
        doc.font('Helvetica').fontSize(9).fillColor(themeMuted).text('Invoice No: ', 320, 64, { align: 'right', width: 155 });
        doc.font('Helvetica-Bold').fontSize(10).fillColor(themeBlue).text(displayIdStr, 480, 64, { align: 'right', width: 75 });

        const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        doc.font('Helvetica').fontSize(8.5).fillColor(themeMuted).text(`Date: ${formattedDate}`, 320, 78, { align: 'right', width: 235 });

        // Status Badge (Rendered with vector graphics - clean & sharp)
        const pillX = 465, pillY = 93, pillW = 90, pillH = 19;
        if (isPaid) {
            doc.roundedRect(pillX, pillY, pillW, pillH, 9.5).fillAndStroke('#ecfdf5', '#86efac');
            doc.circle(pillX + 13, pillY + 9.5, 5).fill('#16a34a');
            doc.moveTo(pillX + 10.5, pillY + 9.5).lineTo(pillX + 12.5, pillY + 11.5).lineTo(pillX + 15.5, pillY + 7.5).strokeColor('#ffffff').lineWidth(1.2).stroke();
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#065f46').text('PAID', pillX + 22, pillY + 5, { width: 62, align: 'center' });
        } else {
            doc.roundedRect(pillX, pillY, pillW, pillH, 9.5).fillAndStroke('#fffbeb', '#fcd34d');
            doc.circle(pillX + 13, pillY + 9.5, 5).fill('#d97706');
            doc.moveTo(pillX + 13, pillY + 6.5).lineTo(pillX + 13, pillY + 10.5).strokeColor('#ffffff').lineWidth(1.2).stroke();
            doc.circle(pillX + 13, pillY + 12.5, 0.8).fill('#ffffff');
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#92400e').text('UNPAID', pillX + 22, pillY + 5, { width: 62, align: 'center' });
        }

        // Subtle Header Divider
        doc.moveTo(40, 118).lineTo(555, 118).strokeColor(borderLight).lineWidth(1).stroke();

        // 4. SOLD BY / BILL TO CARDS (Y: 126 to 220)
        const cardY = 126, cardH = 94, cardW = 250;

        // Sold By Card
        doc.roundedRect(40, cardY, cardW, cardH, 7).fillAndStroke(lightGray, borderLight);
        doc.roundedRect(50, cardY + 8, 65, 13, 3).fill('#eff6ff');
        doc.font('Helvetica-Bold').fontSize(7).fillColor(themeBlue).text('SOLD BY', 50, cardY + 11, { width: 65, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(themeNavy).text(shop.name || 'Print Express', 50, cardY + 25);
        
        const cleanStoreAddr = (shop.address || 'AnbuDigital, Bengaluru Main Road, Chengam - 606701')
            .split('\n')
            .map(s => s.trim().replace(/,\s*$/, ''))
            .filter(Boolean)
            .join(', ');
        doc.font('Helvetica').fontSize(7.5).fillColor(themeSlate).text(cleanStoreAddr, 50, cardY + 39, { width: 230, lineGap: 1.5 });
        doc.font('Helvetica').fontSize(7.5).fillColor(themeSlate).text(`Phone: ${shop.phone || '+91 7603-957422'}`, 50, cardY + 68);
        doc.fillColor(themeMuted).text(`Email: ${shop.email || 'support@printexpress.in'}`, 50, cardY + 79);

        // Bill To Card
        doc.roundedRect(305, cardY, cardW, cardH, 7).fillAndStroke(lightGray, borderLight);
        doc.roundedRect(315, cardY + 8, 65, 13, 3).fill('#eff6ff');
        doc.font('Helvetica-Bold').fontSize(7).fillColor(themeBlue).text('BILLED TO', 315, cardY + 11, { width: 65, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(themeNavy).text(order.userId?.name || 'Walk-in Customer', 315, cardY + 25);

        // Fulfillment Badge
        if (order.fulfillment?.method === 'pickup') {
            doc.roundedRect(315, cardY + 38, 95, 12, 3).fill('#f3e8ff');
            doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#7e22ce').text('STORE PICKUP', 315, cardY + 40.5, { width: 95, align: 'center' });

            let pickupLoc = order.fulfillment.pickupLocation || '';
            if (!pickupLoc || pickupLoc.includes('Coimbatore')) {
                pickupLoc = 'Print Express, Chengam Store Location';
            }
            doc.font('Helvetica').fontSize(7.5).fillColor(themeSlate).text(pickupLoc, 315, cardY + 54, { width: 230, lineGap: 1.5 });
        } else {
            const courier = order.deliveryDetails?.courierPartner ? ` (${order.deliveryDetails.courierPartner})` : '';
            doc.roundedRect(315, cardY + 38, 120, 12, 3).fill('#eff6ff');
            doc.font('Helvetica-Bold').fontSize(6.5).fillColor(themeBlue).text(`HOME DELIVERY${courier}`, 315, cardY + 40.5, { width: 120, align: 'center' });

            const addr = order.deliveryDetails;
            let dest = addr?.address || 'Delivery Address Provided';
            const cityState = [addr?.district || addr?.dist, addr?.state].filter(Boolean).join(', ');
            const pin = addr?.pincode ? ` - ${addr.pincode}` : '';
            if (cityState || pin) dest += `, ${cityState}${pin}`;

            const cleanDest = dest.split('\n').map(s => s.trim().replace(/,\s*$/, '')).filter(Boolean).join(', ');
            doc.font('Helvetica').fontSize(7.5).fillColor(themeSlate).text(cleanDest, 315, cardY + 54, { width: 230, lineGap: 1.5 });
        }
        doc.font('Helvetica').fontSize(7.5).fillColor(themeSlate).text(`Phone: ${order.deliveryDetails?.phone || order.userId?.phone || 'N/A'}`, 315, cardY + 76);

        // 5. Order Information Strip
        const stripY = 226;
        doc.roundedRect(40, stripY, 515, 24, 4).fillAndStroke('#f1f5f9', '#e2e8f0');
        doc.font('Helvetica').fontSize(8).fillColor(themeMuted);
        
        const payMethodStr = order.payment?.method || 'Online';
        const fulfillStr = order.fulfillment?.method === 'pickup' ? 'Store Pickup' : 'Courier Delivery';
        const hasSplit = order.files?.some(f => f?.isSplit || f?.originalName?.match(/-split\d+\.pdf$/i));
        const totalUnitsStr = `${order.files?.length || 1} Document${(order.files?.length || 1) > 1 ? 's' : ''}${hasSplit ? ' (Split Parts)' : ''}`;

        doc.text('Order Ref: ', 50, stripY + 7, { continued: true })
           .font('Helvetica-Bold').fillColor(themeNavy).text(displayIdStr, { continued: true })
           .font('Helvetica').fillColor(themeMuted).text('   |   Payment: ', { continued: true })
           .font('Helvetica-Bold').fillColor(themeNavy).text(payMethodStr, { continued: true })
           .font('Helvetica').fillColor(themeMuted).text('   |   Fulfillment: ', { continued: true })
           .font('Helvetica-Bold').fillColor(themeNavy).text(fulfillStr, { continued: true })
           .font('Helvetica').fillColor(themeMuted).text('   |   Total Units: ', { continued: true })
           .font('Helvetica-Bold').fillColor(themeNavy).text(totalUnitsStr);

        // 6. Items Table
        const tableY = 258;
        doc.roundedRect(40, tableY, 515, 23, 4).fill(themeNavy);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
        doc.text('#', 50, tableY + 7, { width: 20 });
        doc.text('DOCUMENT / DESCRIPTION', 75, tableY + 7, { width: 185 });
        doc.text('PRINT SPECIFICATIONS', 265, tableY + 7, { width: 115 });
        doc.text('PAGES', 385, tableY + 7, { width: 45, align: 'center' });
        doc.text('COPIES', 435, tableY + 7, { width: 40, align: 'center' });
        doc.text('AMOUNT', 480, tableY + 7, { width: 65, align: 'right' });

        drawFooter(); // Draw footer on page 1

        const rowHeight = 28;
        const pageMaxY = 650;
        let currentY = tableY + 23;
        let globalIndex = 0;

        const optionsArray = Array.isArray(order.printOptions) ? order.printOptions : [order.printOptions];

        // Draw Document Rows
        order.files.forEach((file, idx) => {
            if (currentY + rowHeight > pageMaxY) {
                currentY = startNewPage();
            }

            const opts = optionsArray[idx] || optionsArray[0] || {};
            const isAlt = globalIndex % 2 === 1;

            if (isAlt) {
                doc.rect(40, currentY, 515, rowHeight).fill(lightGray);
            }
            doc.moveTo(40, currentY + rowHeight).lineTo(555, currentY + rowHeight).strokeColor('#f1f5f9').lineWidth(0.8).stroke();

            // Index
            doc.font('Helvetica').fontSize(8).fillColor(themeMuted).text((idx + 1).toString(), 50, currentY + 6);

            // Document Name & Split Part Subtitle
            const fileName = file.originalName?.length > 40 ? file.originalName.slice(0, 37) + '...' : (file.originalName || `Document ${idx + 1}`);
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(themeNavy).text(fileName, 75, currentY + 5, { width: 185 });

            const isSplitPart = Boolean(file.isSplit || file.originalName?.match(/-split\d+\.pdf$/i));
            if (isSplitPart) {
                const match = file.originalName?.match(/-split(\d+)\.pdf$/i);
                const partNum = file.splitPart || (match ? match[1] : idx + 1);
                const totalSplitsStr = file.totalSplits ? ` of ${file.totalSplits}` : '';
                const rangeStr = file.pageRange ? ` (${file.pageRange})` : '';
                doc.font('Helvetica-Bold').fontSize(7).fillColor('#7c3aed').text(`Split Part ${partNum}${totalSplitsStr}${rangeStr}`, 75, currentY + 16, { width: 185 });
            }

            // Print Specifications
            const mode = opts.mode || 'B/W';
            const side = opts.side ? `${opts.side} Sided` : 'Single Sided';
            const size = opts.paperSize || 'A4';
            const pps = opts.pagesPerSheet === 2 ? ' • 2 Pgs/Sheet' : '';
            doc.font('Helvetica').fontSize(7.5).fillColor(themeSlate).text(`${mode} • ${side} • ${size}${pps}`, 265, currentY + 10, { width: 115 });

            // Pages
            const pagesCount = opts.pageRangeType === 'Custom' ? (opts.customPages || 'Custom') : `${file.pageCount || 1} pgs`;
            doc.fontSize(8).text(pagesCount, 385, currentY + 10, { width: 45, align: 'center' });

            // Copies
            doc.text(`${opts.copies || 1} Copy`, 435, currentY + 10, { width: 40, align: 'center' });

            // Amount
            const fileCharge = opts.price || (order.pricing?.printingCharge ? order.pricing.printingCharge / order.files.length : 0);
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(themeNavy).text(`Rs. ${Number(fileCharge).toFixed(2)}`, 480, currentY + 10, { width: 65, align: 'right' });

            currentY += rowHeight;
            globalIndex++;
        });

        // Draw Binding Row (if applicable)
        const hasBinding = optionsArray.some(o => o?.binding && o.binding !== 'Loose Papers');
        if (hasBinding && (order.pricing?.bindingCharge > 0)) {
            if (currentY + rowHeight > pageMaxY) {
                currentY = startNewPage();
            }

            const bindTypes = [...new Set(optionsArray.filter(o => o?.binding && o.binding !== 'Loose Papers').map(o => o.binding))];
            const isAlt = globalIndex % 2 === 1;

            if (isAlt) {
                doc.rect(40, currentY, 515, rowHeight).fill(lightGray);
            }
            doc.moveTo(40, currentY + rowHeight).lineTo(555, currentY + rowHeight).strokeColor('#f1f5f9').lineWidth(0.8).stroke();

            doc.font('Helvetica').fontSize(8).fillColor(themeMuted).text((globalIndex + 1).toString(), 50, currentY + 8);
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(themeNavy).text(`Binding & Finishing (${bindTypes.join(', ')})`, 75, currentY + 8);
            doc.font('Helvetica').fontSize(7.5).fillColor(themeMuted).text('Professional booklet finishing', 265, currentY + 8, { width: 115 });
            doc.text('—', 385, currentY + 8, { width: 45, align: 'center' });
            doc.text('—', 435, currentY + 8, { width: 40, align: 'center' });
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(themeNavy).text(`Rs. ${order.pricing.bindingCharge.toFixed(2)}`, 480, currentY + 8, { width: 65, align: 'right' });

            currentY += rowHeight;
            globalIndex++;
        }

        // Table Bottom Border
        doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor(borderMuted).lineWidth(1).stroke();

        // 7. Summary & Payment Breakdown Section
        const summaryHeight = 115;
        if (currentY + summaryHeight > pageMaxY) {
            currentY = startNewPage();
        }

        const summaryY = currentY + 16;

        // Left Side: Transaction & Guarantee Card
        doc.roundedRect(40, summaryY, 250, 102, 6).fillAndStroke(lightGray, borderLight);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(themeNavy).text('PAYMENT & ORDER STATUS', 52, summaryY + 10);
        doc.font('Helvetica').fontSize(7.5).fillColor(themeSlate);
        doc.text('Payment Mode:', 52, summaryY + 24, { continued: true }).font('Helvetica-Bold').text(` ${payMethodStr}`);
        
        const txnId = order.payment?.transactionId || order.payment?.razorpayPaymentId || order.displayId || orderId.slice(-8).toUpperCase();
        doc.font('Helvetica').text('Transaction Ref:', 52, summaryY + 37, { continued: true }).font('Helvetica-Bold').text(` ${txnId}`);
        doc.font('Helvetica').text('Fulfillment Method:', 52, summaryY + 50, { continued: true }).font('Helvetica-Bold').text(` ${fulfillStr}`);

        // Verified seal badge
        doc.roundedRect(50, summaryY + 67, 230, 24, 4).fillAndStroke('#f0fdf4', '#bbf7d0');
        doc.circle(62, summaryY + 79, 4.5).fill('#16a34a');
        doc.moveTo(60, summaryY + 79).lineTo(61.5, summaryY + 80.5).lineTo(64.5, summaryY + 77.5).strokeColor('#ffffff').lineWidth(1).stroke();
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#15803d').text('Authenticated & Verified Print Express Invoice', 72, summaryY + 75);

        // Right Side: Financial Calculation Table
        const fLabelX = 315, fValX = 470, fValW = 75;
        let fY = summaryY;

        const subtotal = (order.pricing?.printingCharge || 0);
        doc.font('Helvetica').fontSize(8.5).fillColor(themeMuted).text('Print Subtotal:', fLabelX, fY);
        doc.font('Helvetica-Bold').fillColor(themeNavy).text(`Rs. ${subtotal.toFixed(2)}`, fValX, fY, { width: fValW, align: 'right' });

        fY += 14;
        const bindCharge = order.pricing?.bindingCharge || 0;
        doc.font('Helvetica').fillColor(themeMuted).text('Binding Charges:', fLabelX, fY);
        doc.font('Helvetica-Bold').fillColor(themeNavy).text(`Rs. ${bindCharge.toFixed(2)}`, fValX, fY, { width: fValW, align: 'right' });

        fY += 14;
        const delCharge = order.pricing?.deliveryCharge || 0;
        doc.font('Helvetica').fillColor(themeMuted).text('Delivery Fees:', fLabelX, fY);
        doc.font('Helvetica-Bold').fillColor(themeNavy).text(`Rs. ${delCharge.toFixed(2)}`, fValX, fY, { width: fValW, align: 'right' });

        if (order.pricing?.couponDiscount > 0) {
            fY += 14;
            doc.font('Helvetica').fillColor('#ea580c').text('Coupon Savings:', fLabelX, fY);
            doc.font('Helvetica-Bold').fillColor('#ea580c').text(`-Rs. ${order.pricing.couponDiscount.toFixed(2)}`, fValX, fY, { width: fValW, align: 'right' });
        }

        if (order.pricing?.referralDiscount > 0) {
            fY += 14;
            doc.font('Helvetica').fillColor('#ea580c').text('Referral Credits Applied:', fLabelX, fY);
            doc.font('Helvetica-Bold').fillColor('#ea580c').text(`-Rs. ${order.pricing.referralDiscount.toFixed(2)}`, fValX, fY, { width: fValW, align: 'right' });
        }

        if (order.pricing?.walletUsed > 0) {
            fY += 14;
            doc.font('Helvetica').fillColor(themeAccent).text('Wallet Balance Applied:', fLabelX, fY);
            doc.font('Helvetica-Bold').fillColor(themeAccent).text(`-Rs. ${order.pricing.walletUsed.toFixed(2)}`, fValX, fY, { width: fValW, align: 'right' });
        }

        // Grand Total Card
        fY += 18;
        doc.roundedRect(305, fY, 250, 36, 6).fill(themeNavy);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text('TOTAL PAYABLE:', 320, fY + 12);
        doc.fontSize(14).text(`Rs. ${(order.pricing?.totalAmount || 0).toFixed(2)}`, 440, fY + 10, { width: 105, align: 'right' });

        doc.end();
    } catch (error) {
        console.error("PDF Gen Error:", error);
        res.json({ success: false, message: error.message });
    }
};

// Update Order Status (Admin) : /api/order/update-status
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        // Strict validation: Only admin or billing_manager can change order status
        if (req.sellerRole !== 'admin' && req.sellerRole !== 'billing_manager') {
            return res.json({ success: false, message: "Unauthorized. Only Admin or Billing Manager can update status." });
        }

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
        let { amount } = req.body;

        // Ensure amount is a valid number
        amount = parseFloat(amount);

        if (isNaN(amount) || amount <= 0) {
            return res.json({ success: false, message: "Invalid payment amount. Must be greater than 0." });
        }

        // Razorpay minimum amount is 1 INR (100 paise)
        if (amount < 1) {
            return res.json({ success: false, message: "Minimum payment amount is ₹1" });
        }

        const options = {
            amount: Math.round(amount * 100), // Amount in paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };

        const instance = getRazorpayInstance();
        const razorpayOrder = await instance.orders.create(options);

        console.log("SUCCESS: Razorpay Order Created:", razorpayOrder.id);
        res.json({ success: true, razorpayOrder });
    } catch (error) {
        console.error("ERROR: Razorpay Order Creation Failed:", error);
        res.json({ success: false, message: error.message || "Failed to create Razorpay order" });
    }
}

// Verify Razorpay Payment : /api/order/razorpay-verify
export const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
        console.log("Verifying Razorpay Payment. OrderID:", orderId, "RP OrderID:", razorpay_order_id);

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim().replace(/['"]/g, '');
        const expectedSignature = crypto
            .createHmac("sha256", key_secret)
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

        // Fetch the file as an arraybuffer from Cloudinary
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'arraybuffer'
        });

        // Set attachment headers
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || 'download')}"`);
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');

        // Send the buffer directly
        res.send(response.data);
    } catch (error) {
        console.error("Error downloading file:", error);
        res.status(500).json({ success: false, message: "Failed to download file: " + error.message });
    }
};

// Delete order (Admin/Seller) : POST /api/order/delete/:orderId
export const deleteOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Strict validation: Only admin or billing_manager can delete order
        if (req.sellerRole !== 'admin' && req.sellerRole !== 'billing_manager') {
            return res.json({ success: false, message: "Unauthorized. Only Admin or Billing Manager can delete orders." });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        const walletRefund = order.pricing?.walletUsed || 0;
        const refRefund = order.pricing?.referralDiscount || 0;
        const refundAmount = walletRefund + refRefund;

        if (refundAmount > 0 && order.userId) {
            let wallet = await Wallet.findOne({ userId: order.userId });
            if (!wallet) {
                wallet = await Wallet.create({ userId: order.userId, balance: 0, transactions: [] });
            }
            wallet.balance += refundAmount;
            wallet.transactions.push({
                type: 'credit',
                amount: refundAmount,
                description: `Refund for deleted order #${order.displayId || order._id.toString().slice(-8).toUpperCase()}`,
                orderId: order._id,
                addedBy: 'admin'
            });
            await wallet.save();
            await User.findByIdAndUpdate(order.userId, { walletBalance: wallet.balance });
        }

        // Delete order
        await Order.findByIdAndDelete(orderId);

        res.json({ success: true, message: "Order deleted and wallet/referral refund processed successfully" });
    } catch (error) {
        console.error("Delete Order Error:", error);
        res.json({ success: false, message: error.message });
    }
};

// Refund Order Wallet & Referral utilized (Admin/Seller) : POST /api/order/refund-wallet/:orderId
export const refundOrderWallet = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Strict validation: Only admin or billing_manager
        if (req.sellerRole !== 'admin' && req.sellerRole !== 'billing_manager') {
            return res.json({ success: false, message: "Unauthorized. Only Admin or Billing Manager can process refunds." });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        const walletRefund = order.pricing?.walletUsed || 0;
        const refRefund = order.pricing?.referralDiscount || 0;
        const refundAmount = walletRefund + refRefund;

        if (refundAmount <= 0) {
            return res.json({ success: false, message: "No wallet balance or referral discount to refund for this order." });
        }

        if (!order.userId) {
            return res.json({ success: false, message: "Customer account not linked to this order." });
        }

        let wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) {
            wallet = await Wallet.create({ userId: order.userId, balance: 0, transactions: [] });
        }
        wallet.balance += refundAmount;
        wallet.transactions.push({
            type: 'credit',
            amount: refundAmount,
            description: `Refilled utilized wallet/referral coins for order #${order.displayId || order._id.toString().slice(-8).toUpperCase()}`,
            orderId: order._id,
            addedBy: 'admin'
        });
        await wallet.save();
        await User.findByIdAndUpdate(order.userId, { walletBalance: wallet.balance });

        // Reset the utilized amounts in the order pricing to prevent duplicate refunds
        order.pricing.walletUsed = 0;
        order.pricing.referralDiscount = 0;
        await order.save();

        res.json({ success: true, message: `Successfully refunded ₹${refundAmount} utilized amount back to customer wallet.`, balance: wallet.balance });
    } catch (error) {
        console.error("Refund Order Wallet Error:", error);
        res.json({ success: false, message: error.message });
    }
};

// Verify Razorpay Payment Link : /api/order/verify-link
export const verifyRazorpayLink = async (req, res) => {
    try {
        const { orderId, razorpay_payment_link_id, razorpay_payment_id } = req.body;
        if (!orderId || !razorpay_payment_link_id) {
            return res.json({ success: false, message: "Missing required parameters" });
        }

        const order = await Order.findById(orderId);
        if (!order) return res.json({ success: false, message: "Order not found" });

        // If already paid, return success
        if (order.payment.isPaid) {
            return res.json({ success: true, message: "Payment already verified" });
        }

        // Fetch the payment link status from Razorpay API
        const instance = getRazorpayInstance();
        const paymentLink = await instance.paymentLink.fetch(razorpay_payment_link_id);

        if (paymentLink.status === 'paid') {
            order.payment.isPaid = true;
            order.payment.transactionId = razorpay_payment_id || (paymentLink.payments && paymentLink.payments[0] && paymentLink.payments[0].payment_id) || '';
            order.payment.razorpayPaymentId = razorpay_payment_id || (paymentLink.payments && paymentLink.payments[0] && paymentLink.payments[0].payment_id) || '';
            order.status = 'received';
            await order.save();
            return res.json({ success: true, message: "Payment verified successfully" });
        } else {
            return res.json({ success: false, message: `Payment link status is ${paymentLink.status}` });
        }
    } catch (error) {
        console.error("Link Verification Error:", error);
        res.json({ success: false, message: error.message });
    }
};

// Mark Order as Paid by Admin : /api/order/mark-paid/:orderId
export const markOrderAsPaid = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        order.payment.isPaid = true;
        await order.save();

        res.json({ success: true, message: "Order marked as paid successfully" });
    } catch (error) {
        console.error("Mark Paid Error:", error);
        res.json({ success: false, message: error.message });
    }
};

// Mark All User Orders as Paid (Admin) : /api/order/mark-user-paid/:userId
export const markUserOrdersAsPaid = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await Order.updateMany(
            { userId, 'payment.isPaid': false },
            { $set: { 'payment.isPaid': true } }
        );

        res.json({ 
            success: true, 
            message: `Successfully marked ${result.modifiedCount} orders as paid` 
        });
    } catch (error) {
        console.error("Mark User Paid Error:", error);
        res.json({ success: false, message: error.message });
    }
};




