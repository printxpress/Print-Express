import mongoose from "mongoose";

const shopSettingsSchema = new mongoose.Schema({
    name: { type: String, default: "AnbuDigital" },
    address: { type: String, default: "7QWM+5WR, East Coast Rd, Chengam, Tamil Nadu 606709" },
    phone: { type: String, default: "+91 7603-957422" },
    email: { type: String, default: "" },
    whatsapp: { type: String, default: "917603957422" },
    gstNumber: { type: String, default: "" },
    tagline: { type: String, default: "Quality at Speed" },
    locationUrl: { type: String, default: "https://share.google/tKCxInusEMuvdGsvO" },
    deliveryBaseCharge: { type: Number, default: 40 },
    referralCost: { type: Number, default: 100 }
}, { timestamps: true });

const ShopSettings = mongoose.models.shopSettings || mongoose.model('shopSettings', shopSettingsSchema);

export default ShopSettings;
