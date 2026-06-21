import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Helper to get Razorpay instance
const getRazorpayInstance = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay API keys are missing in server environment");
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

// Get wallet balance : GET /api/wallet/balance
export const getBalance = async (req, res) => {
    try {
        const userId = req.userId;
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
        }
        const user = await User.findById(userId);
        return res.json({ success: true, balance: wallet.balance, name: user?.name, phone: user?.phone });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get wallet transactions : GET /api/wallet/transactions
export const getTransactions = async (req, res) => {
    try {
        const userId = req.userId;
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) return res.json({ success: true, transactions: [] });
        return res.json({ success: true, transactions: wallet.transactions.sort((a, b) => b.createdAt - a.createdAt) });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Admin: Add coins to user wallet : POST /api/wallet/add
export const addCoins = async (req, res) => {
    try {
        const { userId, amount, description } = req.body;
        if (!userId || !amount || amount <= 0) return res.json({ success: false, message: 'Invalid input' });

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
        }

        wallet.balance += amount;
        wallet.transactions.push({
            type: 'credit',
            amount,
            description: description || 'Coins added by admin',
            addedBy: 'admin'
        });
        await wallet.save();

        // Sync user model balance
        await User.findByIdAndUpdate(userId, { walletBalance: wallet.balance });

        return res.json({ success: true, message: `₹${amount} coins added`, balance: wallet.balance });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Admin: Deduct coins from user wallet : POST /api/wallet/deduct
export const deductCoins = async (req, res) => {
    try {
        const { userId, amount, description } = req.body;
        if (!userId || !amount || amount <= 0) return res.json({ success: false, message: 'Invalid input' });

        const wallet = await Wallet.findOne({ userId });
        if (!wallet || wallet.balance < amount) {
            return res.json({ success: false, message: 'Insufficient balance' });
        }

        wallet.balance -= amount;
        wallet.transactions.push({
            type: 'debit',
            amount,
            description: description || 'Coins deducted by admin',
            addedBy: 'admin'
        });
        await wallet.save();

        await User.findByIdAndUpdate(userId, { walletBalance: wallet.balance });

        return res.json({ success: true, message: `₹${amount} coins deducted`, balance: wallet.balance });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Admin: Get all wallets : GET /api/wallet/all
export const getAllWallets = async (req, res) => {
    try {
        const wallets = await Wallet.find({}).populate('userId', 'name phone email walletBalance');
        return res.json({ success: true, wallets });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Create Wallet Recharge Session : POST /api/wallet/recharge
export const rechargeWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.json({ success: false, message: 'Invalid amount' });

        const options = {
            amount: Math.round(amount * 100), // paise
            currency: 'INR',
            receipt: `wallet_rc_${Date.now()}`
        };

        const razorpayOrder = await getRazorpayInstance().orders.create(options);
        return res.json({ success: true, razorpayOrder });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Verify Wallet Payment : POST /api/wallet/verify
export const verifyWalletPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
        const userId = req.userId;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
            }

            wallet.balance += Number(amount);
            wallet.transactions.push({
                type: 'credit',
                amount: Number(amount),
                description: 'Wallet top-up via Razorpay',
                addedBy: 'user'
            });
            await wallet.save();

            await User.findByIdAndUpdate(userId, { walletBalance: wallet.balance });

            return res.json({ success: true, message: "Wallet recharged successfully", balance: wallet.balance });
        } else {
            return res.json({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
