import Order from "../models/Order.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import Wallet from "../models/Wallet.js";
import Pricing from "../models/Pricing.js";
import Coupon from "../models/Coupon.js";
import SupportQuery from "../models/SupportQuery.js";
import { v2 as cloudinary } from 'cloudinary';

// Export All Data : GET /api/system/export
export const exportSystemData = async (req, res) => {
    try {
        const data = {
            orders: await Order.find({}),
            users: await User.find({ role: 'customer' }), // Only export customers
            products: await Product.find({}),
            services: await Service.find({}),
            wallets: await Wallet.find({}),
            pricingRules: await Pricing.find({}),
            coupons: await Coupon.find({}),
            supportQueries: await SupportQuery.find({}),
            exportDate: new Date().toISOString(),
            system: "Print Express"
        };

        res.json({ success: true, data });
    } catch (error) {
        console.log("Export Error:", error.message);
        res.json({ success: false, message: error.message });
    }
}

// Clear All Data : POST /api/system/clear
export const clearSystemData = async (req, res) => {
    try {
        const { confirm } = req.body;
        if (confirm !== 'I UNDERSTAND') {
            return res.json({ success: false, message: "Safety confirmation failed" });
        }

        // Find all orders that still have file URLs
        const orders = await Order.find({
            'files.url': { $ne: '' }
        });

        let deletedCount = 0;

        for (const order of orders) {
            for (const file of order.files) {
                if (file.url) {
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

        res.json({ success: true, message: `Purged files for ${deletedCount} print orders. Customer and order records kept intact.` });
    } catch (error) {
        console.log("Cleanup Error:", error.message);
        res.json({ success: false, message: error.message });
    }
}
