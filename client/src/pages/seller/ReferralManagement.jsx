import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const ReferralManagement = () => {
    const { axios } = useAppContext();
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReferrals = async () => {
        try {
            const { data } = await axios.get('/api/seller/referrals');
            if (data.success) {
                setReferrals(data.users);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Failed to fetch referrals");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReferrals();
    }, []);

    if (loading) return <div className="p-8 text-center font-outfit text-slate-500 animate-pulse text-lg">Loading Referral Analytics...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black font-outfit tracking-tight text-slate-900">Referral Intelligence</h1>
                    <p className="text-slate-500 font-medium">Track unique referral codes and accumulated balances across the network.</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-100">📊</div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active Network</p>
                        <p className="text-xl font-black text-indigo-900">{referrals.filter(u => u.referredBy).length} Connections</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-premium p-6 border-blue-100 bg-gradient-to-br from-white to-blue-50/30">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Referral Liability</p>
                    <p className="text-3xl font-black text-blue-900">₹{referrals.reduce((sum, u) => sum + (u.referralBalance || 0), 0).toFixed(2)}</p>
                </div>
                {/* Additional stats can be added here */}
            </div>

            <div className="card-premium p-0 overflow-hidden border-slate-200 shadow-2xl shadow-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer Identity</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Referral Code</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Accumulated Balance</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Referred By</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Network Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {referrals.map((user, idx) => (
                                <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400 group-hover:bg-white group-hover:text-indigo-600 transition-all shadow-sm">{user.name?.[0] || 'U'}</div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                                                <p className="text-xs text-slate-400">{user.phone}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black border border-slate-200 group-hover:bg-white transition-all uppercase">{user.referralCode || 'N/A'}</span>
                                    </td>
                                    <td className="p-6">
                                        <p className="text-sm font-black text-indigo-700">₹{(user.referralBalance || 0).toFixed(2)}</p>
                                    </td>
                                    <td className="p-6">
                                        {user.referredBy ? (
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700">{user.referredBy.name}</span>
                                                <span className="text-[10px] text-slate-400">{user.referredBy.phone}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Organic Signup</span>
                                        )}
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${user.referralBalance > 0 ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase">{user.referralBalance > 0 ? 'Active Credits' : 'Zero Balance'}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {referrals.length === 0 && (
                    <div className="py-24 text-center space-y-4">
                        <p className="text-5xl grayscale opacity-20">📂</p>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Referral Data Transmitted</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReferralManagement;
