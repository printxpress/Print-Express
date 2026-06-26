import User from "../models/User.js";
import Order from "../models/Order.js";
import Wallet from "../models/Wallet.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock OTP storage (In production, use Redis or a DB collection with TTL)
const otpStore = new Map();

// Helper function to generate referral code
const generateReferralCode = (name, phone) => {
    const prefix = 'PRX';
    let namePart = 'XX';

    if (name) {
        const cleanName = name.replace(/[^a-zA-Z]/g, '');
        if (cleanName.length >= 3) {
            namePart = (cleanName[0] + cleanName[2]).toUpperCase();
        } else if (cleanName.length >= 1) {
            namePart = (cleanName[0] + (cleanName[1] || cleanName[0])).toUpperCase();
        }
    }

    const midPhone = phone.slice(4, 6);
    const lastPhone = phone.slice(8, 10);

    return `${prefix}${namePart}${midPhone}${lastPhone}`;
}

// Send OTP : /api/user/send-otp
export const sendOtp = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.json({ success: false, message: 'Phone number is required' });

        // Strict validation: Must be exactly 10 digits
        if (!/^\d{10}$/.test(phone)) {
            return res.json({ success: false, message: 'Invalid phone number format' });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP with 5-minute expiry
        otpStore.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000 });

        console.log(`OTP for ${phone}: ${otp}`); // For development/testing

        // TODO: Integrate with WhatsApp Cloud API or Twilio here

        return res.json({ success: true, message: 'OTP sent successfully', otp }); // Returning OTP for dev ease
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Verify OTP & Login/Register : /api/user/verify-otp
export const verifyOtp = async (req, res) => {
    try {
        let { phone, otp, name } = req.body;

        if (!phone || !otp) return res.json({ success: false, message: 'Phone and OTP are required' });

        // Strict input validation
        if (!/^\d{10}$/.test(phone)) return res.json({ success: false, message: 'Invalid phone number format' });
        if (!/^\d{6}$/.test(otp)) return res.json({ success: false, message: 'Invalid OTP format' });

        if (name) {
            name = name.trim();
            if (name.length > 50) return res.json({ success: false, message: 'Name too long' });
            // Basic sanitization for name (allow letters, spaces, optional dots/dashes)
            if (!/^[a-zA-Z\s.\-]+$/.test(name)) return res.json({ success: false, message: 'Invalid characters in name' });
        }

        // DEMO MODE: Accept any OTP (bypass verification)
        // logic is implicitly bypassed as we don't check otpStore here

        let user = await User.findOne({ phone });
        let isNewUser = false;

        if (!user) {
            isNewUser = true;
            // New user registration
            const referralCode = generateReferralCode(name || 'Customer', phone);
            let referredBy = null;

            if (req.body.referralCode) {
                const referrer = await User.findOne({ referralCode: req.body.referralCode.toUpperCase() });
                if (referrer) {
                    referredBy = referrer._id;
                }
            }

            user = await User.create({
                phone,
                name: name || 'Customer',
                role: 'customer',
                referralCode,
                referredBy
            });

            // Initialize Wallet
            const wallet = await Wallet.create({ userId: user._id, balance: 0, transactions: [] });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const isProfileComplete = !!(user.name);

        return res.json({ success: true, user, token, isProfileComplete, isNewUser });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Check Auth : /api/user/is-auth
export const isAuth = async (req, res) => {
    try {
        const userId = req.userId;
        let user = await User.findById(userId);
        if (!user) return res.json({ success: false, message: 'User not found' });

        // Migrate legacy referral codes to new format
        if (!user.referralCode || user.referralCode.startsWith('PRINT')) {
            const newCode = generateReferralCode(user.name, user.phone);
            user.referralCode = newCode;
            await user.save();
        }

        return res.json({ success: true, user });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Logout User : /api/user/logout
export const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
        });
        return res.json({ success: true, message: "Logged Out" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Update User Profile : /api/user/update-profile
export const updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { name, email, address } = req.body;

        // Validate mandatory address fields if address is being updated
        if (address) {
            const requiredFields = ['line1', 'pincode', 'city', 'state'];
            for (const field of requiredFields) {
                if (!address[field]) {
                    return res.json({ success: false, message: `Address field ${field} is mandatory` });
                }
            }
            if (!/^\d{6}$/.test(address.pincode)) {
                return res.json({ success: false, message: 'Invalid Pincode format (6 digits required)' });
            }
        }

        if (email) {
            const existingUser = await User.findOne({ email });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.json({ success: false, message: 'Email already in use' });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(userId, {
            name,
            email,
            address
        }, { new: true });

        if (!updatedUser) return res.json({ success: false, message: 'User not found' });

        return res.json({ success: true, message: 'Profile Updated', user: updatedUser });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Get All Users (Admin) : /api/user/all
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).populate('referredBy', 'name phone').sort({ createdAt: -1 }).lean();
        const orders = await Order.find({});

        const usersWithStats = users.map(user => {
            const userOrders = orders.filter(o => o.userId?.toString() === user._id.toString());
            const totalSpent = userOrders.reduce((sum, o) => sum + (o.pricing?.totalAmount || 0), 0);
            return {
                ...user,
                orders: userOrders.length,
                totalSpent
            };
        });

        return res.json({ success: true, users: usersWithStats });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Admin Update Customer : /api/user/update-customer
export const updateCustomer = async (req, res) => {
    try {
        const { userId, name, email, phone, city, referralBalance } = req.body;
        const updatedUser = await User.findByIdAndUpdate(userId, {
            name, email, phone, city, referralBalance
        }, { new: true });

        if (!updatedUser) return res.json({ success: false, message: 'Customer not found' });
        res.json({ success: true, message: 'Customer updated successfully', user: updatedUser });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Admin Delete Customer : /api/user/delete-customer
export const deleteCustomer = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findByIdAndDelete(userId);
        if (!user) return res.json({ success: false, message: 'Customer not found' });

        // Also delete associated wallet
        await Wallet.findOneAndDelete({ userId });

        res.json({ success: true, message: 'Customer and wallet deleted successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Get Referred Persons : /api/user/referred-persons
export const getReferredPersons = async (req, res) => {
    try {
        const userId = req.userId;
        const referredUsers = await User.find({ referredBy: userId }).select('name phone createdAt').sort({ createdAt: -1 });
        return res.json({ success: true, referrals: referredUsers });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}
