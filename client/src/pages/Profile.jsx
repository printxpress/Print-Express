import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const Profile = () => {
    const { axios, user, setUser, setShowUserLogin } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [queries, setQueries] = useState([]);
    const [rechargeAmount, setRechargeAmount] = useState(10);
    const [isEditing, setIsEditing] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        address: {
            line1: '',
            pincode: '',
            city: '',
            district: '',
            state: '',
            landmark: '',
            country: 'India'
        }
    });

    const [queryForm, setQueryForm] = useState({ subject: '', message: '' });

    useEffect(() => {
        if (!user) {
            setShowUserLogin(true);
            return;
        }

        fetchQueries();
        setFormData({
            name: user.name || '',
            email: user.email || '',
            address: {
                line1: user.address?.line1 || '',
                pincode: user.address?.pincode || '',
                city: user.address?.city || '',
                district: user.address?.district || '',
                state: user.address?.state || '',
                landmark: user.address?.landmark || '',
                country: user.address?.country || 'India'
            }
        });

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('recharge') === 'success') {
            toast.success("Wallet recharged successfully!");
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (urlParams.get('edit') === 'true') {
            setIsEditing(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (urlParams.get('edit') === 'true') {
            setIsEditing(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [user, setShowUserLogin]);

    // Auto-detect City/State from Pincode
    useEffect(() => {
        if (formData.address.pincode.length === 6) {
            const fetchPincodeDetails = async () => {
                try {
                    const response = await fetch(`https://api.postalpincode.in/pincode/${formData.address.pincode}`);
                    const data = await response.json();
                    if (data[0].Status === "Success") {
                        const details = data[0].PostOffice[0];
                        setFormData(prev => ({
                            ...prev,
                            address: {
                                ...prev.address,
                                city: details.District,
                                state: details.State,
                                country: 'India'
                            }
                        }));
                        toast.success("Location detected! 📍");
                        setErrors(prev => ({ ...prev, pincode: null }));
                    } else {
                        toast.error("Invalid Pincode");
                        setErrors(prev => ({ ...prev, pincode: "Invalid Pincode" }));
                    }
                } catch (error) {
                    console.error("Pincode fetch error:", error);
                }
            };
            fetchPincodeDetails();
        }
    }, [formData.address.pincode]);

    const fetchQueries = async () => {
        try {
            const { data } = await axios.get('/api/support/user');
            if (data.success) setQueries(data.queries);
        } catch (error) {
            console.error(error);
        }
    };

    const validateForm = () => {
        let newErrors = {};
        if (!formData.name) newErrors.name = "Name is required";
        if (!formData.email) newErrors.email = "Email is required";
        if (!formData.address.line1) newErrors.line1 = "Street address is required";
        if (!/^\d{6}$/.test(formData.address.pincode)) newErrors.pincode = "Invalid pincode (6 digits)";
        if (!formData.address.city) newErrors.city = "City is required";
        if (!formData.address.state) newErrors.state = "State is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            toast.error("Please fix the errors before saving");
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.post('/api/user/update-profile', formData);
            if (data.success) {
                toast.success("Profile Secured Successfully! 🚀");
                setUser(data.user);
                setIsEditing(false);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Update failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleRecharge = async () => {
        if (!rechargeAmount || rechargeAmount <= 0) return toast.error("Please enter a valid amount");
        setLoading(true);
        try {
            const { data } = await axios.post('/api/wallet/recharge', { amount: rechargeAmount });
            if (data.success) {
                const rzpOptions = {
                    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                    amount: data.razorpayOrder.amount,
                    currency: data.razorpayOrder.currency,
                    name: "Print Express Wallet",
                    description: "Add credits to your wallet",
                    order_id: data.razorpayOrder.id,
                    handler: async (response) => {
                        try {
                            const { data: verifyData } = await axios.post('/api/wallet/verify', {
                                ...response,
                                amount: rechargeAmount
                            });
                            if (verifyData.success) {
                                toast.success("Wallet recharged! 🚀");
                                setUser(prev => ({ ...prev, walletBalance: verifyData.balance }));
                            } else {
                                toast.error(verifyData.message);
                            }
                        } catch (err) {
                            toast.error("Verification failed");
                        }
                    },
                    prefill: {
                        name: user.name,
                        email: user.email,
                        contact: user.phone
                    },
                    theme: { color: "#2563eb" }
                };
                const rzp = new window.Razorpay(rzpOptions);
                rzp.open();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Recharge failed");
        } finally {
            setLoading(false);
        }
    };

    const handleQuerySubmit = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.post('/api/support/create', queryForm);
            if (data.success) {
                toast.success("Query submitted successfully");
                setQueryForm({ subject: '', message: '' });
                fetchQueries();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to submit query");
        }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center font-outfit text-slate-500">Authenticating...</div>;

    return (
        <div className="max-w-6xl mx-auto py-12 px-4 space-y-12 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-border pb-10">
                <div className="space-y-2">
                    <h1 className="text-5xl font-black font-outfit tracking-tight text-slate-900">Account Configuration</h1>
                    <p className="text-slate-500 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Active Session: {user?.phone}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <div className="card-premium bg-slate-900 text-white p-6 min-w-[280px] relative overflow-hidden group">
                        <div className="relative z-10 flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Digital Credits</p>
                                <p className="text-4xl font-black font-outfit">₹{user?.walletBalance || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-md border border-white/10">💳</div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-600/30 transition-colors"></div>
                    </div>

                    <div className="card-premium bg-indigo-950 text-white p-6 min-w-[280px] relative overflow-hidden group">
                        <div className="relative z-10 flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Referral Balance</p>
                                <p className="text-4xl font-black font-outfit">₹{user?.referralBalance || 0}</p>
                            </div>
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-md border border-white/10">🎁</div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-600/30 transition-colors"></div>
                    </div>

                    <div className="card-premium p-6 space-y-4 border-blue-100 bg-blue-50/30">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                                <span className="text-base text-blue-600">⚡</span> Quick Topup
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {[10, 50, 100].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => setRechargeAmount(amt)}
                                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-black border-2 transition-all ${rechargeAmount === amt ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-400'}`}
                                >
                                    ₹{amt}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleRecharge}
                            disabled={loading}
                            className="w-full py-2 bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Processing...' : 'Add Credits →'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Main Dashboard */}
                <div className="lg:col-span-8 space-y-10">

                    {/* Security & Access Section */}
                    <div className="card-premium p-8 space-y-8 relative overflow-hidden">
                        <div className="flex justify-between items-center relative z-10">
                            <h3 className="text-2xl font-black font-outfit flex items-center gap-3">
                                <span className="w-1.5 h-8 bg-blue-600 rounded-full"></span>
                                Identity & Address
                            </h3>
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-6 py-2 bg-slate-50 hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-100"
                                >
                                    Modify Profiling
                                </button>
                            )}
                        </div>

                        {!isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 opacity-90 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Authentication Name</p>
                                        <p className="text-lg font-bold text-slate-800">{user?.name || 'Not Configured'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified Email</p>
                                        <p className="text-lg font-bold text-slate-800">{user?.email || 'No email synced'}</p>
                                    </div>
                                </div>
                                <div className="space-y-6 bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Logistics Address</p>
                                        <p className="text-sm font-bold text-slate-800 leading-relaxed uppercase">
                                            {user?.address?.line1 ? (
                                                <>
                                                    {user.address.line1}, <br />
                                                    {user.address.landmark && `${user.address.landmark}, `}
                                                    {user.address.city}, {user.address.district}, <br />
                                                    {user.address.state} - {user.address.pincode} <br />
                                                    <span className="text-blue-600">{user.address.country}</span>
                                                </>
                                            ) : 'Address database empty'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in zoom-in-95 duration-500">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">FULL LEGAL NAME</label>
                                    <input
                                        aria-label="Full Name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className={`input-field ${errors.name ? 'border-red-400 bg-red-50/30' : ''}`}
                                        placeholder="John Doe"
                                    />
                                    {errors.name && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.name}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">EMAIL ADDRESS</label>
                                    <input
                                        aria-label="Email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className={`input-field ${errors.email ? 'border-red-400 bg-red-50/30' : ''}`}
                                        placeholder="user@example.com"
                                    />
                                    {errors.email && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.email}</p>}
                                </div>

                                <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-2">
                                    <p className="text-xs font-black text-blue-600 mb-6 flex items-center gap-2">
                                        📦 Delivery Address
                                        <span title="Required for calculating accurate delivery rates" className="cursor-help w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[8px]">?</span>
                                    </p>
                                </div>

                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">FLAT / HOUSE NO / BUILDING</label>
                                    <input
                                        value={formData.address.line1}
                                        onChange={e => setFormData({ ...formData, address: { ...formData.address, line1: e.target.value } })}
                                        className={`input-field ${errors.line1 ? 'border-red-400 bg-red-50/30' : ''}`}
                                        placeholder="Flat 101, Print Bldng, Sector 5"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PINCODE</label>
                                    <input
                                        value={formData.address.pincode}
                                        onChange={e => setFormData({ ...formData, address: { ...formData.address, pincode: e.target.value } })}
                                        className={`input-field ${errors.pincode ? 'border-red-400 bg-red-50/30' : ''}`}
                                        placeholder="600001"
                                        maxLength={6}
                                    />
                                    {errors.pincode && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.pincode}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">LANDMARK (OPTIONAL)</label>
                                    <input
                                        value={formData.address.landmark}
                                        onChange={e => setFormData({ ...formData, address: { ...formData.address, landmark: e.target.value } })}
                                        className="input-field"
                                        placeholder="Near Post Office"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CITY / DISTRICT</label>
                                    <input
                                        value={formData.address.city}
                                        onChange={e => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                                        className={`input-field ${errors.city ? 'border-red-400 bg-red-50/30' : ''}`}
                                        placeholder="Chennai"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">STATE</label>
                                    <input
                                        value={formData.address.state}
                                        onChange={e => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                                        className={`input-field ${errors.state ? 'border-red-400 bg-red-50/30' : ''}`}
                                        placeholder="Tamil Nadu"
                                    />
                                </div>

                                <div className="md:col-span-2 flex items-center gap-4 pt-6">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-4 bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100/50 hover:bg-black transition-all"
                                    >
                                        {loading ? 'Saving Details...' : 'SAVE DETAILS 🛡️'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="px-8 py-4 border-2 border-slate-100 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                    >
                                        Abort
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Support Sidebar */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="card-premium p-8 space-y-6 group">
                        <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-4xl group-hover:rotate-12 transition-transform">🎫</div>
                        <h3 className="text-xl font-bold font-outfit">Support Matrix</h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Encountering structural issues with your order or wallet? Open a high-priority ticket below.</p>

                        <form onSubmit={handleQuerySubmit} className="space-y-4">
                            <input required value={queryForm.subject} onChange={e => setQueryForm({ ...queryForm, subject: e.target.value })} className="input-field text-xs font-bold" placeholder="TICKET SUBJECT" />
                            <textarea required rows={4} value={queryForm.message} onChange={e => setQueryForm({ ...queryForm, message: e.target.value })} className="input-field text-xs font-medium resize-none" placeholder="ELABORATE YOUR QUERY..." />
                            <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg shadow-black/10">TRANSMIT REQUEST</button>
                        </form>
                    </div>

                    <div className="card-premium p-0 overflow-hidden divide-y divide-slate-50 border-slate-100">
                        <div className="p-6 bg-slate-50/50 flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Tickets</p>
                            <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-2 py-0.5 rounded-full">{queries.length} DEPLOYED</span>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            {queries.map((q, i) => (
                                <div key={i} className="p-5 hover:bg-slate-50 transition-colors cursor-help group">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-xs font-black text-slate-700 group-hover:text-blue-700 transition-colors">#{q._id.slice(-4).toUpperCase()} {q.subject}</p>
                                        <div className={`w-2 h-2 rounded-full ${q.status === 'Open' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 italic">"{q.message}"</p>
                                </div>
                            ))}
                            {queries.length === 0 && (
                                <div className="py-20 text-center space-y-2 opacity-20">
                                    <p className="text-4xl">📭</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Buffer Empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
