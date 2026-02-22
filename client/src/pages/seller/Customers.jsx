import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

const Customers = () => {
    const { axios } = useAppContext();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map((customer, index) => (
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
                                    <td className="p-4 text-right font-semibold">₹{(customer.totalSpent || 0).toLocaleString()}</td>
                                    <td className="p-4 text-right text-xs text-text-muted">
                                        {new Date(customer.createdAt).toLocaleDateString()}
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
        </div>
    );
};

export default Customers;
