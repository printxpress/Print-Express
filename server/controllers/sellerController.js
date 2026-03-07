import jwt from 'jsonwebtoken';
import Order from "../models/Order.js";
import User from "../models/User.js";

// Login Seller : /api/seller/login
export const sellerLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // EMERGENCY MOCK MODE: Check if DB is connected
        if (global.isDbConnected === false) {
            console.log('⚠️  Using Mock Staff Login (DB Disconnected)');

            let mockUser = null;
            if (email === 'admin@printexpress.com' && password === 'Anbu@24') {
                mockUser = { _id: 'mock_admin_id', role: 'admin', email };
            } else if (email === 'billing@printexpress.com' && password === 'Billing@123') {
                mockUser = { _id: 'mock_billing_id', role: 'billing_manager', email };
            }

            if (mockUser) {
                const token = jwt.sign({ id: mockUser._id, role: mockUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
                res.cookie('sellerToken', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                });
                return res.json({ success: true, message: "Logged In (Mock Mode)", role: mockUser.role });
            } else {
                return res.json({ success: false, message: "Invalid credentials (Mock Mode)" });
            }
        }

        // Find user by email (or phone/name if preferred, but email/staffId is standard)
        const user = await User.findOne({
            $or: [{ email: email }, { name: email }],
            role: { $in: ['admin', 'billing_manager'] }
        });

        if (!user) {
            return res.json({ success: false, message: "Staff account not found" });
        }

        // Simple password check (Note: In production use bcrypt.compare)
        if (user.password !== password) {
            return res.json({ success: false, message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('sellerToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.json({ success: true, message: "Logged In", role: user.role });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Seller isAuth : /api/seller/is-auth
export const isSellerAuth = async (req, res) => {
    try {
        return res.json({ success: true, role: req.sellerRole })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Logout Seller : /api/seller/logout
export const sellerLogout = async (req, res) => {
    try {
        res.clearCookie('sellerToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        });
        return res.json({ success: true, message: "Logged Out" })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Get Seller Analytics : /api/seller/analytics
export const getSellerAnalytics = async (req, res) => {
    try {
        const orders = await Order.find({});
        const usersCount = await User.countDocuments({});

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((acc, order) => acc + (order.pricing.totalAmount || 0), 0);
        const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

        // Calculate weekly distribution (last 7 days)
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyStats = days.map(day => ({ day, orders: 0, revenue: 0 }));

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        orders.forEach(order => {
            const orderDate = new Date(order.createdAt);
            if (orderDate >= sevenDaysAgo) {
                const dayIndex = orderDate.getDay();
                weeklyStats[dayIndex].orders += 1;
                weeklyStats[dayIndex].revenue += (order.pricing.totalAmount || 0);
            }
        });

        // Top Services (More comprehensive breakdown)
        const servicesStats = {
            'B/W Printing': orders.filter(o => o.printOptions.mode === 'B/W').length,
            'Color Printing': orders.filter(o => o.printOptions.mode === 'Color').length,
            'Binding': orders.filter(o => o.printOptions.binding !== 'Loose Papers').length,
            'POS Services': orders.filter(o => o.files.some(f => f.fileType === 'POS Service')).length
        };

        const topServices = Object.keys(servicesStats).map(name => ({
            name,
            count: servicesStats[name],
            revenue: orders.filter(o => {
                if (name === 'POS Services') return o.files.some(f => f.fileType === 'POS Service');
                if (name === 'B/W Printing') return o.printOptions.mode === 'B/W' && !o.files.some(f => f.fileType === 'POS Service');
                if (name === 'Color Printing') return o.printOptions.mode === 'Color' && !o.files.some(f => f.fileType === 'POS Service');
                if (name === 'Binding') return o.printOptions.binding !== 'Loose Papers' && !o.files.some(f => f.fileType === 'POS Service');
                return false;
            }).reduce((acc, o) => acc + (o.pricing.totalAmount || 0), 0),
            color: name === 'B/W Printing' ? 'blue' : (name === 'Color Printing' ? 'orange' : (name === 'Binding' ? 'green' : 'purple'))
        })).sort((a, b) => b.count - a.count);

        return res.json({
            success: true,
            stats: {
                totalOrders,
                totalRevenue,
                avgOrderValue,
                totalUsers: usersCount,
                posOrders: orders.filter(o => o.files.some(f => f.fileType === 'POS Service')).length,
                onlineOrders: orders.filter(o => !o.files.some(f => f.fileType === 'POS Service')).length,
                weeklyStats,
                topServices
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Get Referrals Analytics : /api/seller/referrals
export const getReferrals = async (req, res) => {
    try {
        const users = await User.find({
            $or: [
                { referralBalance: { $gt: 0 } },
                { referredBy: { $exists: true } }
            ]
        }).populate('referredBy', 'name phone email').select('name phone email referralBalance referralCode referredBy');

        return res.json({ success: true, users });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}