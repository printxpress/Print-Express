import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import PrintingAnimation from '../components/PrintingAnimation';

const Vouchers = () => {
    const { user } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState(null);

    const vouchers = [
        {
            id: 1,
            code: 'FIRST50',
            title: 'First Order Discount',
            description: 'Get ₹50 off on your first order',
            discount: '₹50 OFF',
            minOrder: '₹200',
            validTill: '2026-12-31',
            color: 'blue',
            isActive: false
        },
        {
            id: 2,
            code: 'PRINT100',
            title: 'Bulk Printing Offer',
            description: 'Save ₹100 on orders above ₹500',
            discount: '₹100 OFF',
            minOrder: '₹500',
            validTill: '2026-12-31',
            color: 'green',
            isActive: false
        },
        {
            id: 3,
            code: 'COLOR20',
            title: 'Color Printing Special',
            description: '20% off on color printing',
            discount: '20% OFF',
            minOrder: '₹300',
            validTill: '2026-12-31',
            color: 'orange',
            isActive: false
        },
        {
            id: 4,
            code: 'WEEKEND',
            title: 'Weekend Bonanza',
            description: 'Extra 15% off on weekend orders',
            discount: '15% OFF',
            minOrder: '₹250',
            validTill: '2026-12-31',
            color: 'purple',
            isActive: false
        }
    ];

    const getColorClasses = (color) => {
        const colors = {
            blue: 'from-blue-500 to-blue-600 border-blue-300',
            green: 'from-green-500 to-green-600 border-green-300',
            orange: 'from-orange-500 to-orange-600 border-orange-300',
            purple: 'from-purple-500 to-purple-600 border-purple-300'
        };
        return colors[color] || colors.blue;
    };

    const copyVoucherCode = (code) => {
        navigator.clipboard.writeText(code);
        toast.success(`Voucher code ${code} copied!`);
    };

    if (loading) {
        return <PrintingAnimation />;
    }

    const activeVouchers = vouchers.filter(v => v.isActive);
    const upcomingVouchers = vouchers.filter(v => !v.isActive);

    return (
        <div className="py-12 max-w-6xl mx-auto space-y-12 animate-fade-in-up">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full border border-purple-300 mb-2">
                    <span className="text-xl">🎟️</span>
                    <span className="text-xs md:text-sm font-bold text-gray-700">Save More</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold font-outfit bg-gradient-to-r from-purple-800 to-pink-600 bg-clip-text text-transparent">
                    Vouchers & Offers
                </h1>
                <p className="text-text-muted text-lg max-w-2xl mx-auto">
                    Exclusive vouchers and special offers just for you. Save more on every print!
                </p>
            </div>

            {/* Active Vouchers */}
            <div>
                <h2 className="text-2xl font-bold font-outfit mb-6">Active Vouchers</h2>
                {activeVouchers.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-text-muted text-sm font-medium">No active vouchers at the moment. Keep an eye out for upcoming offers!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeVouchers.map((voucher) => (
                            <div
                                key={voucher.id}
                                className="relative overflow-hidden rounded-2xl border-2 hover-lift transition-all"
                            >
                                {/* Voucher Design */}
                                <div className={`bg-gradient-to-br ${getColorClasses(voucher.color)} p-6 text-white`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold font-outfit mb-1">{voucher.title}</h3>
                                            <p className="text-sm opacity-90">{voucher.description}</p>
                                        </div>
                                        <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold">
                                            {voucher.discount}
                                        </div>
                                    </div>

                                    {/* Voucher Code */}
                                    <div className="bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl p-4 mb-4">
                                        <p className="text-xs opacity-75 mb-1">VOUCHER CODE</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-2xl font-bold font-mono tracking-wider">{voucher.code}</span>
                                            <button
                                                onClick={() => copyVoucherCode(voucher.code)}
                                                className="bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="flex justify-between text-xs opacity-90">
                                        <span>Min. Order: {voucher.minOrder}</span>
                                        <span>Valid till: {new Date(voucher.validTill).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* Decorative Circles */}
                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
                                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Expired/Upcoming Vouchers */}
            <div>
                <h2 className="text-2xl font-bold font-outfit mb-6">Upcoming Offers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {upcomingVouchers.map((voucher) => (
                        <div
                            key={voucher.id}
                            className="relative overflow-hidden rounded-2xl border-2 border-slate-200 shadow-sm"
                        >
                            <div className="bg-gradient-to-br from-slate-400 to-slate-500 p-6 text-white relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold font-outfit mb-1">{voucher.title}</h3>
                                        <p className="text-sm opacity-90">{voucher.description}</p>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-white">
                                        Coming Soon
                                    </div>
                                </div>

                                {/* Voucher Code & Discount display */}
                                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 mb-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] opacity-75 mb-0.5">VOUCHER CODE</p>
                                            <span className="text-2xl font-bold font-mono tracking-wider">{voucher.code}</span>
                                        </div>
                                        <div className="bg-white text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                                            {voucher.discount}
                                        </div>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="flex justify-between text-xs opacity-90 border-t border-white/10 pt-3">
                                    <span>Min. Order: {voucher.minOrder}</span>
                                    <span>Valid till: {new Date(voucher.validTill).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {/* Decorative Circles */}
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full"></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* How to Use */}
            <div className="card-premium p-8 bg-gradient-to-br from-blue-50 to-purple-50">
                <h3 className="text-xl font-bold font-outfit mb-4">How to Use Vouchers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                        <div>
                            <h4 className="font-semibold mb-1">Copy Code</h4>
                            <p className="text-sm text-text-muted">Click on the voucher to copy the code</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                        <div>
                            <h4 className="font-semibold mb-1">Add to Cart</h4>
                            <p className="text-sm text-text-muted">Upload your documents and proceed to checkout</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                        <div>
                            <h4 className="font-semibold mb-1">Apply & Save</h4>
                            <p className="text-sm text-text-muted">Paste the code at checkout and enjoy savings!</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Vouchers;
