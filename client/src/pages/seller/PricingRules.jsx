import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const PricingRules = () => {
    const { axios } = useAppContext();
    const [rules, setRules] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchRules = async () => {
        try {
            const { data } = await axios.get('/api/pricing');
            if (data.success) {
                const fetchedRules = data.pricing.rules;
                // Ensure nesting exists even if DB is old or empty
                const normalizedRules = {
                    printing: {
                        bw: fetchedRules.printing?.bw || { single: 0.75, double: 0.5, a3_single: 2, a3_double: 1.5 },
                        color: fetchedRules.printing?.color || { single: 8, double: 8, a3_single: 20, a3_double: 20 }
                    },
                    additional: {
                        binding: fetchedRules.additional?.binding || 15,
                        hard_binding: fetchedRules.additional?.hard_binding || 200,
                        chart_binding: fetchedRules.additional?.chart_binding || 10,
                        staple_binding: fetchedRules.additional?.staple_binding || 0.30,
                        handling_fee: fetchedRules.additional?.handling_fee || 10
                    },
                    delivery: fetchedRules.delivery || 40,
                    delivery_tiers: fetchedRules.delivery_tiers || {
                        tier_a: 40,
                        tier_b: 60,
                        tier_c: 80,
                        tier_d: 150
                    }
                };
                setRules(normalizedRules);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await axios.post('/api/pricing/update', rules);
            if (data.success) toast.success("Pricing Updated Successfully");
        } catch (error) {
            toast.error(error.message);
        }
        setLoading(false);
    };

    useEffect(() => { fetchRules(); }, []);

    if (!rules) return <div className="p-8 text-center text-text-muted font-medium">Loading rules...</div>;

    return (
        <div className="max-w-5xl space-y-10">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl shadow-xl">
                <div>
                    <h2 className="text-3xl font-extrabold font-outfit tracking-tight flex items-center gap-3">
                        <span>💰</span> Printing Price Rules
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">Configure baseline rates, paper dimensions, binding services, and courier weight policies.</p>
                </div>
                <span className="text-xs bg-white/10 border border-white/20 text-white px-4 py-2 rounded-full font-bold tracking-wider uppercase backdrop-blur-xs">
                    Rates in Indian Rupees (₹)
                </span>
            </div>

            <form onSubmit={handleUpdate} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* B/W Printing Card */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl">
                                🖤
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Black & White Printing</h3>
                                <p className="text-xs text-text-muted">Standard document grayscale printing rates</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Single Side (A4)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                    <input
                                        value={rules.printing.bw.single}
                                        onChange={(e) => setRules({ ...rules, printing: { ...rules.printing, bw: { ...rules.printing.bw, single: Number(e.target.value) } } })}
                                        type="number" step="0.01" className="input-field pl-8 font-semibold w-full"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Double Side (A4)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                    <input
                                        value={rules.printing.bw.double}
                                        onChange={(e) => setRules({ ...rules, printing: { ...rules.printing, bw: { ...rules.printing.bw, double: Number(e.target.value) } } })}
                                        type="number" step="0.01" className="input-field pl-8 font-semibold w-full"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Single Side (A3)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                    <input
                                        value={rules.printing.bw.a3_single}
                                        onChange={(e) => setRules({ ...rules, printing: { ...rules.printing, bw: { ...rules.printing.bw, a3_single: Number(e.target.value) } } })}
                                        type="number" step="0.01" className="input-field pl-8 font-semibold w-full"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Double Side (A3)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                    <input
                                        value={rules.printing.bw.a3_double}
                                        onChange={(e) => setRules({ ...rules, printing: { ...rules.printing, bw: { ...rules.printing.bw, a3_double: Number(e.target.value) } } })}
                                        type="number" step="0.01" className="input-field pl-8 font-semibold w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Color Printing Card */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl">
                                🌈
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Color Printing</h3>
                                <p className="text-xs text-text-muted">High-quality full spectrum printing rates</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Single Side (A4)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                    <input
                                        value={rules.printing.color.single}
                                        onChange={(e) => setRules({ ...rules, printing: { ...rules.printing, color: { ...rules.printing.color, single: Number(e.target.value) } } })}
                                        type="number" step="0.01" className="input-field pl-8 font-semibold w-full"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Double Side (A4)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                    <input
                                        value={rules.printing.color.double}
                                        onChange={(e) => setRules({ ...rules, printing: { ...rules.printing, color: { ...rules.printing.color, double: Number(e.target.value) } } })}
                                        type="number" step="0.01" className="input-field pl-8 font-semibold w-full"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Single Side (A3)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                    <input
                                        value={rules.printing.color.a3_single}
                                        onChange={(e) => setRules({ ...rules, printing: { ...rules.printing, color: { ...rules.printing.color, a3_single: Number(e.target.value) } } })}
                                        type="number" step="0.01" className="input-field pl-8 font-semibold w-full"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Double Side (A3)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                    <input
                                        value={rules.printing.color.a3_double}
                                        onChange={(e) => setRules({ ...rules, printing: { ...rules.printing, color: { ...rules.printing.color, a3_double: Number(e.target.value) } } })}
                                        type="number" step="0.01" className="input-field pl-8 font-semibold w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Charges Card */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl">
                            📚
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">Binding Services & Extra Fees</h3>
                            <p className="text-xs text-text-muted">Configure bind styling price rules and handling operations costs</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 pt-2">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Spiral Binding</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                <input
                                    value={rules.additional.binding}
                                    onChange={(e) => setRules({ ...rules, additional: { ...rules.additional, binding: Number(e.target.value) } })}
                                    type="number" step="0.01" className="input-field pl-8 font-semibold w-full"
                                />
                            </div>
                            <span className="text-[10px] text-text-muted block">Per copy</span>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Hard Binding</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                <input
                                    value={rules.additional.hard_binding}
                                    onChange={(e) => setRules({ ...rules, additional: { ...rules.additional, hard_binding: Number(e.target.value) } })}
                                    type="number" step="0.01" className="input-field pl-8 font-semibold w-full"
                                />
                            </div>
                            <span className="text-[10px] text-text-muted block">Per copy</span>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Chart Binding</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                <input
                                    value={rules.additional.chart_binding}
                                    onChange={(e) => setRules({ ...rules, additional: { ...rules.additional, chart_binding: Number(e.target.value) } })}
                                    type="number" step="0.01" className="input-field pl-8 font-semibold w-full"
                                />
                            </div>
                            <span className="text-[10px] text-text-muted block">Per copy</span>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Staple Binding</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                <input
                                    value={rules.additional.staple_binding}
                                    onChange={(e) => setRules({ ...rules, additional: { ...rules.additional, staple_binding: Number(e.target.value) } })}
                                    type="number" step="0.01" className="input-field pl-8 font-semibold w-full"
                                />
                            </div>
                            <span className="text-[10px] text-text-muted block">Per sheet</span>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Handling Fee</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                <input
                                    value={rules.additional.handling_fee}
                                    onChange={(e) => setRules({ ...rules, additional: { ...rules.additional, handling_fee: Number(e.target.value) } })}
                                    type="number" step="0.01" className="input-field pl-8 font-semibold w-full"
                                />
                            </div>
                            <span className="text-[10px] text-text-muted block">Per order checkout</span>
                        </div>
                    </div>
                </div>

                {/* Weight-Based Delivery Tiers Card */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6 hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-xl">
                                🚚
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Weight-Based Delivery Tiers</h3>
                                <p className="text-xs text-text-muted">Set automatic package courier calculations based on order weight</p>
                            </div>
                        </div>
                        <p className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1 rounded-full font-bold tracking-wide uppercase">
                            Smart Delivery Calculator
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                        {['tier_a', 'tier_b', 'tier_c'].map((tierKey) => (
                            <div key={tierKey} className="space-y-4 p-5 rounded-2xl border border-slate-100 bg-slate-50/50">
                                <h4 className="text-sm font-extrabold text-indigo-900 uppercase tracking-wide">
                                    {tierKey === 'tier_a' ? 'Small Package (Up to 3kg)' : tierKey === 'tier_b' ? 'Medium Box (3-10kg)' : 'Heavy Weight (10kg+)'}
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl shadow-xs border border-slate-100">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Max Weight</label>
                                        <div className="flex items-center gap-1">
                                            <input
                                                value={rules.delivery_tiers[tierKey].maxWeight}
                                                onChange={(e) => setRules({
                                                    ...rules,
                                                    delivery_tiers: {
                                                        ...rules.delivery_tiers,
                                                        [tierKey]: { ...rules.delivery_tiers[tierKey], maxWeight: Number(e.target.value) }
                                                    }
                                                })}
                                                type="number" className="w-14 text-right text-xs font-bold border-none outline-none focus:ring-0"
                                            />
                                            <span className="text-[10px] font-bold text-slate-400">kg</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl shadow-xs border border-slate-100">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Rate</label>
                                        <div className="flex items-center gap-1">
                                            <input
                                                value={rules.delivery_tiers[tierKey].rate}
                                                onChange={(e) => setRules({
                                                    ...rules,
                                                    delivery_tiers: {
                                                        ...rules.delivery_tiers,
                                                        [tierKey]: { ...rules.delivery_tiers[tierKey], rate: Number(e.target.value) }
                                                    }
                                                })}
                                                type="number" className="w-14 text-right text-xs font-bold border-none outline-none focus:ring-0"
                                            />
                                            <span className="text-[10px] font-bold text-slate-400">₹/kg</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl shadow-xs border border-slate-100">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Slip Charge</label>
                                        <div className="flex items-center gap-1">
                                            <input
                                                value={rules.delivery_tiers[tierKey].slip}
                                                onChange={(e) => setRules({
                                                    ...rules,
                                                    delivery_tiers: {
                                                        ...rules.delivery_tiers,
                                                        [tierKey]: { ...rules.delivery_tiers[tierKey], slip: Number(e.target.value) }
                                                    }
                                                })}
                                                type="number" className="w-14 text-right text-xs font-bold border-none outline-none focus:ring-0"
                                            />
                                            <span className="text-[10px] font-bold text-slate-400">₹</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-blue-50 border border-blue-100/50 p-4 rounded-2xl flex items-start gap-3">
                        <span className="text-lg">💡</span>
                        <p className="text-xs text-blue-800 leading-relaxed font-medium">
                            <strong>Formula Details:</strong> Total weight is evaluated as: <code>(Page Count / 200) + Binding Type Weight</code>.<br/>
                            Standard parameters: 1 sheet = 5 grams. Spiral = 100g, Chart = 50g, Hard binding = 200g.
                        </p>
                    </div>
                </div>

                {/* Submit Action Area */}
                <div className="flex flex-col items-center gap-3 pt-4">
                    <button disabled={loading} className="btn-primary w-full max-w-md py-4 text-base font-bold shadow-xl shadow-primary/25 hover:scale-[1.01] transition-transform">
                        {loading ? 'Processing changes...' : 'Save Pricing Rules 💾'}
                    </button>
                    <p className="text-xs text-text-muted font-medium">Updates are instantly synchronized and applied to all new checkout computations.</p>
                </div>
            </form>
        </div>
    );
};

export default PricingRules;
