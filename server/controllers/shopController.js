import ShopSettings from "../models/ShopSettings.js";

// Get Shop Settings : /api/shop/settings
export const getShopSettings = async (req, res) => {
    try {
        let settings = await ShopSettings.findOne({});
        if (!settings) {
            // Seed AnbuDigital default settings
            settings = await ShopSettings.create({
                name: "AnbuDigital",
                address: "7QWM+5WR, East Coast Rd, Chengam, Tamil Nadu 606709",
                phone: "+91 7603-957422",
                email: "",
                whatsapp: "917603957422",
                tagline: "Quality at Speed",
                locationUrl: "https://share.google/tKCxInusEMuvdGsvO",
                deliveryBaseCharge: 40,
                referralCost: 100
            });
        } else {
            // Auto-update to new details if old ones are found
            let needsUpdate = false;
            if (settings.address === "Bengaluru Main Road, Theruvalluvar Nagar, Chengam 606701") {
                settings.address = "7QWM+5WR, East Coast Rd, Chengam, Tamil Nadu 606709";
                needsUpdate = true;
            }
            if (settings.phone === "9894957422" || settings.phone === "+91 98949 57422") {
                settings.phone = "+91 7603-957422";
                needsUpdate = true;
            }
            if (settings.whatsapp === "919894957422") {
                settings.whatsapp = "917603957422";
                needsUpdate = true;
            }
            if (!settings.locationUrl || settings.locationUrl === "") {
                settings.locationUrl = "https://share.google/tKCxInusEMuvdGsvO";
                needsUpdate = true;
            }
            if (needsUpdate) {
                await settings.save();
            }
        }
        res.json({ success: true, settings });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Update Shop Settings : /api/shop/update
export const updateShopSettings = async (req, res) => {
    try {
        const { name, address, phone, email, whatsapp, gstNumber, tagline, locationUrl, deliveryBaseCharge, referralCost } = req.body;

        // Validate phone
        if (phone && !/^\d{10,15}$/.test(phone.replace(/[\s+-]/g, ''))) {
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
            deliveryBaseCharge,
            referralCost
        }, { new: true, upsert: true });

        res.json({ success: true, message: "Settings Updated", settings });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}
