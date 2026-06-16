import React, { useEffect, useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'
import logo from '../../assets/logo.png'

const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('//')) return 'https:' + url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
    }
    return url;
};

const Orders = () => {
    const { axios, sellerRole } = useAppContext()
    const [orders, setOrders] = useState([]);
    const [shopSettings, setShopSettings] = useState(null);
    const [filter, setFilter] = useState('all'); // all, online
    const [editingOrder, setEditingOrder] = useState(null);
    const [downloadingFile, setDownloadingFile] = useState({});

    const filteredOrders = orders.filter(o => {
        const isPos = o.files.some(f => f.fileType === 'POS Service');
        if (filter === 'online') return !isPos;
        return !isPos; // Default: hide POS
    });

    const fetchOrders = async () => {
        try {
            const [orderRes, settingsRes] = await Promise.all([
                axios.get('/api/order/all'),
                axios.get('/api/shop/settings')
            ]);
            if (orderRes.data.success) setOrders(orderRes.data.orders);
            if (settingsRes.data.success) setShopSettings(settingsRes.data.settings);
        } catch (error) {
            console.error(error.message);
        }
    };

    const updateStatus = async (orderId, status) => {
        try {
            const { data } = await axios.post('/api/order/update-status', { orderId, status });
            if (data.success) {
                toast.success("Status Updated");
                fetchOrders();
            }
        } catch (error) {
            toast.error("Failed to update status");
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

    const printLabel = (address, title) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Label - ${title}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
                        .label-card { border: 2px solid #000; padding: 30px; width: 400px; text-align: center; }
                        h1 { font-size: 14px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                        p { font-size: 18px; font-weight: bold; line-height: 1.5; margin: 0; }
                        .footer { margin-top: 20px; font-size: 10px; border-top: 1px solid #eee; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="label-card">
                        <h1>${title}</h1>
                        <p>${address.replace(/\n/g, '<br/>')}</p>
                        <div class="footer">Printed via Print Express Admin</div>
                    </div>
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const sendWANotification = (order) => {
        const phone = order.deliveryDetails.phone;
        const message = `Hello! Your Print Express order #${order._id.toString().slice(-8).toUpperCase()} is now ${order.status.toUpperCase()}. Thank you!`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    }

    const handleEditOrder = (order) => {
        setEditingOrder(order);
        setEditForm(Array.isArray(order.printOptions) ? JSON.parse(JSON.stringify(order.printOptions)) : []);
        setEditingFileIndex(0);
    }

    const saveEditOrder = async () => {
        try {
            const { data } = await axios.post(`/api/order/edit/${editingOrder._id}`, { printOptions: editForm });
            if (data.success) {
                toast.success("Order Updated");
                setEditingOrder(null);
                fetchOrders();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Failed to update order");
        }
    }

    const generateLinkAndWhatsApp = async (order) => {
        try {
            const loadingToast = toast.loading("Generating payment link...");
            const { data } = await axios.post(`/api/order/payment-link/${order._id}`);
            toast.dismiss(loadingToast);

            if (data.success) {
                const phone = order.deliveryDetails.phone || order.userId?.phone;
                const billUrl = `${axios.defaults.baseURL}/api/order/thermal-bill/${order._id}`;
                const message = `*PRINT EXPRESS BILL*\n\nOrder: #${order._id.toString().slice(-8).toUpperCase()}\nTotal: ₹${order.pricing.totalAmount.toFixed(2)}\n\nView Bill: ${billUrl}\nPay Now: ${data.paymentLink}\n\nThank you!`;
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
            } else {
                toast.error("Failed to generate payment link");
            }
        } catch (error) {
            toast.error("Error generating notification");
        }
    }

    const downloadThermalBill = (orderId) => {
        window.open(`${axios.defaults.baseURL}/api/order/thermal-bill/${orderId}`, '_blank');
    }

    const printFullLabel = (order) => {
        const printWindow = window.open('', '_blank');
        const shopAddr = shopSettings?.address || "Our Store Address";
        const shopPhone = shopSettings?.phone || "9876543210";
        const shopName = shopSettings?.name || "Print Express";

        const custAddr = order.deliveryDetails?.address || "No Address";
        const custName = order.userId?.name || "Customer";
        const custDist = order.deliveryDetails?.district || "";
        const custState = order.deliveryDetails?.state || "";
        const custPin = order.deliveryDetails?.pincode || "";
        const custPhone = order.deliveryDetails?.phone || order.userId?.phone || "No Phone";

        printWindow.document.write(`
            <html>
                <head>
                    <title>Label</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                        body { font-family: 'Inter', sans-serif; padding: 20px; color: #1e293b; background: white; }
                        .label-container { 
                            border: 3px solid #000; 
                            width: 100%;
                            max-width: 450px; 
                            margin: auto; 
                            padding: 30px;
                        }
                        .header { 
                            display: flex; 
                            justify-content: center; 
                            margin-bottom: 25px; 
                            border-bottom: 2px solid #e2e8f0; 
                            padding-bottom: 15px;
                        }
                        .logo-text { font-weight: 900; font-size: 24px; color: #0f172a; }
                        .logo-text-express { color: #ea580c; }
                        
                        .section-title { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
                        
                        .from-section { margin-bottom: 30px; border-left: 4px solid #e2e8f0; padding-left: 15px; }
                        .from-content { font-size: 14px; font-weight: 600; line-height: 1.5; }
                        
                        .to-section { 
                            background: #f8fafc; 
                            padding: 24px; 
                            border: 2px dashed #000; 
                            border-radius: 12px;
                        }
                        .to-content { font-size: 17px; font-weight: 700; line-height: 1.5; }
                        .to-name { font-size: 24px; font-weight: 900; margin-bottom: 8px; display: block; color: #000; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
                        
                        @media print {
                            body { padding: 0; }
                            .label-container { border: 2px solid #000; height: auto; page-break-inside: avoid; }
                            .to-section { background: transparent !important; }
                        }
                    </style>
                </head>
                <body>
                    <div class="label-container">
                        <div class="header" style="flex-direction: column; align-items: center; gap: 10px;">
                            <img src="${logo}" style="height: 60px; object-fit: contain;" />
                            <span class="logo-text">PRINT <span class="logo-text-express">EXPRESS</span></span>
                        </div>
                        
                        <div class="from-section">
                            <p class="section-title">Shipping From:</p>
                            <div class="from-content">
                                <strong>${shopName} Warehouse</strong><br/>
                                ${shopAddr}<br/>
                                <strong>Contact: ${shopPhone}</strong>
                            </div>
                        </div>
                        
                        <div class="to-section">
                            <p class="section-title">Deliver To:</p>
                            <div class="to-content">
                                <span class="to-name">${custName}</span>
                                ${custAddr}<br/>
                                ${custDist}, ${custState} - ${custPin}<br/>
                                <div style="margin-top: 10px; background: #000; color: #fff; padding: 4px 10px; display: inline-block; border-radius: 4px;">
                                    PH: ${custPhone}
                                </div>
                            </div>
                        </div>
                    </div>
                    <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDownloadFile = async (url, originalName) => {
        if (!url) {
            toast.error("File URL not found");
            return;
        }
        const targetUrl = getFullUrl(url);
        setDownloadingFile(prev => ({ ...prev, [url]: true }));
        try {
            let blob;
            try {
                // Try direct client-side fetch first (for CORS-enabled endpoints like standard Cloudinary)
                const res = await fetch(targetUrl);
                if (!res.ok) throw new Error("Direct fetch failed");
                blob = await res.blob();
            } catch (directErr) {
                console.warn("Direct download failed, falling back to proxy...", directErr);
                // Fallback to backend proxy
                const response = await axios.get(`/api/order/download-file`, {
                    params: { url: targetUrl, filename: originalName },
                    responseType: 'blob'
                });
                blob = response.data;
            }

            if (blob) {
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.setAttribute('download', originalName || 'download');
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(downloadUrl);
                toast.success(`Download started: ${originalName || 'file'}`);
            } else {
                throw new Error("Empty response data");
            }
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Failed to download file. Please try again.");
        } finally {
            setDownloadingFile(prev => ({ ...prev, [url]: false }));
        }
    };

    const handleDownloadAll = async (files) => {
        const loadingToast = toast.loading("Preparing files for download...");
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (!file.url) continue;
                const targetUrl = getFullUrl(file.url);
                let blob;
                try {
                    const res = await fetch(targetUrl);
                    if (!res.ok) throw new Error("Direct fetch failed");
                    blob = await res.blob();
                } catch (directErr) {
                    const response = await axios.get(`/api/order/download-file`, {
                        params: { url: targetUrl, filename: file.originalName },
                        responseType: 'blob'
                    });
                    blob = response.data;
                }
                
                if (blob) {
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.setAttribute('download', file.originalName || `file_${i + 1}`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(downloadUrl);
                }
            }
            toast.dismiss(loadingToast);
            toast.success("All downloads started successfully! 🎉");
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error("Download all error:", error);
            toast.error("Failed to download all files. Please try again.");
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [])

    return (
        <div className='space-y-8'>
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold font-outfit text-text-main">Manage Orders</h2>
                    <p className="text-xs text-text-muted">View and manage online print and POS sales records</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchOrders} className="px-4 py-2 bg-white border border-border rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">Refresh 🔄</button>
                    <button className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold">Export CSV</button>
                </div>
            </div>

            <div className="flex gap-4 border-b border-border pb-px">
                {['all', 'online'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={`pb-4 px-2 text-sm font-bold capitalize transition-all relative ${filter === type ? 'text-primary' : 'text-text-muted hover:text-text-main'}`}
                    >
                        {type} Orders
                        {filter === type && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(59,130,246,0.3)]"></div>}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {filteredOrders.map((order, index) => (
                    <div key={index} className="card-premium p-6 flex flex-col md:flex-row gap-8 justify-between hover:border-primary/50 transition-colors">
                        <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                                <span className="font-outfit font-bold text-lg">#{order._id?.toString().slice(-8).toUpperCase() || 'N/A'}</span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                                    {order.status}
                                </span>
                                {!order.payment.isPaid && (
                                    <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black animate-pulse">
                                        NOT PAID ⚠️
                                    </span>
                                )}
                            </div>
                            <div className="text-sm space-y-1">
                                {order.fulfillment?.method === 'pickup' ? (
                                    <p className="font-bold text-green-600">🏪 STORE PICKUP</p>
                                ) : (
                                    <>
                                        <p className="font-bold">{order.deliveryDetails?.address || 'No Address'}</p>
                                        <p className="text-text-muted">{order.deliveryDetails?.pincode}, {order.deliveryDetails?.district}</p>
                                    </>
                                )}
                                <p className="text-primary font-bold">📞 {order.deliveryDetails?.phone || order.userId?.phone || "No Phone"}</p>
                            </div>
                        </div>

                        <div className="space-y-3 flex-1 border-l border-border pl-8">
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">ORDER CONTENT</p>
                            <div className="space-y-4 text-sm">
                                {Array.isArray(order.printOptions) ? order.printOptions.map((opt, optIdx) => (
                                    <div key={optIdx} className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-xs truncate max-w-[200px] text-slate-800" title={order.files[optIdx]?.originalName}>
                                                    📄 {order.files[optIdx]?.originalName || `File ${optIdx + 1}`}
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                                                    Uploaded on {new Date(order.createdAt).toLocaleDateString()} by {order.userId?.name || 'Walk-in'}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                                    {order.fulfillment?.method || 'Standard'}
                                                </span>
                                                {order.deliveryDetails?.courierPartner && (
                                                    <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                                        🚚 {order.deliveryDetails.courierPartner}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black">
                                                    {opt.copies} COPIES
                                                </span>
                                                {opt.price > 0 && (
                                                    <span className="text-[10px] font-bold text-green-600">₹{opt.price.toFixed(2)}</span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-medium text-slate-600">
                                            {opt.mode} | {opt.paperSize || 'A4'} | {opt.side} Sided | {opt.binding} {opt.binding !== 'Loose Papers' ? `(x${opt.bindingQuantity || 1})` : ''}
                                        </p>
                                        <div className="flex gap-2">
                                            <p className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                {opt.pageRangeType === 'Custom' ? `Custom: ${opt.customPages}` : 'All Pages'}
                                            </p>
                                            {opt.pagesPerSheet === 2 && (
                                                <p className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">2 Pgs/Sheet</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2 pt-1.5">
                                            {order.files[optIdx]?.url && (
                                                <>
                                                    <a 
                                                        href={getFullUrl(order.files[optIdx].url)} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="px-2.5 py-1 bg-slate-950 text-white rounded text-[9px] font-bold hover:bg-black transition-colors whitespace-nowrap flex items-center gap-1 shadow-sm"
                                                    >
                                                        👁️ View
                                                    </a>
                                                    <button 
                                                        onClick={() => handleDownloadFile(order.files[optIdx].url, order.files[optIdx].originalName)}
                                                        disabled={downloadingFile[order.files[optIdx].url]}
                                                        className={`px-2.5 py-1 rounded text-[9px] font-bold transition-all flex items-center gap-1 border shadow-sm ${
                                                            downloadingFile[order.files[optIdx].url]
                                                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                                : 'bg-white text-primary border-primary/35 hover:bg-primary hover:text-white'
                                                        }`}
                                                    >
                                                        {downloadingFile[order.files[optIdx].url] ? (
                                                            <>
                                                                <span className="w-2 h-2 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                                                                Downloading...
                                                            </>
                                                        ) : (
                                                            <>
                                                                📥 Download
                                                            </>
                                                        )}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <p className="font-medium text-red-500 italic">Legacy Order Format - Options Missing</p>
                                )}

                                {order.files?.length > 1 && (
                                    <div className="pt-2">
                                        <button 
                                            onClick={() => handleDownloadAll(order.files)}
                                            className="w-full py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-all border border-blue-200 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm"
                                        >
                                            📦 Download All ({order.files.length} Files)
                                        </button>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 pt-2">
                                    <p className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">
                                        ⚖️ Total Weight: {order.pricing?.weight?.toFixed(2) || 0} kg
                                    </p>
                                    <button
                                        onClick={() => printFullLabel(order)}
                                        className="text-[10px] font-bold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center gap-1"
                                    >
                                        🚚 Shipping Label
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1 text-right border-l border-border pl-8 flex flex-col justify-between">
                            <div>
                                <p className="text-2xl font-bold font-outfit text-primary">₹{(order.pricing?.totalAmount || 0).toFixed(2)}</p>
                                <p className="text-[10px] text-text-muted font-bold uppercase">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <select
                                    value={order.status}
                                    onChange={(e) => updateStatus(order._id, e.target.value)}
                                    className="bg-slate-50 border border-border rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary"
                                >
                                    <option value="received">Mark Received</option>
                                    <option value="printing">Mark Printing</option>
                                    <option value="ready">Mark Ready</option>
                                    <option value="delivered">Mark Delivered</option>
                                    <option value="failed">Mark Failed</option>
                                    <option value="cancelled">Mark Cancelled</option>
                                </select>
                                <button onClick={() => sendWANotification(order)} className="text-primary font-bold text-[10px] hover:underline">SEND STATUS WA 🔗</button>
                                <button onClick={() => generateLinkAndWhatsApp(order)} className="text-green-600 font-bold text-[10px] hover:underline whitespace-nowrap">SEND BILL & PAY LINK 🏦</button>
                                <button onClick={() => downloadThermalBill(order._id)} className="text-slate-600 font-bold text-[10px] hover:underline">VIEW THERMAL BILL 📄</button>
                                <button onClick={() => handleEditOrder(order)} className="mt-2 px-3 py-1 text-[10px] font-bold bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors">Edit Options ⚙️</button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Edit Modal */}
                {editingOrder && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl animate-fade-in border border-border">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold font-outfit">Edit Order Options</h3>
                                <button onClick={() => setEditingOrder(null)} className="text-text-muted hover:text-text-main p-2">✕</button>
                            </div>

                            {/* Document Selector inside Modal */}
                            {editForm.length > 1 && (
                                <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
                                    {editForm.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setEditingFileIndex(i)}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border-2 transition-all whitespace-nowrap ${editingFileIndex === i ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-blue-300'}`}
                                        >
                                            {editingOrder.files[i]?.originalName || `File ${i + 1}`}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-5">
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100 inline-block">
                                    Editing: {editingOrder.files[editingFileIndex]?.originalName || `File ${editingFileIndex + 1}`}
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-text-muted uppercase mb-2">Printing Mode</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['B/W', 'Color'].map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => {
                                                        const newForm = [...editForm];
                                                        newForm[editingFileIndex].mode = m;
                                                        setEditForm(newForm);
                                                    }}
                                                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${editForm[editingFileIndex]?.mode === m ? 'bg-primary text-white border-primary' : 'bg-slate-50 border-border text-text-muted hover:border-text-main'}`}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-text-muted uppercase mb-2">Paper Size</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['A4', 'A3'].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => {
                                                        const newForm = [...editForm];
                                                        newForm[editingFileIndex].paperSize = s;
                                                        setEditForm(newForm);
                                                    }}
                                                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${editForm[editingFileIndex]?.paperSize === s ? 'bg-primary text-white border-primary' : 'bg-slate-50 border-border text-text-muted hover:border-text-main'}`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-text-muted uppercase mb-2">Sides</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['Single', 'Double'].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => {
                                                        const newForm = [...editForm];
                                                        newForm[editingFileIndex].side = s;
                                                        setEditForm(newForm);
                                                    }}
                                                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${editForm[editingFileIndex]?.side === s ? 'bg-primary text-white border-primary' : 'bg-slate-50 border-border text-text-muted hover:border-text-main'}`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-text-muted uppercase mb-2">Copies</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={editForm[editingFileIndex]?.copies || 1}
                                            onChange={(e) => {
                                                const newForm = [...editForm];
                                                newForm[editingFileIndex].copies = parseInt(e.target.value) || 1;
                                                setEditForm(newForm);
                                            }}
                                            className="w-full py-2 px-3 rounded-lg text-[11px] font-bold border border-border bg-slate-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-text-muted uppercase mb-2">Binding</label>
                                        <select
                                            value={editForm[editingFileIndex]?.binding}
                                            onChange={(e) => {
                                                const newForm = [...editForm];
                                                newForm[editingFileIndex].binding = e.target.value;
                                                setEditForm(newForm);
                                            }}
                                            className="w-full py-2 px-3 rounded-lg text-[11px] font-bold border border-border bg-slate-50"
                                        >
                                            <option value="Loose Papers">Loose Papers</option>
                                            <option value="Spiral">Spiral</option>
                                            <option value="Staple">Staple</option>
                                            <option value="Chart">Chart</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-text-muted uppercase mb-2">Binding Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={editForm[editingFileIndex]?.bindingQuantity || 1}
                                            onChange={(e) => {
                                                const newForm = [...editForm];
                                                newForm[editingFileIndex].bindingQuantity = parseInt(e.target.value) || 1;
                                                setEditForm(newForm);
                                            }}
                                            className="w-full py-2 px-3 rounded-lg text-[11px] font-bold border border-border bg-slate-50"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button onClick={() => setEditingOrder(null)} className="flex-1 py-3 bg-slate-100 text-text-main font-bold rounded-xl hover:bg-slate-200 transition-all text-sm">Cancel</button>
                                    <button onClick={saveEditOrder} className="flex-2 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm">Update Order & Recalculate 🔄</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {filteredOrders.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl">
                        <p className="text-4xl mb-4">📭</p>
                        <p className="text-text-muted font-bold text-sm">No {filter !== 'all' ? filter : ''} orders found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Orders
