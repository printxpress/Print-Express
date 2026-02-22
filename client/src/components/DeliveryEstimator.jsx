import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const DeliveryEstimator = () => {
    const { axios, pricingRules } = useAppContext();
    const [pincode, setPincode] = useState('');
    const [pageCount, setPageCount] = useState(50);
    const [location, setLocation] = useState({ district: '', state: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const navigate = useNavigate();

    const handlePincodeChange = async (val) => {
        const value = val.replace(/\D/g, '').slice(0, 6);
        setPincode(value);
        setError('');

        if (value.length === 6) {
            setLoading(true);
            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${value}`);
                const data = await response.json();
                if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
                    const postOffice = data[0].PostOffice[0];
                    setLocation({
                        district: postOffice.District,
                        state: postOffice.State
                    });
                    toast.success(`📍 Shipping available to ${postOffice.District}`);
                } else {
                    setError('Invalid pincode for delivery');
                    setLocation({ district: '', state: '' });
                }
            } catch (err) {
                setError('Could not verify pincode');
            } finally {
                setLoading(false);
            }
        } else {
            setLocation({ district: '', state: '' });
        }
    };

    const getDeliveryEstimate = () => {
        if (!location.district) return null;

        const rules = pricingRules?.rules || {
            delivery_tiers: { tier_a: 40, tier_b: 60, tier_c: 80, tier_d: 150 }
        };
        const tiers = rules.delivery_tiers;
        let cost = tiers.tier_a;

        const effectivePageCount = pageCount || 1;

        if (effectivePageCount >= 1000) cost = tiers.tier_d;
        else if (effectivePageCount > 500) cost = tiers.tier_c;
        else if (effectivePageCount > 200) cost = tiers.tier_b;

        const time = '1-2 Days';
        return { cost, time };
    };

    const estimate = getDeliveryEstimate();

    return (
        <div className="card-premium p-8 bg-gradient-to-br from-slate-900 to-blue-900 text-white border-none shadow-2xl relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/10 rounded-full -ml-16 -mb-16 blur-2xl" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                    <div className="space-y-4">
                        <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10 text-blue-300">Smart Pricing Tool</span>
                        <h2 className="text-4xl md:text-5xl font-bold font-outfit leading-tight">
                            Know your Delivery <br />
                            <span className="text-orange-500">Charge & Volume</span>
                        </h2>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            Our dynamic pricing adjusts based on your order volume. Enter your details below for a precise estimate.
                        </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl">🚛</div>
                            <div>
                                <h4 className="font-bold text-white">Dynamic Pricing</h4>
                                <p className="text-xs text-slate-400">Charges adjust based on weight & distance</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Base Rate</span>
                                <span className="text-blue-400 font-bold">₹35 / kg</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Bulk Discount</span>
                                <span className="text-green-400 font-bold">Applied {'>'} 3kg</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] p-8 md:p-10 text-slate-800 shadow-2xl space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Shipping Pincode</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={pincode}
                                    onChange={(e) => handlePincodeChange(e.target.value)}
                                    placeholder="641001"
                                    className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all text-xl font-bold font-mono tracking-[0.2em] placeholder:text-slate-200"
                                    maxLength={6}
                                />
                                {loading && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                            {error && <p className="text-[10px] text-red-500 font-bold ml-1">{error}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Total Pages (Est.)</label>
                            <input
                                type="number"
                                value={pageCount}
                                onChange={(e) => setPageCount(e.target.value === '' ? '' : Number(e.target.value))}
                                onBlur={() => {
                                    if (pageCount === '' || pageCount < 1 || isNaN(pageCount)) {
                                        setPageCount(1);
                                    }
                                }}
                                className="w-full h-14 px-6 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all text-xl font-bold"
                                min={1}
                            />
                        </div>
                    </div>

                    {location.district && (
                        <div className="animate-in fade-in zoom-in-95 duration-500">
                            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Instant Estimate</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-4xl font-black text-slate-900 leading-none">₹{estimate?.cost}</p>
                                        <p className="text-xs font-bold text-slate-400">/ delivery</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Expected within</p>
                                    <p className="text-xl font-black text-slate-800 uppercase">{estimate?.time}</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold text-center mt-3">📍 Delivering to {location.district}, {location.state}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative mt-1">
                                <input
                                    type="checkbox"
                                    checked={confirmed}
                                    onChange={(e) => setConfirmed(e.target.checked)}
                                    className="peer sr-only"
                                />
                                <div className="w-6 h-6 border-2 border-slate-200 rounded-lg group-hover:border-blue-400 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <span className="text-[11px] text-slate-500 leading-tight font-medium">
                                I confirm that these charges are based on the estimated volume and shipping address provided above.
                            </span>
                        </label>

                        <button
                            onClick={() => confirmed ? navigate(`/print?pincode=${pincode}&pages=${pageCount}&district=${location.district}&state=${location.state}`) : toast.error("Please confirm the estimate")}
                            className={`w-full h-16 rounded-[20px] font-black tracking-wide transition-all shadow-2xl flex items-center justify-center gap-3 ${confirmed
                                ? 'bg-blue-700 hover:bg-blue-800 shadow-blue-200 text-white'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed shadow-none border border-slate-100'
                                }`}
                        >
                            Confirm & Proceed to Print 🚀
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeliveryEstimator;
