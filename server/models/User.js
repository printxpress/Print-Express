import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    name: { type: String },
    email: { type: String, unique: true, sparse: true },
    password: { type: String },
    role: { type: String, enum: ['admin', 'customer', 'billing_manager'], default: 'customer' },
    address: {
        line1: String,
        pincode: String,
        city: String,
        district: String,
        state: String,
        landmark: String,
        country: { type: String, default: 'India' }
    },
    walletBalance: { type: Number, default: 0, min: 0 },
    referralBalance: { type: Number, default: 0, min: 0 },
    cart: { type: Object, default: {} },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    referralCode: { type: String, unique: true, sparse: true },
    lastLogin: Date
}, { timestamps: true, minimize: false });

const User = mongoose.models.user || mongoose.model('user', userSchema);

export default User;