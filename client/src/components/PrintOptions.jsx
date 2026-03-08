import React from 'react';
import { useAppContext } from '../context/AppContext';

const PrintOptions = () => {
    const { pricingRules } = useAppContext();
    const rules = pricingRules?.rules;

    const printOptions = [
        {
            size: "A4 B/W",
            title: "Standard B/W",
            desc: "For daily documents and reports.",
            single: rules?.printing?.bw?.single || 0.75,
            double: rules?.printing?.bw?.double || 0.5,
            icon: "📄",
            color: "slate"
        },
        {
            size: "A3 B/W",
            title: "Large Format B/W",
            desc: "Blueprints and architectural plans.",
            single: rules?.printing?.bw?.a3_single || 2,
            double: rules?.printing?.bw?.a3_double || 1.5,
            icon: "🗞️",
            color: "zinc"
        },
        {
            size: "A4 Colour",
            title: "Vibrant A4",
            desc: "Marketing materials and resumes.",
            single: rules?.printing?.color?.single || 8,
            double: rules?.printing?.color?.double || 8,
            icon: "🎨",
            color: "blue"
        },
        {
            size: "A3 Colour",
            title: "Pro Format Colour",
            desc: "Posters and high-impact presentations.",
            single: rules?.printing?.color?.a3_single || 20,
            double: rules?.printing?.color?.a3_double || 20,
            icon: "🌈",
            color: "orange"
        }
    ];

    const bindingOptions = [
        {
            type: "Spiral",
            price: rules?.additional?.binding || 15,
            desc: "Flexible coil binding",
            icon: "🌀"
        },
        {
            type: "Chart Binding",
            price: rules?.additional?.chart_binding || 10,
            desc: "Standard school/project binding",
            icon: "📊"
        }
    ];

    return (
        <section className="space-y-12 py-12">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-black font-outfit text-slate-900 uppercase tracking-tight italic">Print Options & Rates</h2>
                <div className="w-20 h-1.5 bg-blue-600 mx-auto rounded-full"></div>
                <p className="text-slate-500 font-medium pt-2">Official terminal pricing for quality output</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {printOptions.map((opt) => (
                    <div key={opt.size} className="group relative bg-white rounded-[32px] p-8 shadow-xl shadow-slate-100 border border-slate-50 overflow-hidden hover:shadow-2xl hover:shadow-blue-100 transition-all duration-500">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-${opt.color}-500/5 blur-3xl rounded-full -mr-16 -mt-16`}></div>

                        <div className="flex items-start justify-between relative z-10">
                            <div className="space-y-4">
                                <div className={`w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-500`}>
                                    {opt.icon}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl font-black font-outfit text-slate-900">{opt.size}</h3>
                                        <span className={`px-2 py-1 bg-slate-100 text-slate-700 text-[8px] font-black rounded-full uppercase tracking-widest`}>
                                            {opt.title}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-[180px]">
                                        {opt.desc}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Single Side</p>
                                    <p className="text-3xl font-black font-outfit text-slate-900">
                                        ₹{opt.single}<span className="text-xs text-slate-400 font-bold ml-1">/pg</span>
                                    </p>
                                </div>
                                <div className="text-right bg-blue-50/50 p-2 rounded-xl border border-blue-100/50">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Double Side</p>
                                    <p className="text-3xl font-black font-outfit text-blue-700">
                                        ₹{opt.double}<span className="text-xs text-blue-400 font-bold ml-1">/pg</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-300">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent)] pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-2 text-center md:text-left">
                        <h3 className="text-2xl font-black uppercase tracking-tight">Finishing & Binding</h3>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Supports up to 300 papers per volume</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4">
                        {bindingOptions.map(b => (
                            <div key={b.type} className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 min-w-[200px]">
                                <div className="text-3xl">{b.icon}</div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{b.type}</p>
                                    <p className="text-xl font-black italic">₹{b.price}<span className="text-xs font-bold opacity-50 ml-1">Flat</span></p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PrintOptions;
