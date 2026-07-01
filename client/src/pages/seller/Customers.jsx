import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const Customers = () => {
    const { axios } = useAppContext();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/user/all');
            if (data.success) {
                setCustomers(data.users || []);
            }
        } catch (error) {
            console.error("Failed to fetch customers:", error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleDelete = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this customer? This will also delete their wallet.")) return;
        try {
            const { data } = await axios.post('/api/user/delete-customer', { userId });
            if (data.success) {
                toast.success(data.message);
                fetchCustomers();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    const handleEditUpdate = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.post('/api/user/update-customer', {
                userId: editingCustomer._id,
                ...editingCustomer
            });
            if (data.success) {
                toast.success(data.message);
                setShowEditModal(false);
                fetchCustomers();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery) ||
        c.city?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                    <div className="text-4xl animate-bounce">👥</div>
                    <p className="text-text-muted">Loading customers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-outfit">Customers</h1>
                    <p className="text-sm text-text-muted">{customers.length} registered customers</p>
                </div>
                <input
                    type="text"
                    placeholder="Search by name, phone, or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field max-w-xs"
                />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-border">
                    <p className="text-xs text-text-muted">Total Customers</p>
                    <p className="text-2xl font-bold text-primary">{customers.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border">
                    <p className="text-xs text-text-muted">Total Orders</p>
                    <p className="text-2xl font-bold text-green-600">{customers.reduce((acc, c) => acc + (c.orders || 0), 0)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border">
                    <p className="text-xs text-text-muted">Total Revenue</p>
                    <p className="text-2xl font-bold text-orange-600">₹{customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0).toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border">
                    <p className="text-xs text-text-muted">Avg. per Customer</p>
                    <p className="text-2xl font-bold text-purple-600">
                        ₹{customers.length > 0 ? Math.round(customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0) / customers.length) : 0}
                    </p>
                </div>
            </div>

            {/* Customer Table */}
            <div className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-text-muted">
                            <tr>
                                <th className="text-left p-4">Customer</th>
                                <th className="text-left p-4">Phone</th>
                                <th className="text-left p-4">City</th>
                                <th className="text-left p-4">Referred By</th>
                                <th className="text-center p-4">Orders</th>
                                <th className="text-right p-4">Total Spent</th>
                                <th className="text-right p-4">Joined</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map((customer) => (
                                <tr key={customer._id} className="border-t border-border hover:bg-blue-50/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center font-bold text-primary text-xs">
                                                {customer.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold">{customer.name}</p>
                                                <p className="text-xs text-text-muted">{customer.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-xs">{customer.phone}</td>
                                    <td className="p-4">{customer.city || '-'}</td>
                                    <td className="p-4">
                                        {customer.referredBy ? (
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-xs">{customer.referredBy.name}</span>
                                                <span className="text-[10px] text-text-muted">{customer.referredBy.phone}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">Direct</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">{customer.orders || 0}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="font-semibold text-slate-800">₹{(customer.totalSpent || 0).toLocaleString()}</div>
                                        {customer.unpaidAmount > 0 && (
                                            <div className="text-[10px] mt-1 inline-block bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full font-bold animate-pulse whitespace-nowrap">
                                                Unpaid: ₹{customer.unpaidAmount.toLocaleString()}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-right text-xs text-text-muted">
                                        {new Date(customer.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => { setEditingCustomer(customer); setShowEditModal(true); }}
                                                className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                                title="Edit Customer"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(customer._id)}
                                                className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                                title="Delete Customer"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredCustomers.length === 0 && (
                    <div className="text-center py-12 text-text-muted">
                        <p className="text-4xl mb-2">🔍</p>
                        <p>No customers found</p>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {showEditModal && editingCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in-up">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-bold font-outfit">Edit Customer</h2>
                            <button onClick={() => setShowEditModal(false)} className="text-text-muted hover:text-black text-xl">✕</button>
                        </div>
                        <form onSubmit={handleEditUpdate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Full Name</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={editingCustomer.name}
                                    onChange={e => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Email</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    value={editingCustomer.email}
                                    onChange={e => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">Phone</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={editingCustomer.phone}
                                        onChange={e => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">City</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={editingCustomer.city || ''}
                                        onChange={e => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Referral Balance (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={editingCustomer.referralBalance}
                                    onChange={e => setEditingCustomer({ ...editingCustomer, referralBalance: Number(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 btn-outline py-3">Cancel</button>
                                <button type="submit" className="flex-1 btn-primary py-3 hover-glow">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
