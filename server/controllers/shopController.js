import ShopSettings from "../models/ShopSettings.js";

// Get Shop Settings : /api/shop/settings
export const getShopSettings = async (req, res) => {
    try {
        let settings = await ShopSettings.findOne({});
        if (!settings) {
            // Seed AnbuDigital default settings
            settings = await ShopSettings.create({
                name: "AnbuDigital",
                address: "Bengaluru Main Road, Theruvalluvar Nagar, Chengam 606701",
                phone: "9894957422",
                email: "",
                whatsapp: "919894957422",
                tagline: "Quality at Speed",
                locationUrl: "",
                deliveryBaseCharge: 40
            });
        }
        res.json({ success: true, settings });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Update Shop Settings : /api/shop/update
export const updateShopSettings = async (req, res) => {
    try {
        const { name, address, phone, email, whatsapp, gstNumber, tagline, locationUrl, deliveryBaseCharge } = req.body;

        // Validate phone
        if (phone && !/^\d{10,15}$/.test(phone.replace(/\s/g, ''))) {
            return res.json({ success: false, message: "Invalid phone number format" });
        }

        // Validate locationUrl if provided
        if (locationUrl && locationUrl.trim() !== '') {
            try {
                new URL(locationUrl);
            } catch {
                return res.json({ success: false, message: "Invalid location URL format" });
            }
        }

        const settings = await ShopSettings.findOneAndUpdate({}, {
            name, address, phone, email, whatsapp, gstNumber, tagline,
            locationUrl: locationUrl || '',
            deliveryBaseCharge
        }, { new: true, upsert: true });

        res.json({ success: true, message: "Settings Updated", settings });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}
