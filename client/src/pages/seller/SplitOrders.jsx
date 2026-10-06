import React, { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';
import { mergePdfFiles, downloadPdfBlob, printPdfBlob, sortSplitFiles } from '../../utils/pdfMerger';

const SplitOrders = () => {
    const { axios, sellerRole } = useAppContext();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'ready', 'completed'
    
    // Merging states
    const [mergeProgress, setMergeProgress] = useState(null); // { active: boolean, title: '', percent: 0, message: '', stage: '', mergedBlob: null, fileName: '', mode: 'download' | 'print' }

    // Fetch all orders
    const fetchOrders = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/order/all');
            if (data.success) {
                setOrders(data.orders || []);
            } else {
                toast.error(data.message || 'Failed to fetch orders');
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Error loading orders: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // Filter only orders that contain split documents
    const splitOrders = useMemo(() => {
        return orders.filter(order => {
            if (!Array.isArray(order.files)) return false;
            // Check if any file is marked as split or has -splitN.pdf naming pattern
            return order.files.some(f => 
                f.isSplit === true || 
                f.parentFileName || 
                /-split\d+\.pdf$/i.test(f.originalName || '')
            );
        });
    }, [orders]);

    // Group files by parent document for an order
    const getGroupedSplitFiles = (order) => {
        const groups = {}; // parentKey -> { parentName, files: [], printOptions: [] }
        const nonSplitFiles = [];

        order.files.forEach((file, index) => {
            const printOpt = Array.isArray(order.printOptions) ? order.printOptions[index] : null;
            const match = (file.originalName || '').match(/^(.*?)-split(\d+)\.pdf$/i);
            const isMarkedSplit = file.isSplit || !!file.parentFileName || !!match;

            if (!isMarkedSplit) {
                nonSplitFiles.push({ file, index, printOpt });
                return;
            }

            const parentName = file.parentFileName || (match ? `${match[1]}.pdf` : file.originalName);
            const partNum = file.splitPart || (match ? parseInt(match[2], 10) : index + 1);

            if (!groups[parentName]) {
                groups[parentName] = {
                    parentName,
                    files: [],
                    totalExpectedParts: file.totalSplits || 0
                };
            }

            groups[parentName].files.push({
                ...file,
                splitPart: partNum,
                fileIndex: index,
                printOpt
            });
        });

        // Ensure each group is sorted sequentially
        Object.keys(groups).forEach(key => {
            groups[key].files = sortSplitFiles(groups[key].files);
        });

        return { groups: Object.values(groups), nonSplitFiles };
    };

    // Calculate metrics
    const metrics = useMemo(() => {
        let totalPartsCount = 0;
        let activeOrders = 0;
        let readyOrders = 0;
        let completedOrders = 0;

        splitOrders.forEach(o => {
            const splitFiles = (o.files || []).filter(f => 
                f.isSplit || f.parentFileName || /-split\d+\.pdf$/i.test(f.originalName || '')
            );
            totalPartsCount += splitFiles.length;

            if (['received', 'printing'].includes(o.status)) activeOrders++;
            else if (o.status === 'ready') readyOrders++;
            else if (['delivered', 'picked_up'].includes(o.status)) completedOrders++;
        });

        return {
            totalOrders: splitOrders.length,
            totalParts: totalPartsCount,
            activeOrders,
            readyOrders,
            completedOrders
        };
    }, [splitOrders]);

    // Apply search and filter
    const filteredOrders = useMemo(() => {
        return splitOrders.filter(order => {
            // Status filter
            if (statusFilter === 'active' && !['received', 'printing'].includes(order.status)) return false;
            if (statusFilter === 'ready' && order.status !== 'ready') return false;
            if (statusFilter === 'completed' && !['delivered', 'picked_up'].includes(order.status)) return false;

            // Search query
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            const orderId = (order._id || '').slice(-8).toUpperCase();
            const customerName = (order.userId?.name || '').toLowerCase();
            const customerPhone = (order.deliveryDetails?.phone || order.userId?.phone || '').toLowerCase();
            const fileNames = (order.files || []).map(f => (f.originalName || '').toLowerCase()).join(' ');

            return orderId.includes(q.toUpperCase()) || 
                   customerName.includes(q) || 
                   customerPhone.includes(q) || 
                   fileNames.includes(q);
        });
    }, [splitOrders, statusFilter, searchQuery]);

    // Handle single group merge & download or print
    const handleMergeGroup = async (group, order, mode = 'download') => {
        const orderShortId = (order._id || '').slice(-8).toUpperCase();
        const cleanParent = group.parentName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        const outputFileName = `[MERGED]_Order_${orderShortId}_${cleanParent}.pdf`;

        setMergeProgress({
            active: true,
            title: `Merging ${group.parentName}`,
            percent: 5,
            stage: 'init',
            message: `Starting merge of ${group.files.length} split parts...`,
            orderId: orderShortId,
            mode
        });

        try {
            const result = await mergePdfFiles(group.files, {
                outputName: outputFileName,
                axiosInstance: axios,
                onProgress: ({ percent, message, stage }) => {
                    setMergeProgress(prev => prev ? {
                        ...prev,
                        percent,
                        message,
                        stage
                    } : null);
                }
            });

            setMergeProgress(prev => prev ? {
                ...prev,
                percent: 100,
                stage: 'complete',
                message: `Successfully combined into ${result.totalPages} pages!`,
                mergedBlob: result.blob,
                fileName: outputFileName
            } : null);

            if (mode === 'download') {
                downloadPdfBlob(result.blob, outputFileName);
                toast.success(`Merged PDF downloaded: ${outputFileName}`);
            } else if (mode === 'print') {
                printPdfBlob(result.blob, `Print Express - ${outputFileName}`);
                toast.success(`Print preview launched for: ${outputFileName}`);
            }
        } catch (error) {
            console.error('Merge error:', error);
            toast.error('Failed to merge PDF parts: ' + error.message);
            setMergeProgress(null);
        }
    };

    // Handle merge all split groups in an order
    const handleMergeAllInOrder = async (order, mode = 'download') => {
        const { groups } = getGroupedSplitFiles(order);
        if (groups.length === 0) {
            toast.error('No split files found to merge in this order.');
            return;
        }

        const orderShortId = (order._id || '').slice(-8).toUpperCase();

        if (groups.length === 1) {
            return handleMergeGroup(groups[0], order, mode);
        }

        // If multiple different documents are split in the same order, merge all files sequentially
        const allSplitFiles = groups.flatMap(g => g.files);
        const outputFileName = `[ALL_MERGED]_Order_${orderShortId}_AllDocuments.pdf`;

        setMergeProgress({
            active: true,
            title: `Merging All Files in Order #${orderShortId}`,
            percent: 5,
            stage: 'init',
            message: `Preparing to merge ${allSplitFiles.length} files across ${groups.length} documents...`,
            orderId: orderShortId,
            mode
        });

        try {
            const result = await mergePdfFiles(allSplitFiles, {
                outputName: outputFileName,
                axiosInstance: axios,
                onProgress: ({ percent, message, stage }) => {
                    setMergeProgress(prev => prev ? {
                        ...prev,
                        percent,
                        message,
                        stage
                    } : null);
                }
            });

            setMergeProgress(prev => prev ? {
                ...prev,
                percent: 100,
                stage: 'complete',
                message: `Successfully combined ${allSplitFiles.length} files into ${result.totalPages} pages!`,
                mergedBlob: result.blob,
                fileName: outputFileName
            } : null);

            if (mode === 'download') {
                downloadPdfBlob(result.blob, outputFileName);
                toast.success(`Complete order PDF downloaded: ${outputFileName}`);
            } else {
                printPdfBlob(result.blob, `Print Express - ${outputFileName}`);
                toast.success(`Print preview launched for complete order #${orderShortId}`);
            }
        } catch (error) {
            console.error('Batch merge error:', error);
            toast.error('Failed to merge order files: ' + error.message);
            setMergeProgress(null);
        }
    };

    // Update order status directly from this hub
    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            const { data } = await axios.post('/api/order/update-status', { orderId, status: newStatus });
            if (data.success) {
                toast.success(`Order status updated to ${newStatus}`);
                setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
            } else {
                toast.error(data.message || 'Failed to update status');
            }
        } catch (error) {
            toast.error('Error updating status: ' + error.message);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'received': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'printing': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'ready': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'delivered': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'picked_up': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'cancelled': return 'bg-slate-100 text-slate-500 line-through border-slate-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-16">
            {/* Header Hero */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-indigo-200 mb-3 border border-white/10">
                            <span>✂️</span>
                            <span>Large Document Split & Merge Hub</span>
                        </div>
                        <h1 className="text-3xl font-black font-outfit tracking-tight">
                            Split Orders & Auto-Merge Engine
                        </h1>
                        <p className="text-slate-300 text-sm mt-2 max-w-2xl leading-relaxed">
                            Orders where customer files exceeded 10 MB and were split into sequential parts. 
                            Merge split parts into a single seamless PDF in one click and send directly to the printer.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchOrders}
                            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all flex items-center gap-2 backdrop-blur-sm"
                        >
                            <span>🔄</span> Refresh
                        </button>
                    </div>
                </div>

                {/* Metric Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                        <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Split Orders</p>
                        <p className="text-2xl font-black mt-1 text-white">{metrics.totalOrders}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                        <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Total Split Parts</p>
                        <p className="text-2xl font-black mt-1 text-indigo-300">{metrics.totalParts}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                        <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Pending / Printing</p>
                        <p className="text-2xl font-black mt-1 text-amber-300">{metrics.activeOrders}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                        <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Ready / Completed</p>
                        <p className="text-2xl font-black mt-1 text-emerald-300">{metrics.readyOrders + metrics.completedOrders}</p>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by Order #, Customer, or File name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                    {[
                        { id: 'all', label: 'All Splits' },
                        { id: 'active', label: 'Pending / Printing' },
                        { id: 'ready', label: 'Ready for Pickup' },
                        { id: 'completed', label: 'Completed' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                statusFilter === tab.id
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            {loading ? (
                <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm font-bold text-slate-600">Loading split document orders...</p>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                        ✂️
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Split Orders Found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        {searchQuery || statusFilter !== 'all'
                            ? 'No split orders match your search or filter criteria. Try resetting filters.'
                            : 'When customers upload PDF files exceeding 10 MB, they will be automatically organized here into sequentially numbered splits ready for 1-click merging.'}
                    </p>
                    {(searchQuery || statusFilter !== 'all') && (
                        <button
                            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredOrders.map(order => {
                        const orderShortId = (order._id || '').slice(-8).toUpperCase();
                        const { groups } = getGroupedSplitFiles(order);
                        const isStorePickup = order.fulfillmentType === 'pickup';

                        return (
                            <div 
                                key={order._id}
                                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden"
                            >
                                {/* Order Top Header */}
                                <div className="p-6 bg-slate-50/70 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-black font-outfit text-slate-900">
                                                #{orderShortId}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(orderShortId);
                                                    toast.success('Order ID copied');
                                                }}
                                                className="text-slate-400 hover:text-slate-600 text-xs"
                                                title="Copy Order ID"
                                            >
                                                📋
                                            </button>
                                        </div>

                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${getStatusBadge(order.status)}`}>
                                            {order.status}
                                        </span>

                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                            order.payment?.isPaid 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                        }`}>
                                            {order.payment?.isPaid ? 'PAID' : 'UNPAID'}
                                        </span>

                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                                            {isStorePickup ? '🏪 Store Pickup' : '🚚 Home Delivery'}
                                        </span>

                                        <span className="text-xs text-slate-400">
                                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>

                                    {/* Customer info & Quick Actions */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="text-right mr-2 hidden sm:block">
                                            <p className="text-xs font-bold text-slate-800">{order.userId?.name || 'Customer'}</p>
                                            <p className="text-[11px] text-slate-500">{order.deliveryDetails?.phone || order.userId?.phone || 'No phone'}</p>
                                        </div>

                                        {(order.deliveryDetails?.phone || order.userId?.phone) && (
                                            <a
                                                href={`https://wa.me/${order.deliveryDetails?.phone || order.userId?.phone}?text=Hello! Regarding your Print Express order #${orderShortId}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 flex items-center gap-1.5"
                                                title="Message on WhatsApp"
                                            >
                                                <span>💬</span> WhatsApp
                                            </a>
                                        )}

                                        {/* Status selector */}
                                        <select
                                            value={order.status}
                                            onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                                            className="text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-primary"
                                        >
                                            <option value="received">Received</option>
                                            <option value="printing">Printing</option>
                                            <option value="ready">Ready</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="picked_up">Picked Up</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>

                                        {/* Invoice link */}
                                        <button
                                            onClick={() => window.open(`${axios.defaults.baseURL}/api/order/thermal-bill/${order._id}`, '_blank')}
                                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                                            title="View Tax Invoice"
                                        >
                                            <span>🧾</span> Invoice
                                        </button>

                                        {/* Master Merge All Button for the whole Order */}
                                        <button
                                            onClick={() => handleMergeAllInOrder(order, 'download')}
                                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-700 text-white text-xs font-black shadow-xs hover:shadow-md transition-all flex items-center gap-2"
                                            title="Merge all files in this order into one PDF"
                                        >
                                            <span>⚡</span> Merge All in Order
                                        </button>
                                    </div>
                                </div>

                                {/* Split Groups Inside Order */}
                                <div className="p-6 divide-y divide-slate-100 space-y-6">
                                    {groups.map((group, groupIdx) => {
                                        const firstOpt = group.files[0]?.printOpt;

                                        return (
                                            <div key={groupIdx} className={groupIdx > 0 ? 'pt-6' : ''}>
                                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xl">📄</span>
                                                            <h4 className="text-base font-bold text-slate-900">
                                                                {group.parentName}
                                                            </h4>
                                                            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-black uppercase">
                                                                {group.files.length} Split Parts
                                                            </span>
                                                        </div>

                                                        {/* Print Specs summary */}
                                                        {firstOpt && (
                                                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600">
                                                                <span className="font-semibold text-slate-700">Specifications:</span>
                                                                <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">
                                                                    {firstOpt.color === 'bw' ? 'B/W' : 'Color'}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">
                                                                    {firstOpt.sides === 'double' ? 'Double Sided' : 'Single Sided'}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">
                                                                    {firstOpt.paperSize || 'A4'}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">
                                                                    {firstOpt.copies || 1} {firstOpt.copies > 1 ? 'Copies' : 'Copy'}
                                                                </span>
                                                                {firstOpt.binding && firstOpt.binding !== 'none' && (
                                                                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                                                                        Binding: {firstOpt.binding}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Document Group Actions */}
                                                    <div className="flex items-center gap-2.5">
                                                        {/* Merge & Print Directly */}
                                                        <button
                                                            onClick={() => handleMergeGroup(group, order, 'print')}
                                                            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all flex items-center gap-2"
                                                            title="Merge and immediately open browser print preview"
                                                        >
                                                            <span>🖨️</span> Merge & Print
                                                        </button>

                                                        {/* Merge & Download */}
                                                        <button
                                                            onClick={() => handleMergeGroup(group, order, 'download')}
                                                            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
                                                            title="Merge all parts and download complete original PDF"
                                                        >
                                                            <span>⚡</span> Merge & Download
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Sequential Parts Pipeline */}
                                                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/60">
                                                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                                                        <span>🔢 Sequential Parts Order (Print in this sequence):</span>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {group.files.map((file, pIdx) => {
                                                            const partNum = file.splitPart || pIdx + 1;
                                                            const mb = file.fileSize ? (file.fileSize / (1024 * 1024)).toFixed(1) : null;

                                                            return (
                                                                <React.Fragment key={file._id || pIdx}>
                                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs text-xs font-medium text-slate-700">
                                                                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[10px] flex items-center justify-center">
                                                                            {partNum}
                                                                        </span>
                                                                        <span className="font-bold text-slate-900">
                                                                            Part {partNum}
                                                                        </span>
                                                                        {file.pageRange && (
                                                                            <span className="text-[11px] text-purple-600 font-semibold">
                                                                                (p. {file.pageRange})
                                                                            </span>
                                                                        )}
                                                                        {mb && (
                                                                            <span className="text-[10px] text-slate-400">
                                                                                {mb} MB
                                                                            </span>
                                                                        )}
                                                                        {file.url && (
                                                                            <a
                                                                                href={file.url}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="text-slate-400 hover:text-primary ml-1"
                                                                                title="Preview this single part"
                                                                            >
                                                                                👁️
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                    {pIdx < group.files.length - 1 && (
                                                                        <span className="text-slate-300 font-black text-sm">➔</span>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Live Merging Progress Modal */}
            {mergeProgress && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
                                    {mergeProgress.stage === 'complete' ? '✅' : '⚡'}
                                </div>
                                <div>
                                    <h3 className="font-bold font-outfit text-slate-900 text-base">
                                        {mergeProgress.title}
                                    </h3>
                                    <p className="text-xs text-slate-400">Order #{mergeProgress.orderId}</p>
                                </div>
                            </div>
                            {mergeProgress.stage === 'complete' && (
                                <button
                                    onClick={() => setMergeProgress(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2 my-4">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-600">{mergeProgress.message}</span>
                                <span className="text-primary">{mergeProgress.percent}%</span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${
                                        mergeProgress.stage === 'complete' 
                                            ? 'bg-emerald-500' 
                                            : 'bg-gradient-to-r from-primary to-indigo-600'
                                    }`}
                                    style={{ width: `${mergeProgress.percent}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Status detail */}
                        {mergeProgress.stage !== 'complete' ? (
                            <p className="text-[11px] text-slate-400 italic text-center">
                                Stitching PDF pages in sequential order with full fidelity... Please keep this window open.
                            </p>
                        ) : (
                            <div className="space-y-3 pt-2">
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
                                    <span className="text-base">🎉</span>
                                    <span>PDF merged and ready! All pages assembled in order.</span>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <button
                                        onClick={() => {
                                            downloadPdfBlob(mergeProgress.mergedBlob, mergeProgress.fileName);
                                            toast.success('Download started');
                                        }}
                                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        <span>💾</span> Download Again
                                    </button>
                                    <button
                                        onClick={() => {
                                            printPdfBlob(mergeProgress.mergedBlob, mergeProgress.fileName);
                                            toast.success('Print window opened');
                                        }}
                                        className="flex-1 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        <span>🖨️</span> Print Now
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SplitOrders;
