import React from 'react';

const BulkOrderAlert = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#e5ddd5] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border-none animate-in zoom-in-95 duration-300">
                {/* WhatsApp style header */}
                <div className="bg-[#075e54] p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">📦</div>
                    <div className="flex-1">
                        <h3 className="text-white font-bold">Print Express Bulk Order</h3>
                        <p className="text-white/70 text-[10px]">Guidelines for Bulk Ordering</p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white">✕</button>
                </div>
                
                {/* WhatsApp style chat bubble area */}
                <div className="p-4 space-y-4" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundSize: "contain" }}>
                    <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm relative max-w-[90%] float-left clear-both">
                        <p className="text-xs text-slate-800">Hello! Here is some important information about <strong>Bulk Orders</strong>:</p>
                        <span className="text-[9px] text-slate-400 float-right mt-1">20:00</span>
                    </div>
                    
                    <div className="bg-[#dcf8c6] p-4 rounded-lg rounded-tr-none shadow-sm relative max-w-[90%] float-right clear-both space-y-2">
                        <p className="text-xs font-bold text-slate-800">1. Bulk order should be above 2500 sheets</p>
                        <p className="text-xs font-bold text-slate-800">2. If you wish to proceed with Parcel service like (MSS and A1) then shipping is FREE</p>
                        <p className="text-xs font-bold text-slate-800">3. If you wish for that, click "Bulk Order" on the order summary and select "Parcel Service" in delivery during checkout.</p>
                        <div className="flex justify-end gap-1 mt-1">
                            <span className="text-[9px] text-[#555]">20:01</span>
                            <span className="text-[9px] text-blue-500">✓✓</span>
                        </div>
                    </div>

                    <div className="clear-both pt-2">
                        <button 
                            onClick={onClose}
                            className="w-full bg-[#25d366] text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-[#128c7e] transition-all transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            Continue to Order 🚀
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkOrderAlert;
