import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const ShopSettings = () => {
    const { axios } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        whatsapp: '',
        gstNumber: '',
        tagline: '',
        locationUrl: '',
        deliveryBaseCharge: 40,
        upiId: ''
    });

    const fetchSettings = async () => {
        try {
            const { data } = await axios.get('/api/shop/settings');
            if (data.success) {
                setSettings({ ...settings, ...data.settings });
            }
        } catch (error) {
            toast.error("Failed to load settings");
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();

        // Client-side validation
        if (settings.phone && !/^\d{10,15}$/.test(settings.phone.replace(/\s/g, ''))) {
            toast.error("Phone number must be 10–15 digits");
            return;
        }
        if (settings.locationUrl && settings.locationUrl.trim() !== '') {
            try {
                new URL(settings.locationUrl);
            } catch {
                toast.error("Please enter a valid Location URL (must start with https://)");
                return;
            }
        }

        setLoading(true);
        try {
            const { data } = await axios.post('/api/shop/update', settings);
            if (data.success) {
                toast.success("Settings Updated Successfully ✅");
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Update failed");
        } finally {
            setLoading(false);
        }
    };

    const testLocationUrl = () => {
        if (!settings.locationUrl || settings.locationUrl.trim() === '') {
            toast.error("No location URL set yet");
            return;
        }
        try {
            new URL(settings.locationUrl);
            window.open(settings.locationUrl, '_blank');
        } catch {
            toast.error("Invalid URL — please fix before saving");
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h2 className="text-2xl font-bold font-outfit">Store Settings</h2>
                <p className="text-text-muted">Configure your shop identity, contact information, and location</p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
                {/* Identity */}
                <div className="card-premium p-8 space-y-6">
                    <h3 className="font-bold text-lg flex items-center gap-2">🏪 Store Identity</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Store Name</label>
                            <input
                                value={settings.name}
                                onChange={e => setSettings({ ...settings, name: e.target.value })}
                                className="input-field"
                                placeholder="AnbuDigital"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Tagline</label>
                            <input
                                value={settings.tagline}
                                onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                                className="input-field"
                                placeholder="Quality at Speed"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">GST Number</label>
                            <input
                                value={settings.gstNumber}
                                onChange={e => setSettings({ ...settings, gstNumber: e.target.value })}
                                className="input-field"
                                placeholder="GST registration number"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Base Delivery Charge (₹)</label>
                            <input
                                type="number"
                                value={settings.deliveryBaseCharge}
                                onChange={e => setSettings({ ...settings, deliveryBaseCharge: Number(e.target.value) })}
                                className="input-field"
                                placeholder="40"
                                required
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Store Address</label>
                            <textarea
                                value={settings.address}
                                onChange={e => setSettings({ ...settings, address: e.target.value })}
                                className="input-field min-h-[90px] py-3"
                                placeholder="Full store address for customers to see"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Contact */}
                <div className="card-premium p-8 space-y-6">
                    <h3 className="font-bold text-lg flex items-center gap-2">📞 Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Contact Phone (Cell)</label>
                            <input
                                value={settings.phone}
                                onChange={e => setSettings({ ...settings, phone: e.target.value })}
                                className="input-field"
                                placeholder="10-digit mobile number"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">WhatsApp Number (with country code)</label>
                            <input
                                value={settings.whatsapp}
                                onChange={e => setSettings({ ...settings, whatsapp: e.target.value })}
                                className="input-field"
                                placeholder="91XXXXXXXXXX"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Contact Email</label>
                            <input
                                type="email"
                                value={settings.email}
                                onChange={e => setSettings({ ...settings, email: e.target.value })}
                                className="input-field"
                                placeholder="support@example.com"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">UPI ID (for Payments)</label>
                            <input
                                value={settings.upiId}
                                onChange={e => setSettings({ ...settings, upiId: e.target.value })}
                                className="input-field"
                                placeholder="yourname@upi"
                            />
                        </div>
                    </div>
                </div>

                {/* Location */}
                <div className="card-premium p-8 space-y-6">
                    <h3 className="font-bold text-lg flex items-center gap-2">📍 Store Location</h3>
                    <p className="text-sm text-text-muted">This URL will be shown to customers as a "Reach Us" button after they place an order.</p>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Google Maps / Location URL</label>
                        <div className="flex gap-3">
                            <input
                                value={settings.locationUrl}
                                onChange={e => setSettings({ ...settings, locationUrl: e.target.value })}
                                className="input-field flex-1"
                                placeholder="https://maps.google.com/?q=..."
                            />
                            <button
                                type="button"
                                onClick={testLocationUrl}
                                className="px-4 py-2 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 font-bold text-sm hover:bg-blue-100 transition-all whitespace-nowrap"
                            >
                                Test Link 🗺️
                            </button>
                        </div>
                    </div>

                    {/* Live Preview */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Customer Preview</p>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex-1 space-y-1">
                                <p className="font-bold text-sm">{settings.name || 'AnbuDigital'}</p>
                                <p className="text-xs text-text-muted">{settings.address || 'Address not set'}</p>
                                <p className="text-xs text-text-muted">📞 Cell: {settings.phone || 'Not set'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={testLocationUrl}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-md hover:shadow-blue-200 transition-all"
                            >
                                📍 Reach Us
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <button type="submit" disabled={loading} className="btn-primary px-10 py-3 text-base">
                        {loading ? 'Saving...' : 'Save All Settings 💾'}
                    </button>
                </div>
            </form >
        </div >
    );
};

export default ShopSettings;
