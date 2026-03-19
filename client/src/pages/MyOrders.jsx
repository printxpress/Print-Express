import React, { useEffect, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

const MyOrders = () => {

    const [myOrders, setMyOrders] = useState([])
    const [shop, setShop] = useState(null)
    const { axios, user, setShowUserLogin } = useAppContext()

    const fetchMyOrders = async () => {
        try {
            const { data } = await axios.get('/api/order/user')
            if (data.success) {
                setMyOrders(data.orders)
            }
        } catch (error) {
            console.log(error);
        }
    }

    const fetchShop = async () => {
        try {
            const { data } = await axios.get('/api/shop/settings')
            if (data.success) setShop(data.settings)
        } catch { /* silently fail */ }
    }

    const handleReachUs = () => {
        if (!shop?.locationUrl || shop.locationUrl.trim() === '') {
            toast.error('Store location not set yet. Please contact us directly.');
            return;
        }
        try {
            new URL(shop.locationUrl);
            window.open(shop.locationUrl, '_blank');
        } catch {
            toast.error('Location link appears to be broken.');
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'received': return 'bg-blue-100 text-blue-600';
            case 'printing': return 'bg-yellow-100 text-yellow-600';
            case 'ready': return 'bg-purple-100 text-purple-600';
            case 'delivered': return 'bg-green-100 text-green-600';
            case 'failed': return 'bg-red-100 text-red-600';
            case 'cancelled': return 'bg-gray-100 text-gray-500 line-through';
            default: return 'bg-gray-100 text-gray-600';
        }
    }

    const trackOnWA = (order) => {
        const supportPhone = "+919876543210"; // Print Express Support
        const message = `Hello Print Express! I'd like to track my order #${order._id.toString().slice(-8).toUpperCase()}. It is currently ${order.status.toUpperCase()}.`;
        window.open(`https://wa.me/${supportPhone}?text=${encodeURIComponent(message)}`, '_blank');
    }

    useEffect(() => {
        if (!user) {
            setShowUserLogin(true);
        } else {
            fetchMyOrders()
            fetchShop()
        }
    }, [user, setShowUserLogin])

    if (!user) return <div className="min-h-screen flex items-center justify-center font-outfit text-slate-500">Authenticating...</div>;

    return (
        <div className='py-12 space-y-12'>
            <div className='flex flex-col items-center text-center space-y-2'>
                <h1 className='text-4xl font-bold font-outfit tracking-tight'>My Orders</h1>
                <p className='text-text-muted'>Track and manage your recent print requests</p>
            </div>

            {/* Store Info Banner */}
            {shop && (
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🏪</div>
                            <div>
                                <p className="font-bold text-sm font-outfit">{shop.name}</p>
                                <p className="text-xs text-text-muted">{shop.address}</p>
                                {shop.phone && <p className="text-xs text-text-muted">📞 Cell: {shop.phone}</p>}
                            </div>
                        </div>
                        <button
                            onClick={handleReachUs}
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5 transition-all whitespace-nowrap flex-shrink-0"
                        >
                            📍 Reach Us
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto space-y-8">
                {myOrders.length === 0 ? (
                    <div className="card-premium p-16 flex flex-col items-center gap-4 text-center">
                        <span className="text-6xl">📦</span>
                        <h3 className="text-xl font-bold font-outfit">No orders found</h3>
                        <p className="text-text-muted">You haven't placed any print orders yet.</p>
                        <button onClick={() => navigate('/print')} className="btn-primary mt-4">Start Printing Now</button>
                    </div>
                ) : (
                    myOrders.map((order, index) => (
                        <div key={index} className='card-premium p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500' style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
                                <div>
                                    <p className="text-xs text-text-muted font-bold uppercase tracking-wider">ORDER ID</p>
                                    <p className="font-outfit font-bold text-lg">#{order._id.toString().slice(-8).toUpperCase()}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                    <p className="text-sm font-bold text-text-muted">{new Date(order.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <p className="text-xs text-text-muted font-bold uppercase tracking-wider">PRINT SPECIFICATIONS</p>
                                    <div className="space-y-3">
                                        {Array.isArray(order.printOptions) ? order.printOptions.map((opt, optIdx) => (
                                            <div key={optIdx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                                                <div className="flex justify-between items-baseline">
                                                    <p className="text-[11px] font-bold text-slate-800 truncate flex-1 pr-2" title={order.files[optIdx]?.originalName}>
                                                        {order.files[optIdx]?.originalName || `Document ${optIdx + 1}`}
                                                    </p>
                                                    {opt.price > 0 && (
                                                        <span className="text-[10px] font-black text-green-600">₹{opt.price.toFixed(2)}</span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-y-1 text-[10px] text-text-muted">
                                                    <div className="flex justify-between pr-2 border-r border-slate-200"><span>Mode:</span> <span className="font-bold text-slate-700">{opt.mode}</span></div>
                                                    <div className="flex justify-between pl-2"><span>Sides:</span> <span className="font-bold text-slate-700">{opt.side}</span></div>
                                                    <div className="flex justify-between pr-2 border-r border-slate-200"><span>Size:</span> <span className="font-bold text-slate-700">{opt.paperSize || 'A4'}</span></div>
                                                    <div className="flex justify-between pl-2"><span>Copies:</span> <span className="font-bold text-slate-700">{opt.copies}</span></div>
                                                    {opt.binding !== 'Loose Papers' && (
                                                        <div className="col-span-2 pt-1 mt-1 border-t border-slate-100 text-blue-600 font-bold uppercase tracking-tighter">
                                                            Binding: {opt.binding} (x{opt.bindingQuantity || 1})
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-sm italic text-red-500">Settings Unavailable</p>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-xs text-text-muted font-bold uppercase tracking-wider">UPLOADED FILES</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                                        {order.files.map((file, fIdx) => (
                                            <div key={fIdx} className="flex items-center gap-3 p-2 bg-bg rounded-lg border border-border/50 shadow-sm">
                                                <span className="text-lg">📄</span>
                                                <span className="text-xs truncate font-medium flex-1">{file.originalName}</span>
                                                {file.url ? (
                                                    <div className="flex gap-2">
                                                        <a href={file.url} target="_blank" rel="noreferrer" className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px] font-bold hover:bg-blue-700 transition-colors">VIEW</a>
                                                    </div>
                                                ) : (
                                                    <span className="text-text-muted text-[10px] font-bold">POS</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {order.deliveryDetails?.courierPartner && (
                                        <div className="pt-4 border-t border-slate-100">
                                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Courier Partner</p>
                                            <p className="text-xs font-bold text-blue-700 mt-1 flex items-center gap-2">
                                                <span>🚚</span> {order.deliveryDetails.courierPartner}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6 border-t border-border">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-text-muted font-medium">Total Amount:</p>
                                    <p className="text-2xl font-bold font-outfit text-primary">₹{order.pricing.totalAmount.toFixed(2)}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                    {!order.payment.isPaid && (order.status === 'received' || order.status === 'failed') && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const { data } = await axios.post(`/api/order/payment-link/${order._id}`);
                                                    if (data.success) {
                                                        window.open(data.paymentUrl, '_blank');
                                                    } else {
                                                        toast.error(data.message);
                                                    }
                                                } catch (err) {
                                                    toast.error("Failed to generate payment link");
                                                }
                                            }}
                                            className="btn-primary flex-1 md:flex-none py-3 px-6 text-sm bg-orange-600"
                                        >
                                            Pay Now 💳
                                        </button>
                                    )}
                                    <button
                                        onClick={() => window.open(`${axios.defaults.baseURL}/api/order/thermal-bill/${order._id}`, '_blank')}
                                        className="btn-outline flex-1 md:flex-none py-3 px-6 text-sm"
                                    >
                                        Download Invoice
                                    </button>
                                    <button onClick={() => trackOnWA(order)} className="btn-primary flex-1 md:flex-none py-3 px-6 text-sm flex items-center justify-center gap-2">
                                        <span>Track on WA</span>
                                        <span className="bg-white/20 p-0.5 rounded-full text-white">💬</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div >
    )
}

export default MyOrders
