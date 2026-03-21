import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import PrintingAnimation from '../components/PrintingAnimation';

const ReferAndEarn = () => {
    const { user, setShowUserLogin, axios } = useAppContext();
    const [copied, setCopied] = useState(false);
    const [referrals, setReferrals] = useState([]);

    const fetchReferrals = async () => {
        try {
            const { data } = await axios.get('/api/user/referred-persons');
            if (data.success) {
                setReferrals(data.referrals);
            }
        } catch (error) {
            console.error("Error fetching referrals", error);
        }
    };

    React.useEffect(() => {
        if (user) fetchReferrals();
    }, [user]);

    if (!user) {
        return (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-5xl mb-4">🎁</div>
                <h1 className="text-3xl font-black font-outfit text-slate-900">Please Login to Refer</h1>
                <p className="text-slate-500 max-w-sm">You need to be logged in to access your unique referral code and earn rewards!</p>
                <button 
                    onClick={() => setShowUserLogin(true)}
                    className="btn-primary px-10 py-4 shadow-xl shadow-blue-100"
                >
                    Login / Sign Up
                </button>
            </div>
        );
    }

    const referralCode = user.referralCode || 'NOTSET';
    const referralLink = `${window.location.origin}/?ref=${referralCode}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        toast.success('Referral link copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const shareOnWhatsApp = () => {
        const message = `🚀 *Exclusive Print Express Offer!* 🚀\n\nI'm using *Print Express* for high-quality printing! 🖨️\n\nUse my referral code *${referralCode}* to get *10% DISCOUNT* on every order! 💰\n\n*How it works:*\n1️⃣ Click the link: ${window.location.origin}\n2️⃣ Sign up and use code: *${referralCode}*\n3️⃣ Place your order and enjoy the discount!\n\nJoin now: ${window.location.origin}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="py-12 max-w-6xl mx-auto space-y-12 animate-fade-in-up">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-100 mb-2">
                    <span className="text-xl">✨</span>
                    <span className="text-xs md:text-sm font-black uppercase tracking-widest text-blue-700">Premium Rewards</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black font-outfit bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent tracking-tight">
                    Refer & Earn
                </h1>
                <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto font-medium">
                    Invite your friends to Print Express and unlock exclusive rewards together!
                </p>
            </div>

            {/* Referral Card */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[32px] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative card-premium p-8 md:p-12 bg-white border border-slate-100 overflow-hidden">
                    {/* Background Decorative Circles */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -ml-32 -mb-32 opacity-40"></div>

                    <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                        <div className="flex-1 space-y-8 w-full">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black font-outfit text-slate-900 tracking-tight">Your Referral Code</h2>
                                <p className="text-slate-500 text-sm font-medium">Share this code with your friends during signup</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 flex items-center justify-between group/code transition-all hover:border-blue-200 hover:bg-white">
                                    <span className="text-4xl md:text-5xl font-black font-mono text-blue-700 tracking-wider">
                                        {referralCode}
                                    </span>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(referralCode);
                                            toast.success('Code copied!');
                                        }}
                                        className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95 shadow-sm"
                                        title="Copy Code"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Direct Link</label>
                                <div className="flex gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                                    <input
                                        type="text"
                                        value={referralLink}
                                        readOnly
                                        className="bg-transparent flex-1 px-4 py-2 font-mono text-sm border-none focus:ring-0 text-slate-600"
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        className={`px-6 py-2 rounded-xl font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-slate-900 shadow-lg shadow-blue-100'}`}
                                    >
                                        {copied ? 'Copied!' : 'Copy Link'}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={shareOnWhatsApp}
                                className="w-full py-5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 shadow-xl shadow-green-100"
                            >
                                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                Share on WhatsApp
                            </button>
                        </div>
                        <div className="hidden lg:block w-72 h-72 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl rotate-6 transform transition-transform group-hover:rotate-12 duration-500 shadow-2xl relative overflow-hidden">
                             <div className="absolute inset-0 flex items-center justify-center text-8xl">🎁</div>
                             <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* How It Works */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { icon: '📤', title: 'Share Your Link', desc: 'Share your unique referral code with friends and family.', color: 'blue' },
                    { icon: '🛒', title: 'They Register', desc: 'Your friends sign up using your code on Print Express.', color: 'indigo' },
                    { icon: '💰', title: 'You Both Earn', desc: 'Get 10% DISCOUNT on every order after referral!', color: 'green' }
                ].map((step, index) => (
                    <div key={index} className="card-premium p-8 text-center space-y-4 hover:-translate-y-2 transition-all duration-500 bg-white border border-slate-100">
                        <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl mx-auto border border-slate-100 transform rotate-3">{step.icon}</div>
                        <h3 className="text-xl font-black font-outfit text-slate-800 tracking-tight">{step.title}</h3>
                        <p className="text-slate-500 text-sm leading-relaxed font-medium">{step.desc}</p>
                    </div>
                ))}
            </div>

            {/* Earnings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-premium p-8 text-center border-2 border-slate-100 hover:border-blue-100 bg-white group transition-all">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Referrals</p>
                    <p className="text-5xl font-black font-outfit text-slate-900 group-hover:text-blue-600 transition-colors">{referrals.length}</p>
                </div>
                <div className="card-premium p-8 text-center border-2 border-slate-100 hover:border-blue-100 bg-white group transition-all">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Wallet Balance</p>
                    <p className="text-5xl font-black font-outfit text-blue-700">₹{user?.referralBalance || 0}</p>
                </div>
                <div className="card-premium p-8 text-center border-2 border-slate-100 hover:border-blue-100 bg-white group transition-all">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Reward Status</p>
                    <p className="text-xl font-black font-outfit text-green-600 uppercase tracking-tight">Active Now ✨</p>
                </div>
            </div>

            {/* Referred Persons List */}
            {referrals.length > 0 && (
                <div className="card-premium p-8 bg-white border border-slate-100">
                    <h3 className="text-2xl font-black font-outfit text-slate-900 mb-6 flex items-center gap-2">
                        👥 People You Referred
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                                    <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Phone</th>
                                    <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Joined Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {referrals.map((ref, idx) => (
                                    <tr key={idx} className="group">
                                        <td className="py-4 font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{ref.name}</td>
                                        <td className="py-4 font-mono text-slate-500 text-sm">XXXXXX{ref.phone.slice(-4)}</td>
                                        <td className="py-4 text-slate-500 text-sm">{new Date(ref.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Terms */}
            <div className="card-premium p-8 bg-slate-50 border border-slate-100">
                <h3 className="text-lg font-black font-outfit text-slate-900 mb-4 uppercase tracking-wider">Terms & Conditions</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        'Enjoy a 10% DISCOUNT on every order using referral credits',
                        'Referrer gets ₹100 credit when friend completes their first order',
                        'Referral credits are valid for 100 days from the date of issue',
                        'Maximum discount of 10% applied per order automatically',
                        'Shared referral links never expire',
                        'Credits cannot be withdrawn as cash'
                    ].map((term, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-600 font-medium">
                            <span className="text-blue-600 font-bold">•</span>
                            {term}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ReferAndEarn;
