import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PricingTable = () => {
    const navigate = useNavigate();
    const [rules, setRules] = useState(null);

    useEffect(() => {
        const fetchRules = async () => {
            try {
                const response = await fetch('/api/pricing');
                const data = await response.json();
                if (data.success) {
                    setRules(data.pricing.rules);
                }
            } catch (error) {
                console.error("Failed to fetch pricing rules");
            }
        };
        fetchRules();
    }, []);

    const services = [
        {
            name: "Black & White Printing",
            desc: `A4: ₹${rules?.printing?.bw?.single || '0.75'} | A3: ₹${rules?.printing?.bw?.a3_single || '2.00'} (Standard Rates)`,
            price: rules?.printing?.bw?.single || 0.75,
            unit: "page",
            icon: "📄",
            color: "bg-slate-100 text-slate-700"
        },
        {
            name: "Color Printing",
            desc: `A4: ₹${rules?.printing?.color?.single || '8.00'} | A3: ₹${rules?.printing?.color?.a3_single || '20.00'} (Vibrant Laser)`,
            price: rules?.printing?.color?.single || 8.0,
            unit: "page",
            icon: "🌈",
            color: "bg-blue-100 text-blue-700"
        },
        {
            name: "Spiral Binding",
            desc: `A4: ₹${rules?.additional?.binding || '15'} | A3: ₹${rules?.additional?.a3_binding || '40'} (Up to 300 sheets)`,
            price: rules?.additional?.binding || 15,
            unit: "book",
            icon: "📚",
            color: "bg-orange-100 text-orange-700"
        },
        {
            name: "Chart Binding",
            desc: `A4: ₹${rules?.additional?.chart_binding || '10'} | A3: ₹${rules?.additional?.a3_chart_binding || '20'} (Professional Finish)`,
            price: rules?.additional?.chart_binding || 10,
            unit: "set",
            icon: "📊",
            color: "bg-purple-100 text-purple-700"
        }
    ];

    return (
        <section id="pricing" className="py-20 bg-slate-50/50 rounded-[40px]">
            <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-12">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold font-outfit text-slate-900">
                        Transparent <span className="text-blue-600">Pricing</span>
                    </h2>
                    <p className="text-slate-500 max-w-2xl mx-auto">
                        High-quality printing services at competitive rates. No hidden charges.
                        All prices listed in Rupees and their Paise equivalents for clarity.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {services.map((s, i) => (
                        <div
                            key={i}
                            onClick={() => navigate('/print')}
                            className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col items-center text-center space-y-6 hover:border-blue-200 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1"
                        >
                            <div className={`w-20 h-20 rounded-3xl ${s.color} flex items-center justify-center text-4xl shadow-sm`}>
                                {s.icon}
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-bold font-outfit text-slate-900 text-lg">{s.name}</h3>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">{s.desc}</p>
                            </div>
                            <div className="pt-4 border-t border-slate-50 w-full">
                                <p className="text-3xl font-black text-slate-900 tracking-tight">
                                    ₹{s.price} <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">/ {s.unit}</span>
                                </p>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter mt-1">
                                    {s.price * 100} Paise
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Delivery Legend */}
                {rules?.delivery_tiers && (
                    <div className="bg-blue-900 rounded-[32px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10">
                            <div className="absolute top-10 left-1/4 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse" />
                            <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-blue-400 rounded-full blur-3xl" />
                        </div>

                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                            <div className="lg:col-span-1 space-y-4">
                                <h3 className="text-2xl md:text-3xl font-bold font-outfit">Tiered Delivery <br /><span className="text-blue-400">Benefit System</span></h3>
                                <p className="text-blue-100/70 text-sm leading-relaxed">
                                    We offer optimized delivery rates based on your document count. Bulk orders enjoy significantly lower shipping per unit.
                                </p>
                            </div>
                            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {(() => {
                                    const getRate = (tier) => typeof tier === 'object' ? (tier.rate || 0) : (tier || 0);
                                    return (
                                        <>
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
                                                <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Basic</p>
                                                <p className="text-2xl font-black">₹{getRate(rules.delivery_tiers.tier_a)}</p>
                                                <p className="text-[10px] text-white/50">&lt; 100 Pgs</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
                                                <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Smart</p>
                                                <p className="text-2xl font-black">₹{getRate(rules.delivery_tiers.tier_b)}</p>
                                                <p className="text-[10px] text-white/50">&gt; 200 Pgs</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-blue-600 border border-blue-400 text-center space-y-2 shadow-xl">
                                                <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Premium</p>
                                                <p className="text-2xl font-black">₹{getRate(rules.delivery_tiers.tier_c)}</p>
                                                <p className="text-[10px] text-blue-100/70">&gt; 500 Pgs</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-orange-600 border border-orange-400 text-center space-y-2 shadow-xl shadow-orange-900/20">
                                                <p className="text-[10px] font-bold text-orange-100 uppercase tracking-widest">Bulk</p>
                                                <p className="text-2xl font-black">₹{getRate(rules.delivery_tiers.tier_d)}</p>
                                                <p className="text-[10px] text-orange-100/70">1000+ Pgs</p>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default PricingTable;
