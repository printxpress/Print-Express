import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const UpiPaymentModal = ({ isOpen, onClose, onConfirm, amount, orderData }) => {
    const { shopSettings, currency } = useAppContext();
    const [upiId, setUpiId] = useState('');

    useEffect(() => {
        if (shopSettings?.upiId) {
            setUpiId(shopSettings.upiId);
        }
    }, [shopSettings]);

    if (!isOpen) return null;

    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopSettings?.name || 'PrintExpress')}&am=${amount}&cu=INR&tn=${encodeURIComponent('Order Payment')}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold font-outfit text-slate-800">Scan & Pay</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <span className="text-2xl">✕</span>
                        </button>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center space-y-4 border border-slate-100">
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                            <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Amount to Pay</p>
                            <p className="text-3xl font-black text-blue-700">{currency}{amount}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <a
                            href={upiLink}
                            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 active:scale-95"
                        >
                            <span>📱</span> Pay via UPI App
                        </a>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-100"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-slate-400 font-bold">Then</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                if (upiId) {
                                    onConfirm();
                                } else {
                                    toast.error("UPI ID not configured by admin.");
                                }
                            }}
                            className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                        >
                            <span>✅</span> I have Paid
                        </button>
                    </div>

                    <p className="text-[10px] text-center text-slate-400 font-medium leading-relaxed">
                        Please don't close this window until you've successfully completed the payment in your app.
                        Once paid, click "I have Paid" to place your order.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UpiPaymentModal;
