import mongoose from "mongoose";

const shopSettingsSchema = new mongoose.Schema({
    name: { type: String, default: "AnbuDigital" },
    address: { type: String, default: "Bengaluru Main Road, Theruvalluvar Nagar, Chengam 606701" },
    phone: { type: String, default: "9894957422" },
    email: { type: String, default: "" },
    whatsapp: { type: String, default: "919894957422" },
    gstNumber: { type: String, default: "" },
    tagline: { type: String, default: "Quality at Speed" },
    locationUrl: { type: String, default: "" },
    deliveryBaseCharge: { type: Number, default: 40 }
}, { timestamps: true });

const ShopSettings = mongoose.models.shopSettings || mongoose.model('shopSettings', shopSettingsSchema);

export default ShopSettings;
