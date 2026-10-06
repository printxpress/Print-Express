import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { splitPdfFile, isPdfFile, isOversized } from '../utils/pdfSplitter';
import { formatFileSize } from '../utils/documentDetection';

const FileSplitterModal = ({
    isOpen,
    onClose,
    file,
    onApplySplits
}) => {
    const [currentFile, setCurrentFile] = useState(file || null);
    const [isSplitting, setIsSplitting] = useState(false);
    const [progress, setProgress] = useState({ pct: 0, status: '' });
    const [splitResults, setSplitResults] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (file) {
            setCurrentFile(file);
            setSplitResults([]);
            setProgress({ pct: 0, status: '' });
            setError(null);
        }
    }, [file, isOpen]);

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const selected = e.target.files?.[0];
        if (selected) {
            if (!isPdfFile(selected)) {
                toast.error('Please select a PDF document to split.');
                return;
            }
            setCurrentFile(selected);
            setSplitResults([]);
            setProgress({ pct: 0, status: '' });
            setError(null);
        }
    };

    const handleStartSplit = async () => {
        if (!currentFile) {
            toast.error('No document selected to split.');
            return;
        }

        setIsSplitting(true);
        setError(null);
        setProgress({ pct: 0, status: 'Starting split process...' });

        try {
            const results = await splitPdfFile(currentFile, (prog) => {
                setProgress(prog);
            });
            setSplitResults(results);
            toast.success(`Successfully split into ${results.length} parts under 10 MB! 🎉`);
        } catch (err) {
            console.error('Split error:', err);
            setError(err.message || 'Failed to split PDF document.');
            toast.error(err.message || 'Failed to split document');
        } finally {
            setIsSplitting(false);
        }
    };

    const handlePreviewPart = (blobUrl) => {
        if (blobUrl) {
            window.open(blobUrl, '_blank');
        }
    };

    const handleDownloadPart = (part) => {
        try {
            const a = document.createElement('a');
            a.href = part.blobUrl;
            a.download = part.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success(`Downloaded ${part.name}`);
        } catch (e) {
            toast.error('Failed to download split part');
        }
    };

    const handleConfirm = () => {
        if (!splitResults || splitResults.length === 0) {
            toast.error('Please split the document first.');
            return;
        }
        onApplySplits(splitResults);
        onClose();
    };

    const fileSizeFormatted = currentFile ? (currentFile.size / (1024 * 1024)).toFixed(2) + ' MB' : '';

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300 flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-900 p-6 text-white relative flex-shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isSplitting}
                        className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center font-bold transition-all disabled:opacity-40"
                    >
                        ✕
                    </button>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl shadow-inner">
                            ✂️
                        </span>
                        <div>
                            <h3 className="text-xl font-bold font-outfit">Document Splitter</h3>
                            <p className="text-blue-100 text-xs">
                                Automatically splits files over 10 MB into ordered parts without quality loss
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1 no-scrollbar">
                    
                    {/* Selected File Card */}
                    {currentFile ? (
                        <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-4 rounded-2xl border border-blue-100 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-blue-100 flex items-center justify-center text-2xl flex-shrink-0">
                                        📕
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-text-muted font-bold uppercase tracking-wider">Source Document</p>
                                        <p className="text-sm font-bold text-slate-800 truncate" title={currentFile.name}>
                                            {currentFile.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs font-black text-red-600 bg-red-100/70 px-2 py-0.5 rounded-full">
                                                {fileSizeFormatted}
                                            </span>
                                            <span className="text-[11px] text-text-muted font-semibold">
                                                (Max limit is 10 MB)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {!isSplitting && (
                                    <label className="text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 cursor-pointer transition-all shadow-sm flex-shrink-0">
                                        Change
                                        <input type="file" accept="application/pdf" className="hidden" onChange={handleFileSelect} />
                                    </label>
                                )}
                            </div>

                            <p className="text-xs text-slate-600 bg-white/70 p-2.5 rounded-xl border border-blue-100/50 leading-relaxed">
                                💡 <strong>How it works:</strong> The file will be divided into balanced PDF parts (e.g., <code className="font-bold text-blue-800">split1</code>, <code className="font-bold text-blue-800">split2</code>), each kept strictly under 10 MB. Every page, font, and image remains completely intact!
                            </p>
                        </div>
                    ) : (
                        <div className="text-center p-8 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/30">
                            <span className="text-4xl block mb-2">📂</span>
                            <p className="text-sm font-bold text-slate-700">Choose a large PDF to split</p>
                            <p className="text-xs text-text-muted mt-1">Select any PDF file over 10 MB</p>
                            <label className="mt-4 inline-block btn-primary text-xs py-2 px-4 cursor-pointer">
                                Browse PDF File
                                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileSelect} />
                            </label>
                        </div>
                    )}

                    {/* Splitting Progress Bar */}
                    {isSplitting && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-blue-100 space-y-2 animate-in fade-in">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-blue-700 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin inline-block"></span>
                                    {progress.status || 'Splitting document...'}
                                </span>
                                <span className="text-blue-800 font-mono">{progress.pct}%</span>
                            </div>
                            <div className="h-3 bg-blue-100 rounded-full overflow-hidden p-0.5">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 rounded-full transition-all duration-300"
                                    style={{ width: `${progress.pct}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Split Results List */}
                    {splitResults.length > 0 && (
                        <div className="space-y-3 animate-in fade-in">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>✂️ Generated Split Parts ({splitResults.length})</span>
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-black">
                                        ✓ Ready to Order
                                    </span>
                                </p>
                                <span className="text-[11px] text-text-muted">
                                    Ordered Sequentially
                                </span>
                            </div>

                            <div className="space-y-2">
                                {splitResults.map((part, index) => (
                                    <div
                                        key={index}
                                        className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 hover:border-blue-300 transition-all"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <span className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-black shadow-sm flex-shrink-0">
                                                Part {part.partNumber}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate" title={part.name}>
                                                    {part.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted font-medium">
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                                                        {part.pageRange}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{part.pageCount} pages</span>
                                                    <span>•</span>
                                                    <span className="text-green-700 font-bold bg-green-50 px-1.5 py-0.5 rounded">
                                                        {(part.size / (1024 * 1024)).toFixed(2)} MB
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handlePreviewPart(part.blobUrl)}
                                                className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1"
                                                title="Preview this split in browser"
                                            >
                                                👁️ Preview
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadPart(part)}
                                                className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
                                                title="Save split file to your device"
                                            >
                                                📥 Save
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSplitting}
                        className="btn-outline text-xs py-2.5 px-4 font-bold"
                    >
                        Cancel
                    </button>

                    <div className="flex items-center gap-2">
                        {splitResults.length === 0 ? (
                            <button
                                type="button"
                                onClick={handleStartSplit}
                                disabled={isSplitting || !currentFile}
                                className="btn-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
                            >
                                {isSplitting ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        Splitting PDF...
                                    </>
                                ) : (
                                    <>
                                        ✂️ Split into &lt; 10 MB Parts
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="btn-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md shadow-green-500/20"
                            >
                                ✅ Use Split Files in Order ({splitResults.length} Files)
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FileSplitterModal;
