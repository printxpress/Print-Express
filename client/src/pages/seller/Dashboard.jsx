import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Link } from 'react-router-dom';
import { assets } from '../../assets/assets';

const Dashboard = () => {
    const { axios } = useAppContext();
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch orders
            try {
                const { data } = await axios.get('/api/order/all');
                if (data.success) setOrders(data.orders || []);
            } catch (e) { console.log('Orders fetch error:', e.message); }

            // Fetch users/customers  
            try {
                const { data } = await axios.get('/api/user/all');
                if (data.success) setCustomers(data.users || []);
            } catch (e) { console.log('Users fetch error:', e.message); }
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

    // Calculate stats
    const totalRevenue = orders.reduce((sum, o) => sum + (o.pricing?.totalAmount || 0), 0);
    const todayOrders = orders.filter(o => {
        const today = new Date().toDateString();
        return new Date(o.createdAt).toDateString() === today;
    });
    const pendingOrders = orders.filter(o => o.status === 'received' || o.status === 'printing');
    const deliveredOrders = orders.filter(o => o.status === 'delivered');

    const posOrdersCount = orders.filter(o => o.files.some(f => f.fileType === 'POS Service')).length;
    const onlineOrdersCount = orders.length - posOrdersCount;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                    <div className="text-5xl animate-bounce">🖨️</div>
                    <p className="text-text-muted font-medium">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-outfit">Admin Dashboard</h1>
                    <p className="text-sm text-text-muted">Welcome back! Here's your business overview.</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/seller/orders" className="btn-primary py-2 px-5 text-sm">View All Orders</Link>
                    <button onClick={fetchData} className="btn-outline py-2 px-4 text-sm">Refresh 🔄</button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-border space-y-2 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-text-muted font-semibold uppercase">Total Revenue</p>
                        <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center p-1.5 border border-green-100">
                            <img src={assets.coin_icon} alt="Revenue" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold font-outfit text-green-600">₹{totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-text-muted">{orders.length} orders total</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-border space-y-2 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-text-muted font-semibold uppercase">Print Online</p>
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center p-1.5 border border-blue-100">
                            <img src={assets.bw_print_icon} alt="Online" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold font-outfit text-primary">{onlineOrdersCount}</p>
                    <p className="text-xs text-blue-600">{pendingOrders.length} pending</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-border space-y-2 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-text-muted font-semibold uppercase">POS Sales</p>
                        <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center p-1.5 border border-purple-100">
                            <img src={assets.cart_icon} alt="POS" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold font-outfit text-purple-600">{posOrdersCount}</p>
                    <p className="text-xs text-purple-600">Walk-in transactions</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-border space-y-2 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-text-muted font-semibold uppercase">Customers</p>
                        <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center p-1.5 border border-orange-100">
                            <img src={assets.profile_icon} alt="Customers" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold font-outfit text-orange-600">{customers.length}</p>
                    <p className="text-xs text-orange-600">Registered users</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-border overflow-hidden">
                    <div className="flex justify-between items-center p-5 border-b border-border">
                        <h3 className="font-bold font-outfit">Recent Orders</h3>
                        <Link to="/seller/orders" className="text-xs text-primary font-bold hover:underline">View All →</Link>
                    </div>
                    <div className="divide-y divide-border">
                        {orders.length === 0 ? (
                            <div className="p-8 text-center text-text-muted">
                                <p className="text-3xl mb-2">📭</p>
                                <p>No orders yet</p>
                            </div>
                        ) : (
                            orders.slice(0, 6).map((order, i) => (
                                <div key={i} className="flex items-center justify-between p-4 hover:bg-blue-50/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center text-lg">
                                            🖨️
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold font-outfit">#{order._id?.slice(-8).toUpperCase()}</p>
                                            <p className="text-xs text-text-muted">
                                                {Array.isArray(order.printOptions) ? (
                                                    `${order.files?.length || 0} files · ${order.printOptions[0]?.mode} ${order.printOptions.length > 1 ? '...' : ''}`
                                                ) : (
                                                    `${order.printOptions?.mode} · ${order.files?.length || 0} file(s)`
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-primary">₹{(order.pricing?.totalAmount || 0).toFixed(0)}</p>
                                            <p className="text-[10px] text-text-muted">{new Date(order.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Customer List */}
                <div className="bg-white rounded-2xl border border-border overflow-hidden">
                    <div className="flex justify-between items-center p-5 border-b border-border">
                        <h3 className="font-bold font-outfit">Recent Customers</h3>
                        <Link to="/seller/customers" className="text-xs text-primary font-bold hover:underline">View All →</Link>
                    </div>
                    <div className="divide-y divide-border">
                        {customers.length === 0 ? (
                            <div className="p-8 text-center text-text-muted">
                                <p className="text-3xl mb-2">👥</p>
                                <p>No customers yet</p>
                            </div>
                        ) : (
                            customers.slice(0, 8).map((c, i) => (
                                <div key={i} className="flex items-center gap-3 p-4 hover:bg-blue-50/30 transition-colors">
                                    <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                                        {c.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{c.name || 'Unnamed'}</p>
                                        <p className="text-xs text-text-muted font-mono">{c.phone}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to="/seller/pos" className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-5 rounded-2xl hover:shadow-xl transition-all group">
                    <span className="text-3xl group-hover:scale-110 transition-transform inline-block">📟</span>
                    <p className="font-bold mt-3">POS Mode</p>
                    <p className="text-xs text-white/70">Quick billing</p>
                </Link>
                <Link to="/seller/services" className="bg-gradient-to-br from-green-500 to-green-700 text-white p-5 rounded-2xl hover:shadow-xl transition-all group">
                    <span className="text-3xl group-hover:scale-110 transition-transform inline-block">📄</span>
                    <p className="font-bold mt-3">Print Services</p>
                    <p className="text-xs text-white/70">Manage catalog</p>
                </Link>
                <Link to="/seller/pricing" className="bg-gradient-to-br from-orange-500 to-orange-700 text-white p-5 rounded-2xl hover:shadow-xl transition-all group">
                    <span className="text-3xl group-hover:scale-110 transition-transform inline-block">💰</span>
                    <p className="font-bold mt-3">Pricing Rules</p>
                    <p className="text-xs text-white/70">Set your rates</p>
                </Link>
                <Link to="/seller/analytics" className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-5 rounded-2xl hover:shadow-xl transition-all group">
                    <span className="text-3xl group-hover:scale-110 transition-transform inline-block">📊</span>
                    <p className="font-bold mt-3">Analytics</p>
                    <p className="text-xs text-white/70">View reports</p>
                </Link>
            </div>

            {/* Order Status Pipeline */}
            <div className="bg-white rounded-2xl border border-border p-6">
                <h3 className="font-bold font-outfit mb-6">Order Pipeline</h3>
                <div className="grid grid-cols-4 gap-4">
                    {/* ... pipeline items ... */}
                    <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <p className="text-3xl font-bold font-outfit text-blue-600">{orders.filter(o => o.status === 'received').length}</p>
                        <p className="text-xs font-semibold text-blue-700 mt-1">Received</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                        <p className="text-3xl font-bold font-outfit text-yellow-600">{orders.filter(o => o.status === 'printing').length}</p>
                        <p className="text-xs font-semibold text-yellow-700 mt-1">Printing</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                        <p className="text-3xl font-bold font-outfit text-purple-600">{orders.filter(o => o.status === 'ready').length}</p>
                        <p className="text-xs font-semibold text-purple-700 mt-1">Ready</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                        <p className="text-3xl font-bold font-outfit text-green-600">{deliveredOrders.length}</p>
                        <p className="text-xs font-semibold text-green-700 mt-1">Delivered</p>
                    </div>
                </div>
            </div>

            {/* System Maintenance */}
            <div className="bg-white rounded-2xl border border-red-100 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-2xl border border-red-100">
                        🧹
                    </div>
                    <div>
                        <h3 className="font-bold font-outfit text-lg">System Maintenance</h3>
                        <p className="text-xs text-text-muted max-w-sm">Securely purge customer files older than 7 days to free up storage and protect privacy. Records will be kept.</p>
                    </div>
                </div>
                <button
                    onClick={async () => {
                        if (!window.confirm("Purge files older than 7 days? This cannot be undone.")) return;
                        try {
                            const { data } = await axios.delete('/api/order/cleanup');
                            if (data.success) {
                                toast.success(data.message);
                                fetchData();
                            } else {
                                toast.error(data.message);
                            }
                        } catch (error) {
                            toast.error("Cleanup failed");
                        }
                    }}
                    className="bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-600 hover:text-white transition-all border border-red-200"
                >
                    Purge Old Files ({" > "} 7 Days)
                </button>
            </div>
        </div >
    );
};

export default Dashboard;
