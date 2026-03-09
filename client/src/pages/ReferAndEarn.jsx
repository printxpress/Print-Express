import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import PrintingAnimation from '../components/PrintingAnimation';

const ReferAndEarn = () => {
    const { user } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const referralCode = user?.phone ? `PRINT${user.phone.slice(-4)}` : 'PRINTXXXX';
    const referralLink = `https://printexpress.in/signup?ref=${referralCode}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        toast.success('Referral link copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const shareOnWhatsApp = () => {
        const baseUrl = 'https://print-express-ve.vercel.app/';
        const message = `🚀 *Custom Print Rewards* 🚀\n\nI'm using Print Express for high-quality printing! 🖨️\n\nUse my referral code *${referralCode}* to get *10% DISCOUNT* on every order! 💰\n\n*How it works:*\n1️⃣ Click the link: ${baseUrl}\n2️⃣ Sign up and use code: *${referralCode}*\n3️⃣ Place your order and enjoy the discount!\n\n*Terms:*\n- 10% discount on every order after referral\n- Referral credits valid for 100 days\n\nJoin now: ${baseUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    if (loading) {
        return <PrintingAnimation />;
    }

    return (
        <div className="py-12 max-w-6xl mx-auto space-y-12 animate-fade-in-up">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-100 to-blue-100 rounded-full border border-green-300 mb-2">
                    <span className="text-xl">🎁</span>
                    <span className="text-xs md:text-sm font-bold text-gray-700">Earn Rewards</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold font-outfit bg-gradient-to-r from-blue-800 to-green-600 bg-clip-text text-transparent">
                    Refer & Earn
                </h1>
                <p className="text-text-muted text-lg max-w-2xl mx-auto">
                    Share Print Express with your friends and earn rewards for every successful referral!
                </p>
            </div>

            {/* How It Works */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { icon: '📤', title: 'Share Your Link', desc: 'Share your referral code and link with friends and family' },
                    { icon: '🛒', title: 'They Order', desc: 'Your friend places an order using your referral code' },
                    { icon: '💰', title: 'You Both Earn', desc: 'Get 10% DISCOUNT on every order after referral!' }
                ].map((step, index) => (
                    <div key={index} className="card-premium p-6 text-center space-y-3 hover-lift">
                        <div className="text-5xl mb-2">{step.icon}</div>
                        <h3 className="text-lg font-bold font-outfit">{step.title}</h3>
                        <p className="text-sm text-text-muted">{step.desc}</p>
                    </div>
                ))}
            </div>

            {/* Referral Card */}
            <div className="card-premium p-8 md:p-12 bg-gradient-to-br from-blue-50 to-green-50 border-2 border-blue-200">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold font-outfit">Your Referral Code</h2>
                        <div className="inline-flex items-center gap-3 px-6 py-4 bg-white rounded-xl border-2 border-blue-300 shadow-lg">
                            <span className="text-3xl font-bold font-outfit text-primary">{referralCode}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-text-muted">Direct Referral Link</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value="https://print-express-ve.vercel.app/"
                                readOnly
                                className="input-field flex-1 font-mono text-sm"
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText('https://print-express-ve.vercel.app/');
                                    toast.success('Link copied!');
                                }}
                                className="btn-primary px-6 whitespace-nowrap"
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={shareOnWhatsApp}
                            className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover-glow"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                            Share on WhatsApp
                        </button>
                    </div>
                </div>
            </div>

            {/* Earnings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-premium p-6 text-center border-2 border-green-200 bg-green-50">
                    <p className="text-sm text-text-muted mb-2">Total Referrals</p>
                    <p className="text-4xl font-bold font-outfit text-green-600">{user?.referralCredits?.length || 0}</p>
                </div>
                <div className="card-premium p-6 text-center border-2 border-blue-200 bg-blue-50">
                    <p className="text-sm text-text-muted mb-2">Valid Balance</p>
                    <p className="text-4xl font-bold font-outfit text-blue-600">₹{user?.referralBalance || 0}</p>
                </div>
                <div className="card-premium p-6 text-center border-2 border-orange-200 bg-orange-50">
                    <p className="text-sm text-text-muted mb-2">Validity</p>
                    <p className="text-lg font-bold font-outfit text-orange-600">100 Days</p>
                </div>
            </div>

            {/* Terms */}
            <div className="card-premium p-6 bg-gray-50">
                <h3 className="font-bold mb-3">Terms & Conditions</h3>
                <ul className="text-sm text-text-muted space-y-2">
                    <li>• Enjoy a 10% DISCOUNT on every order using referral credits</li>
                    <li>• Referrer gets ₹100 credit when friend completes their first order</li>
                    <li>• Referral credits are valid for 100 days from the date of issue</li>
                    <li>• Maximum discount of 10% applied per order automatically</li>
                    <li>• Print Express reserves the right to modify or cancel this program at any time</li>
                </ul>
            </div>
        </div>
    );
};

export default ReferAndEarn;
