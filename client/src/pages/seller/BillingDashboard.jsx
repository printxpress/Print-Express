import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Link } from 'react-router-dom';

const BillingDashboard = () => {
    const { axios } = useAppContext();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trackingInput, setTrackingInput] = useState({}); // {orderId: {courier, number}}

    const handleTrackingChange = (orderId, field, value) => {
        setTrackingInput(prev => ({
            ...prev,
            [orderId]: { ...prev[orderId], [field]: value }
        }));
    };

    const updateTracking = async (orderId) => {
        const input = trackingInput[orderId];
        if (!input || !input.courier || !input.number) {
            alert("Please enter both courier name and tracking number");
            return;
        }

        try {
            const { data } = await axios.post('/api/billing/update-tracking', {
                orderId,
                courierName: input.courier,
                trackingNumber: input.number
            });
            if (data.success) {
                alert("Tracking updated successfully");
                fetchData();
            }
        } catch (error) {
            console.error("Tracking update failed", error);
        }
    };

    const logAndFollowUp = async (order) => {
        const phone = order.deliveryDetails?.phone || order.userId?.phone;
        if (!phone) return;

        const message = `Hello, your order #${order._id?.slice(-8).toUpperCase()} is currently ${order.status}. We are processing it. Thank you!`;

        try {
            await axios.post('/api/billing/log-message', {
                orderId: order._id,
                userId: order.userId?._id,
                phoneNumber: phone,
                content: message
            });
        } catch (e) {
            console.log('Logging failed:', e.message);
        }

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    }

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data } = await axios.get('/api/order/all');
            if (data.success) setOrders(data.orders || []);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const map = {
            'received': 'bg-blue-100 text-blue-700',
            'printing': 'bg-yellow-100 text-yellow-700',
            'ready': 'bg-purple-100 text-purple-700',
            'delivered': 'bg-green-100 text-green-700',
        };
        return map[status] || 'bg-gray-100 text-gray-700';
    };

    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const newOrders = orders.filter(o => o.status === 'received');
    const printingOrders = orders.filter(o => o.status === 'printing');
    const readyOrders = orders.filter(o => o.status === 'ready');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                    <div className="text-5xl animate-bounce">📦</div>
                    <p className="text-text-muted font-medium">Loading Billing Terminal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black font-outfit text-slate-900 tracking-tight">Billing Terminal</h1>
                    <p className="text-sm text-text-muted font-medium">Operational view for order tracking and customer communication.</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/seller/orders" className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-black transition-all">View Full Order List</Link>
                    <button onClick={fetchData} className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold hover:bg-slate-50 transition-all">Refresh Sync 🔄</button>
                </div>
            </div>

            {/* Operational Stats (No Financials) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">New</p>
                        <span className="text-xl">🆕</span>
                    </div>
                    <p className="text-3xl font-black font-outfit text-blue-600">{newOrders.length}</p>
                    <p className="text-xs text-slate-400 font-medium italic">Pending processing</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">In Print</p>
                        <span className="text-xl">🖨️</span>
                    </div>
                    <p className="text-3xl font-black font-outfit text-yellow-500">{printingOrders.length}</p>
                    <p className="text-xs text-slate-400 font-medium italic">Active production</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Ready</p>
                        <span className="text-xl">📦</span>
                    </div>
                    <p className="text-3xl font-black font-outfit text-purple-600">{readyOrders.length}</p>
                    <p className="text-xs text-slate-400 font-medium italic">Need Courier Assignment</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Delivered</p>
                        <span className="text-xl">✅</span>
                    </div>
                    <p className="text-3xl font-black font-outfit text-green-600">{deliveredOrders.length}</p>
                    <p className="text-xs text-slate-400 font-medium italic">Completion count</p>
                </div>
            </div>

            {/* Tracking Update Queue */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 className="font-black font-outfit text-slate-900">Order Management Queue</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Recent Activity & Tracking Updates</p>
                    </div>
                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded">Active</span>
                </div>
                <div className="divide-y divide-slate-100">
                    {orders.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <p className="text-4xl mb-2">📭</p>
                            <p className="font-bold">No orders found in sync.</p>
                        </div>
                    ) : (
                        orders.slice(0, 15).map((order) => (
                            <div key={order._id} className="p-6 transition-all border-l-4 border-transparent hover:border-blue-600 hover:bg-slate-50/50">
                                <div className="flex flex-col lg:flex-row justify-between gap-6">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-xl shadow-sm">
                                                {order.files?.some(f => f.fileType === 'POS Service') ? '📟' : '📄'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black text-slate-900 tracking-tight">#{order._id?.slice(-8).toUpperCase()}</p>
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusColor(order.status)}`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium">{order.deliveryDetails?.phone || 'Guest Order'}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.isArray(order.printOptions) ? (
                                                <>
                                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">
                                                        📁 {order.printOptions.length} Doc(s)
                                                    </span>
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">
                                                        {order.printOptions[0]?.mode} | {order.printOptions[0]?.paperSize || 'A4'}
                                                        {order.printOptions.length > 1 ? ' ...' : ''}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">{order.printOptions?.mode || 'Service'}</span>
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">{order.printOptions?.paperSize || 'N/A'}</span>
                                                </>
                                            )}
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">{order.fulfillment?.method || 'Pickup'}</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-inner space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Courier</label>
                                                <input
                                                    type="text"
                                                    placeholder={order.trackingDetails?.courierName || "e.g. DTDC"}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-xs font-bold focus:bg-white focus:border-blue-500 transition-all outline-none"
                                                    onChange={(e) => handleTrackingChange(order._id, 'courier', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tracking ID</label>
                                                <input
                                                    type="text"
                                                    placeholder={order.trackingDetails?.trackingNumber || "ID..."}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono font-bold focus:bg-white focus:border-blue-500 transition-all outline-none"
                                                    onChange={(e) => handleTrackingChange(order._id, 'number', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateTracking(order._id)}
                                                className="flex-1 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase hover:bg-black transition-all"
                                            >
                                                Save Tracking
                                            </button>
                                            <button
                                                onClick={() => logAndFollowUp(order)}
                                                className="flex-1 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-green-700 transition-all flex items-center justify-center gap-1"
                                            >
                                                WhatsApp 📱
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {order.trackingDetails?.updatedAt && (
                                    <p className="text-[9px] text-slate-400 mt-3 font-medium italic">
                                        ✨ Last operational update: {new Date(order.trackingDetails.updatedAt).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default BillingDashboard;
