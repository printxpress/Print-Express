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
        referralCost: 100
    });

    const [pageVisibility, setPageVisibility] = useState({
        banners: false,
        services: false,
        analytics: false,
        followups: false
    });

    useEffect(() => {
        const saved = localStorage.getItem('adminPageVisibility');
        if (saved) {
            setPageVisibility(JSON.parse(saved));
        }
    }, []);

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
        <div className="space-y-10 max-w-5xl">
            {/* Header segment */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-8 rounded-3xl shadow-xl">
                <div>
                    <h2 className="text-3xl font-extrabold font-outfit tracking-tight flex items-center gap-3">
                        <span>⚙️</span> Store Settings
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">Configure your shop profile, contact networks, location mapping, and page visibilities.</p>
                </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-8">
                {/* Store Identity Card */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">
                            🏪
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">Store Identity</h3>
                            <p className="text-xs text-text-muted">Define your company branding, tax registration, and checkout cashbacks</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Store Name</label>
                            <input
                                value={settings.name}
                                onChange={e => setSettings({ ...settings, name: e.target.value })}
                                className="input-field w-full font-semibold"
                                placeholder="AnbuDigital"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tagline</label>
                            <input
                                value={settings.tagline}
                                onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                                className="input-field w-full font-semibold"
                                placeholder="Quality at Speed"
                             />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">GST Number</label>
                            <input
                                value={settings.gstNumber}
                                onChange={e => setSettings({ ...settings, gstNumber: e.target.value })}
                                className="input-field w-full font-semibold"
                                placeholder="GST registration number"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Base Delivery Charge</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                <input
                                    type="number"
                                    value={settings.deliveryBaseCharge}
                                    onChange={e => setSettings({ ...settings, deliveryBaseCharge: Number(e.target.value) })}
                                    className="input-field pl-8 font-semibold w-full"
                                    placeholder="40"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Referral Earn Amount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                <input
                                    type="number"
                                    value={settings.referralCost}
                                    onChange={e => setSettings({ ...settings, referralCost: Number(e.target.value) })}
                                    className="input-field pl-8 font-semibold w-full"
                                    placeholder="100"
                                    required
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Store Address</label>
                            <textarea
                                value={settings.address}
                                onChange={e => setSettings({ ...settings, address: e.target.value })}
                                className="input-field min-h-[100px] py-3 w-full font-semibold"
                                placeholder="Full store address for customers to see"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Contact Information Card */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl">
                            📞
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">Contact Information</h3>
                            <p className="text-xs text-text-muted">Maintain active contact channels for order follow-ups and user chats</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Contact Phone (Cell)</label>
                            <input
                                value={settings.phone}
                                onChange={e => setSettings({ ...settings, phone: e.target.value })}
                                className="input-field w-full font-semibold"
                                placeholder="10-digit mobile number"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">WhatsApp Support Number (with Country Code)</label>
                            <input
                                value={settings.whatsapp}
                                onChange={e => setSettings({ ...settings, whatsapp: e.target.value })}
                                className="input-field w-full font-semibold font-mono"
                                placeholder="91XXXXXXXXXX"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Contact Email</label>
                            <input
                                type="email"
                                value={settings.email}
                                onChange={e => setSettings({ ...settings, email: e.target.value })}
                                className="input-field w-full font-semibold"
                                placeholder="support@example.com"
                            />
                        </div>
                    </div>
                </div>

                {/* Store Location Mapping Card */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-xl">
                            📍
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">Store Location Mapping</h3>
                            <p className="text-xs text-text-muted">Link Google Maps coordinates so customers can navigate easily to pick up their orders</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Google Maps / Location URL</label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    value={settings.locationUrl}
                                    onChange={e => setSettings({ ...settings, locationUrl: e.target.value })}
                                    className="input-field flex-1 font-semibold"
                                    placeholder="https://maps.google.com/?q=..."
                                />
                                <button
                                    type="button"
                                    onClick={testLocationUrl}
                                    className="px-5 py-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-bold text-sm hover:bg-blue-100 transition-all whitespace-nowrap"
                                >
                                    Test Live Link 🗺️
                                </button>
                            </div>
                        </div>

                        {/* Customer Live Preview Widget */}
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-150 space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">User Receipt Live Preview</p>
                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Active View</span>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                                <div className="flex-1 space-y-1">
                                    <p className="font-extrabold text-slate-800 text-base font-outfit">{settings.name || 'AnbuDigital'}</p>
                                    <p className="text-xs text-slate-500 font-medium">{settings.address || 'Address not configured yet'}</p>
                                    <p className="text-xs text-slate-500 font-bold">📞 Contact support: {settings.phone || 'Not configured'}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={testLocationUrl}
                                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md hover:shadow-blue-200 hover:-translate-y-0.5 transition-all flex-shrink-0"
                                >
                                    📍 Navigate / Reach Us
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Visibility Panel */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl">
                            👁️
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">Sidebar Page Visibility</h3>
                            <p className="text-xs text-text-muted">Enable or disable optional management features on the left navigation panel</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { id: 'banners', name: 'Banners Dashboard' },
                            { id: 'services', name: 'Services Directory' },
                            { id: 'analytics', name: 'Sales Analytics' },
                            { id: 'followups', name: 'Follow-ups Campaigns' }
                        ].map(page => (
                            <label key={page.id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all">
                                <input
                                    type="checkbox"
                                    checked={!!pageVisibility[page.id]}
                                    onChange={e => {
                                        const updated = { ...pageVisibility, [page.id]: e.target.checked };
                                        setPageVisibility(updated);
                                        localStorage.setItem('adminPageVisibility', JSON.stringify(updated));
                                        toast.success(`${page.name} visibility updated!`);
                                    }}
                                    className="w-5 h-5 rounded text-primary focus:ring-primary border-slate-300 transition-all cursor-pointer"
                                />
                                <p className="text-sm font-bold text-slate-700">{page.name}</p>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Save All Settings */}
                <div className="flex flex-col items-center gap-3 pt-4">
                    <button type="submit" disabled={loading} className="btn-primary w-full max-w-md py-4 text-base font-bold shadow-xl shadow-primary/25 hover:scale-[1.01] transition-transform">
                        {loading ? 'Saving adjustments...' : 'Save All Settings 💾'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ShopSettings;
