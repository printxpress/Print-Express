import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const OrderSuccess = () => {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');
    const razorpay_payment_link_id = searchParams.get('razorpay_payment_link_id');
    const razorpay_payment_id = searchParams.get('razorpay_payment_id');
    const navigate = useNavigate();
    const { axios } = useAppContext();
    const [shop, setShop] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [verificationFailed, setVerificationFailed] = useState(false);

    useEffect(() => {
        const fetchShop = async () => {
            try {
                const { data } = await axios.get('/api/shop/settings');
                if (data.success) setShop(data.settings);
            } catch {
                // silently fail — not critical
            }
        };
        fetchShop();
    }, [axios]);

    useEffect(() => {
        const verifyPayment = async () => {
            if (razorpay_payment_link_id && orderId) {
                setVerifying(true);
                setVerificationFailed(false);
                try {
                    const { data } = await axios.post('/api/order/verify-link', {
                        orderId,
                        razorpay_payment_link_id,
                        razorpay_payment_id
                    });
                    if (data.success) {
                        toast.success("Payment verified successfully!");
                    } else {
                        toast.error(data.message || "Payment verification failed.");
                        setVerificationFailed(true);
                    }
                } catch (err) {
                    console.error("Payment verification error:", err);
                    toast.error("Error verifying payment.");
                    setVerificationFailed(true);
                } finally {
                    setVerifying(false);
                }
            }
        };
        verifyPayment();
    }, [orderId, razorpay_payment_link_id, razorpay_payment_id, axios]);

    const handleReachUs = () => {
        if (!shop?.locationUrl || shop.locationUrl.trim() === '') {
            toast.error("Store location not set yet. Please contact us directly.");
            return;
        }
        try {
            new URL(shop.locationUrl);
            window.open(shop.locationUrl, '_blank');
        } catch {
            toast.error("Location link appears to be broken. Please contact us directly.");
        }
    };

    if (verifying) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center py-20 px-6 font-outfit">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <h2 className="text-xl font-bold">Verifying your payment...</h2>
                    <p className="text-sm text-text-muted">Please do not close this window or refresh the page.</p>
                </div>
            </div>
        );
    }

    if (verificationFailed) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center py-20 px-6 font-outfit">
                <div className="max-w-md w-full space-y-6">
                    <div className="card-premium p-10 text-center space-y-8 animate-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner">
                            ⚠️
                        </div>
                        <div className="space-y-3">
                            <h1 className="text-3xl font-black text-text-main tracking-tight italic uppercase">Verification Failed</h1>
                            <p className="text-text-muted font-medium text-sm">
                                We could not verify your payment for order <span className="text-primary font-bold">#{orderId?.slice(-8).toUpperCase()}</span>. If you completed the payment, please contact support with your receipt.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 pt-4">
                            <button
                                onClick={() => navigate('/my-orders')}
                                className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl hover:shadow-primary/30 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                            >
                                View My Orders & Try Again
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="text-primary font-bold text-xs hover:underline pt-2"
                            >
                                Back to Home
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center py-20 px-6">
            <div className="max-w-md w-full space-y-6">
                {/* Success Card */}
                <div className="card-premium p-10 text-center space-y-8 animate-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner">
                        🎉
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-black font-outfit text-text-main tracking-tight italic uppercase">Order Placed!</h1>
                        <p className="text-text-muted font-medium text-sm">
                            Thank you for choosing {shop?.name || 'Print Express'}. Your order <span className="text-primary font-bold">#{orderId?.slice(-8).toUpperCase()}</span> has been received and is being processed.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <button
                            onClick={() => window.open(`${axios.defaults.baseURL}/api/order/thermal-bill/${orderId}`, '_blank')}
                            className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl hover:shadow-primary/30 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                        >
                            <span>Download Bill</span>
                            <span className="text-lg">📄</span>
                        </button>

                        <button
                            onClick={() => navigate('/my-orders')}
                            className="w-full py-4 bg-slate-50 border-2 border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-white hover:border-primary/30 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            View All Orders
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            className="text-primary font-bold text-xs hover:underline pt-2"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>

                {/* Store Info Card */}
                {shop && (
                    <div className="card-premium p-6 animate-in slide-in-from-bottom-4 duration-700 delay-300 space-y-4">
                        <div className="flex items-center gap-2 border-b border-border pb-3">
                            <span className="text-xl">🏪</span>
                            <div>
                                <p className="font-bold text-sm font-outfit">{shop.name}</p>
                                <p className="text-[10px] text-text-muted uppercase tracking-widest">{shop.tagline}</p>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-3">
                                <span className="text-base mt-0.5">📍</span>
                                <p className="text-text-muted leading-relaxed">{shop.address}</p>
                            </div>
                            {shop.phone && (
                                <div className="flex items-center gap-3">
                                    <span className="text-base">📞</span>
                                    <a href={`tel:${shop.phone}`} className="text-primary font-bold hover:underline">
                                        Cell: {shop.phone}
                                    </a>
                                </div>
                            )}
                            {shop.whatsapp && (
                                <div className="flex items-center gap-3">
                                    <span className="text-base">💬</span>
                                    <a
                                        href={`https://wa.me/${shop.whatsapp}?text=Hello! I just placed an order %23${orderId?.slice(-8).toUpperCase()} and need assistance.`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-green-600 font-bold hover:underline text-sm"
                                    >
                                        WhatsApp Support
                                    </a>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleReachUs}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5 transition-all text-sm"
                        >
                            <span>📍</span>
                            <span>Reach Us — Get Directions</span>
                        </button>
                    </div>
                )}
            </div>

            <p className="mt-8 text-text-muted text-[10px] uppercase font-bold tracking-[0.2em]">
                {shop?.name || 'Print Express'} • {shop?.tagline || 'Quality at Speed'}
            </p>
        </div>
    );
};

export default OrderSuccess;
