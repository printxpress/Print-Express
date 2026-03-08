import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import PrintExpressLogo from '../components/PrintExpressLogo';
import PrintingAnimation from '../components/PrintingAnimation';
import { detectDocument, formatFileSize, getDocumentIcon } from '../utils/documentDetection';
import { assets } from '../assets/assets';

const PrintPage = () => {
    const { axios, user, services, shopSettings } = useAppContext();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [files, setFiles] = useState([]);
    const [fileMetadata, setFileMetadata] = useState([]);

    const getDefaultOptions = () => ({
        mode: 'B/W',
        side: 'Double',
        paperSize: 'A4',
        copies: 1,
        binding: 'Loose Papers',
        orientation: 'Portrait',
        layout: 'Full',
        bindingQuantity: 1,
        pageRangeType: 'All',
        customPages: '',
        notes: '',
        pagesPerSheet: 1
    });

    const [documentsOptions, setDocumentsOptions] = useState([]);
    const [activeDocTab, setActiveDocTab] = useState(0);
    const [documentPrices, setDocumentPrices] = useState([]);

    // Convenience: current active document's options
    const options = documentsOptions[activeDocTab] || getDefaultOptions();
    const setOptions = (newOpts) => {
        setDocumentsOptions(prev => {
            const updated = [...prev];
            updated[activeDocTab] = typeof newOpts === 'function' ? newOpts(updated[activeDocTab]) : newOpts;
            return updated;
        });
    };
    const [step, setStep] = useState(1);

    // Smart Binding Sync — for active document
    useEffect(() => {
        if (options.binding !== 'Loose Papers') {
            setOptions(prev => ({ ...prev, bindingQuantity: prev?.copies || 1 }));
        }
    }, [options.copies, options.binding, activeDocTab]);

    // Auto-reset Staple if sheets exceed 50 — for active document
    useEffect(() => {
        const meta = fileMetadata[activeDocTab];
        if (!meta || !options) return;
        const docPgs = meta.pageCount || 0;
        const totPgs = options.pageRangeType === 'All' ? docPgs : calculateCustomPageCount(options.customPages);
        const effPgs = options.pagesPerSheet === 2 ? Math.ceil(totPgs / 2) : totPgs;
        const bSheets = options.side === 'Double' ? Math.ceil(effPgs / 2) : effPgs;
        const totalSheets = bSheets * (options.copies || 1);
        if (options.binding === 'Staple' && totalSheets > 50) {
            setOptions(prev => ({ ...prev, binding: 'Loose Papers' }));
            toast('📌 Staple binding is only available for ≤50 sheets. Switched to Loose Papers.', {
                icon: '⚠️',
                style: { borderRadius: '10px', background: '#333', color: '#fff' }
            });
        }
    }, [fileMetadata, activeDocTab, options.copies, options.side, options.pagesPerSheet, options.pageRangeType, options.customPages, options.binding]);

    // Apply same options as first document to all others
    const applySameAsFirst = () => {
        if (documentsOptions.length <= 1) return;
        const first = { ...documentsOptions[0] };
        setDocumentsOptions(prev => prev.map(() => ({ ...first })));
        toast.success('✅ Applied first document\'s settings to all documents');
    };

    const [stepLoading, setStepLoading] = useState(false);
    const [delivery, setDelivery] = useState({
        pincode: searchParams.get('pincode') || '',
        address: '',
        district: searchParams.get('district') || '',
        state: searchParams.get('state') || '',
        landmark: '',
        phone: '',
        weight: 1
    });
    const [pricing, setPricing] = useState({
        basePrint: 0,
        sideDiscount: 0,
        print: 0,
        binding: 0,
        delivery: 40,
        couponDiscount: 0,
        referralDiscount: 0,
        walletUsed: 0,
        total: 0
    });

    // New state for features
    const [fulfillment, setFulfillment] = useState('delivery');
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [useWallet, setUseWallet] = useState(false);

    const [loading, setLoading] = useState(false);
    const [processingFiles, setProcessingFiles] = useState(false);
    const [pincodeLoading, setPincodeLoading] = useState(false);
    const [pincodeError, setPincodeError] = useState('');
    const [isEditingAddress, setIsEditingAddress] = useState(false); // To toggle address edit mode

    const [rules, setRules] = useState({
        printing: {
            bw: { single: 0.75, double: 0.5, a3_single: 2, a3_double: 1.5 },
            color: { single: 8, double: 8, a3_single: 20, a3_double: 20 }
        },
        additional: { binding: 15, chart_binding: 10, hard_binding: 200, handling_fee: 10 },
        delivery_tiers: {
            tier_a: { maxWeight: 3, rate: 35, slip: 0 },
            tier_b: { maxWeight: 10, rate: 29, slip: 20 },
            tier_c: { maxWeight: 999, rate: 26, slip: 20 }
        }
    });

    // Fetch wallet balance and pricing rules on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [walletRes, pricingRes] = await Promise.all([
                    axios.get('/api/wallet/balance'),
                    axios.get('/api/pricing')
                ]);
                if (walletRes.data.success) setWalletBalance(walletRes.data.balance);
                if (pricingRes.data.success) {
                    const r = pricingRes.data.pricing.rules;
                    setRules({
                        printing: r.printing || rules.printing,
                        additional: r.additional || rules.additional,
                        delivery_tiers: r.delivery_tiers || rules.delivery_tiers
                    });
                }
            } catch (e) { }
        };
        fetchData();
    }, [user]);

    // Auto-fill address from user profile
    useEffect(() => {
        if (user && user.address && fulfillment === 'delivery') {
            setDelivery(prev => ({
                ...prev,
                pincode: user.address.pincode || prev.pincode,
                address: user.address.line1 || prev.address,
                district: user.address.city || prev.district,
                state: user.address.state || prev.state,
                landmark: user.address.landmark || prev.landmark,
                phone: user.phone || prev.phone
            }));
            // If address exists, default to 'view' mode (not editing)
            if (user.address.line1) setIsEditingAddress(false);
            else setIsEditingAddress(true);
        } else {
            setIsEditingAddress(true);
        }
    }, [user, fulfillment]);

    const calculateCustomPageCount = (range) => {
        if (!range) return 0;
        const parts = range.split(',').map(p => p.trim());
        let count = 0;
        parts.forEach(part => {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                if (!isNaN(start) && !isNaN(end) && end >= start) {
                    count += (end - start + 1);
                }
            } else {
                const num = Number(part);
                if (!isNaN(num) && num > 0) count += 1;
            }
        });
        return count;
    };

    useEffect(() => {
        if (documentsOptions.length === 0 || fileMetadata.length === 0) {
            setPricing({ basePrint: 0, sideDiscount: 0, print: 0, binding: 0, delivery: 0, couponDiscount: 0, walletUsed: 0, total: 0, weight: 0 });
            setDocumentPrices([]);
            return;
        }

        let totalPrintCharge = 0;
        let totalBindCharge = 0;
        let totalSheets = 0;
        const prices = [];

        documentsOptions.forEach((opts, idx) => {
            const meta = fileMetadata[idx];
            if (!meta || !opts) { prices.push(0); return; }

            const docPgs = meta.pageCount || 0;
            const totalPages = opts.pageRangeType === 'All' ? docPgs : calculateCustomPageCount(opts.customPages);
            const effectivePages = opts.pagesPerSheet === 2 ? Math.ceil(totalPages / 2) : totalPages;

            const isColor = opts.mode === 'Color';
            const isDouble = opts.side === 'Double';
            const isA3 = opts.paperSize === 'A3';
            const colorKey = isColor ? 'color' : 'bw';
            const singleKey = isA3 ? 'a3_single' : 'single';
            const doubleKey = isA3 ? 'a3_double' : 'double';
            const singleRate = rules.printing[colorKey][singleKey] || (isColor ? 8 : 0.75);
            const doubleRate = rules.printing[colorKey][doubleKey] || singleRate;

            let docPrintCharge = 0;
            if (isDouble) {
                if (effectivePages <= 1) {
                    // Single page marked double: charge single rate
                    docPrintCharge = singleRate;
                } else if (effectivePages % 2 !== 0) {
                    // Odd pages: pairs at doubleRate + 1 at singleRate
                    docPrintCharge = ((effectivePages - 1) * doubleRate) + (1 * singleRate);
                } else {
                    docPrintCharge = effectivePages * doubleRate;
                }
            } else {
                docPrintCharge = effectivePages * singleRate;
            }
            docPrintCharge *= (opts.copies || 1);

            const billingSheets = isDouble ? Math.ceil(effectivePages / 2) : effectivePages;
            const docSheets = billingSheets * (opts.copies || 1);

            let docBindCharge = 0;
            if (opts.binding === 'Spiral') {
                docBindCharge = (isA3 ? 40 : 15) * (opts.bindingQuantity || 1);
            } else if (opts.binding === 'Chart') {
                docBindCharge = (isA3 ? 20 : 10) * (opts.bindingQuantity || 1);
            } else if (opts.binding === 'Staple') {
                docBindCharge = (rules.additional?.staple_binding || 0.30) * docSheets;
            }

            totalPrintCharge += docPrintCharge;
            totalBindCharge += docBindCharge;
            totalSheets += docSheets;
            prices.push(docPrintCharge + docBindCharge);
        });

        const calcWeight = Math.ceil(totalSheets / 200) || 0;
        const hasValidPincode = delivery.pincode && delivery.pincode.length === 6;
        let deliveryCharge = 0;
        if (fulfillment === 'delivery' && hasValidPincode) {
            if (calcWeight <= 3) deliveryCharge = 35 * calcWeight;
            else if (calcWeight <= 10) deliveryCharge = (29 * calcWeight) + 20;
            else deliveryCharge = (26 * calcWeight) + 20;
        }

        const subtotal = totalPrintCharge + totalBindCharge + deliveryCharge;
        const couponDiscount = couponApplied?.discount || 0;

        // Referral Discount Calculation (10% max)
        let referralDiscount = 0;
        if (user && user.referralBalance > 0) {
            referralDiscount = Math.min(user.referralBalance, subtotal * 0.1);
        }

        const afterDiscounts = Math.max(0, subtotal - couponDiscount - referralDiscount);
        const walletUsed = useWallet ? Math.min(walletBalance, afterDiscounts) : 0;
        const total = afterDiscounts - walletUsed;

        setDocumentPrices(prices);
        setPricing({
            basePrint: totalPrintCharge,
            sideDiscount: 0,
            print: totalPrintCharge,
            binding: totalBindCharge,
            delivery: deliveryCharge,
            couponDiscount,
            referralDiscount,
            walletUsed,
            total,
            weight: calcWeight
        });
    }, [fileMetadata, documentsOptions, fulfillment, couponApplied, useWallet, walletBalance, rules, step, delivery.pincode]);

    const handlePincodeChange = async (pincode) => {
        setDelivery(prev => ({ ...prev, pincode }));
        setPincodeError('');
        if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
            setPincodeLoading(true);
            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
                const data = await response.json();
                if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
                    const postOffice = data[0].PostOffice[0];
                    if (!postOffice.Pincode.startsWith('6')) {
                        setPincodeError('Service only available in Tamil Nadu (Pincodes starting with 6)');
                        setDelivery(prev => ({ ...prev, district: '', state: '' }));
                        return;
                    }
                    setDelivery(prev => ({
                        ...prev,
                        district: postOffice.District || '',
                        state: postOffice.State || '',
                    }));
                    toast.success(`📍 Detected: ${postOffice.District}, ${postOffice.State}`);
                } else {
                    setPincodeError('Invalid pincode - please check');
                    setDelivery(prev => ({ ...prev, district: '', state: '' }));
                }
            } catch (error) {
                setPincodeError('Could not verify pincode');
            } finally {
                setPincodeLoading(false);
            }
        } else if (pincode.length > 0 && pincode.length < 6) {
            setDelivery(prev => ({ ...prev, district: '', state: '' }));
        }
    };

    const handleFileChange = async (e) => {
        const uploaded = Array.from(e.target.files);
        setProcessingFiles(true);
        const validFiles = [];
        const metadata = [];
        const newOptions = [];
        for (const file of uploaded) {
            const meta = await detectDocument(file);
            if (meta.isValid) {
                validFiles.push(file);
                metadata.push(meta);
                newOptions.push(getDefaultOptions());
                toast.success(`✅ ${meta.name}: ${meta.type} (${meta.pageCount} page${meta.pageCount > 1 ? 's' : ''})`);
            } else {
                toast.error(`❌ ${file.name}: ${meta.error}`);
            }
        }
        setFiles(prev => [...prev, ...validFiles]);
        setFileMetadata(prev => [...prev, ...metadata]);
        setDocumentsOptions(prev => [...prev, ...newOptions]);
        setProcessingFiles(false);
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, idx) => idx !== index));
        setFileMetadata(fileMetadata.filter((_, idx) => idx !== index));
        setDocumentsOptions(prev => prev.filter((_, idx) => idx !== index));
        if (activeDocTab >= files.length - 1 && activeDocTab > 0) {
            setActiveDocTab(activeDocTab - 1);
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return toast.error('Enter a coupon code');
        setCouponLoading(true);
        try {
            const subtotal = pricing.print + pricing.binding + pricing.delivery;
            const { data } = await axios.post('/api/coupon/validate', {
                code: couponCode,
                orderAmount: subtotal
            });
            if (data.success) {
                setCouponApplied({ code: data.coupon.code, discount: data.discount });
                toast.success(`🎉 Coupon applied! ₹${data.discount} off`);
            } else {
                toast.error(data.message);
                setCouponApplied(null);
            }
        } catch (e) { toast.error('Failed to validate coupon'); }
        finally { setCouponLoading(false); }
    };

    const removeCoupon = () => {
        setCouponApplied(null);
        setCouponCode('');
    };

    const handlePlaceOrder = async () => {
        if (!user) return toast.error("Please login to place order");
        if (files.length === 0) return toast.error("Please upload at least one document");
        if (fulfillment === 'delivery' && !delivery.address) return toast.error("Please enter delivery address");
        if (fulfillment === 'delivery' && !delivery.pincode) return toast.error("Please enter pincode");

        setLoading(true);
        try {
            const formData = new FormData();
            files.forEach(file => formData.append('files', file));
            formData.append('data', JSON.stringify({
                userId: user._id || user.id,
                printOptions: documentsOptions,
                fulfillment: {
                    method: fulfillment,
                    pickupLocation: fulfillment === 'pickup' ? 'Print Express Store, Coimbatore' : undefined
                },
                deliveryDetails: fulfillment === 'delivery' ? delivery : undefined,
                paymentMethod: paymentMethod === 'UPI' ? 'RAZORPAY' : paymentMethod,
                isPaid: false,
                couponCode: couponApplied?.code || '',
                couponDiscount: pricing.couponDiscount,
                walletUsed: pricing.walletUsed,
                fileMetadata
            }));

            const { data } = await axios.post('/api/order/print', formData);
            if (data.success) {
                const orderId = data.orderId;

                // If payment method is UPI (now Razorpay) and amount > 0, initiate Razorpay
                if (paymentMethod === 'UPI' && pricing.total > 0) {
                    const { data: razorpayData } = await axios.post('/api/order/razorpay-order', {
                        amount: pricing.total
                    });

                    if (razorpayData.success) {
                        if (!window.Razorpay) {
                            console.error("Razorpay script (window.Razorpay) is missing!");
                            setLoading(false);
                            return toast.error("Razorpay script not loaded. Please refresh.");
                        }
                        console.log("Initializing Razorpay with Key:", import.meta.env.VITE_RAZORPAY_KEY_ID);
                        const rzpOptions = {
                            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                            amount: razorpayData.razorpayOrder.amount,
                            currency: razorpayData.razorpayOrder.currency,
                            name: "Print Express",
                            description: "Printing Service",
                            order_id: razorpayData.razorpayOrder.id,
                            handler: async (response) => {
                                try {
                                    const { data: verifyData } = await axios.post('/api/order/razorpay-verify', {
                                        ...response,
                                        orderId
                                    });

                                    if (verifyData.success) {
                                        toast.success("Payment successful! Order placed. 🎉");
                                        setFiles([]);
                                        setFileMetadata([]);
                                        setDocumentsOptions([]);
                                        setCouponApplied(null);
                                        setCouponCode('');
                                        setUseWallet(false);
                                        setStep(1);
                                        navigate('/order-success?orderId=' + orderId);
                                    } else {
                                        toast.error(verifyData.message || "Payment verification failed");
                                    }
                                } catch (error) {
                                    toast.error("Payment verification error");
                                }
                            },
                            prefill: {
                                name: user.name,
                                email: user.email,
                                contact: user.phone || delivery.phone
                            },
                            theme: {
                                color: "#2563eb"
                            },
                            modal: {
                                ondismiss: function () {
                                    setLoading(false);
                                }
                            }
                        };
                        const rzp = new window.Razorpay(rzpOptions);
                        rzp.open();
                    } else {
                        toast.error("Could not initiate payment");
                        setLoading(false);
                    }
                } else {
                    // Wallet only or free order
                    toast.success("Order Placed Successfully! 🎉");
                    setFiles([]);
                    setFileMetadata([]);
                    setDocumentsOptions([]);
                    setCouponApplied(null);
                    setCouponCode('');
                    setUseWallet(false);
                    setStep(1);
                    navigate('/order-success?orderId=' + orderId);
                }
            } else {
                toast.error(data.message);
                setLoading(false);
            }
        } catch (error) {
            console.error("Order Placement Error:", error);
            const errorMsg = error.response?.data?.message || error.message || "Error placing order";
            toast.error(errorMsg);
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (step === 1 && files.length === 0) return toast.error("Please upload at least one document");
        if (step === 3 && fulfillment === 'delivery' && !delivery.address) return toast.error("Please enter delivery address");

        setStepLoading(true);
        setTimeout(() => {
            setStep(prev => prev + 1);
            setStepLoading(false);
            window.scrollTo(0, 0);
        }, 1000);
    };

    const prevStep = () => {
        setStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    if (loading || stepLoading) {
        return <PrintingAnimation message={stepLoading ? "Moving to next step..." : "Processing your order..."} />;
    }

    const activeDocMeta = fileMetadata[activeDocTab];
    const docPages = activeDocMeta ? activeDocMeta.pageCount || 0 : fileMetadata.reduce((sum, meta) => sum + (meta.pageCount || 0), 0);
    const totalPages = options.pageRangeType === 'All' ? docPages : calculateCustomPageCount(options.customPages);
    const effectivePages = options.pagesPerSheet === 2 ? Math.ceil(totalPages / 2) : totalPages;
    const billingSheets = options.side === 'Double' ? Math.ceil(effectivePages / 2) : effectivePages;
    const totalBillingSheets = billingSheets * (options.copies || 1);
    const canStaple = totalBillingSheets <= 50;

    const allDocTotalpgs = fileMetadata.reduce((sum, meta, i) => {
        const opts = documentsOptions[i] || getDefaultOptions();
        const tPgs = opts.pageRangeType === 'All' ? (meta.pageCount || 0) : calculateCustomPageCount(opts.customPages);
        const copies = opts.copies || 1;
        return sum + (tPgs * copies);
    }, 0);

    const allDocTotalSheets = fileMetadata.reduce((sum, meta, i) => {
        const opts = documentsOptions[i] || getDefaultOptions();
        const tPgs = opts.pageRangeType === 'All' ? (meta.pageCount || 0) : calculateCustomPageCount(opts.customPages);
        const ePgs = opts.pagesPerSheet === 2 ? Math.ceil(tPgs / 2) : tPgs;
        const totalPagesToPrint = ePgs * (opts.copies || 1);
        const bSheets = opts.side === 'Double' ? Math.ceil(totalPagesToPrint / 2) : totalPagesToPrint;
        return sum + bSheets;
    }, 0);

    return (
        <div className="py-12 max-w-6xl mx-auto space-y-12">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold font-outfit bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
                    {step === 1 && "Upload Documents"}
                    {step === 2 && "Print Options"}
                    {step === 3 && "Delivery Details"}
                    {step === 4 && "Order Summary"}
                </h1>
                <p className="text-text-muted text-lg">
                    {step === 1 && "Upload your documents and choose your preferences"}
                    {step === 2 && "Tailor your printing exactly how you need it"}
                    {step === 3 && "Tell us where to send your prints"}
                    {step === 4 && "Review and finalize your order"}
                </p>

                {/* Step Indicator */}
                <div className="flex justify-center items-center gap-4 mt-8">
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= s ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-100 text-blue-400'}`}>
                                {s}
                            </div>
                            {s < 4 && <div className={`w-12 h-1 ${step > s ? 'bg-blue-600' : 'bg-blue-100'}`}></div>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8">
                {/* 1. Sidebar/Top Order Summary */}
                <div className="order-last lg:order-last lg:col-span-1 space-y-6">
                    <div className="card-premium p-6 lg:sticky lg:top-24 sticky top-0 z-10 space-y-6 border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl">
                        <h4 className="text-xl font-bold font-outfit text-center bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">Order Summary</h4>

                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between items-center pb-2 border-b border-blue-100/50">
                                <span className="text-text-muted">Documents</span>
                                <span className="font-bold text-blue-800">{files.length} files</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-blue-100/50">
                                <span className="text-text-muted">Total Pages </span>
                                <span className="font-bold text-blue-800">{allDocTotalpgs} pg</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-blue-100/50">
                                <span className="text-text-muted">Billable Sheets</span>
                                <div className="text-right">
                                    <span className="font-bold text-blue-800">{allDocTotalSheets} sheets</span>
                                </div>
                            </div>


                            {/* Detailed Breakdown in Step 4 */}
                            {step === 4 && (
                                <div className="space-y-3 py-2">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Document Breakdown</p>
                                    {fileMetadata.map((meta, i) => {
                                        const opts = documentsOptions[i] || getDefaultOptions();
                                        return (
                                            <div key={i} className="bg-white rounded-lg p-3 border border-blue-100 space-y-2 shadow-sm">
                                                <div className="flex justify-between items-start gap-2">
                                                    <span className="text-[11px] font-bold truncate flex-1">{meta.name}</span>
                                                    <span className="text-[11px] font-bold text-blue-700 whitespace-nowrap">₹{(documentPrices[i] || 0).toFixed(2)}</span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-1 text-[10px] text-text-muted">
                                                    <div>{opts.mode} • {opts.side} Sided • {opts.paperSize}</div>
                                                    <div>{opts.pageRangeType === 'All' ? meta.pageCount : calculateCustomPageCount(opts.customPages)} pgs x {opts.copies} copies</div>
                                                    {opts.binding !== 'Loose Papers' && (
                                                        <div className="text-blue-600 font-medium">Binding: {opts.binding} (x{opts.bindingQuantity})</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between text-text-muted">
                                    <span>Printing Charge</span>
                                    <span>₹{pricing.basePrint.toFixed(2)}</span>
                                </div>
                                {(options.binding !== 'Loose Papers') && (
                                    <div className="flex justify-between text-text-muted">
                                        <span>Binding {options.binding === 'Staple' ? `(${billingSheets * options.copies} sheets)` : `(${options.bindingQuantity}x)`}</span>
                                        <span>₹{pricing.binding.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-text-muted animate-in fade-in slide-in-from-top-1 duration-300">
                                    <span>Delivery ({fulfillment})</span>
                                    <span>₹{pricing.delivery.toFixed(2)}</span>
                                </div>
                                {pricing.couponDiscount > 0 && (
                                    <div className="flex justify-between text-green-600 font-semibold">
                                        <span>Coupon Discount</span>
                                        <span>-₹{pricing.couponDiscount.toFixed(2)}</span>
                                    </div>
                                )}
                                {pricing.referralDiscount > 0 && (
                                    <div className="flex justify-between text-indigo-600 font-semibold">
                                        <span>Referral Discount (10%)</span>
                                        <span>-₹{pricing.referralDiscount.toFixed(2)}</span>
                                    </div>
                                )}
                                {pricing.walletUsed > 0 && (
                                    <div className="flex justify-between text-amber-600 font-semibold">
                                        <span>Wallet Used</span>
                                        <span>-₹{pricing.walletUsed.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t-2 border-blue-200">
                                <div className="flex justify-between items-end">
                                    <span className="text-lg font-bold text-gray-800">Grand Total</span>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-blue-700">₹{pricing.total.toFixed(2)}</span>
                                        <p className="text-[10px] text-text-muted">Incl. all taxes</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Place Order ONLY if step 4 */}
                        {step === 4 ? (
                            <button
                                onClick={handlePlaceOrder}
                                disabled={loading}
                                className="w-full py-4 text-lg font-bold rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white shadow-lg shadow-blue-200 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? "Placing Order..." : "Proceed to Payment 🚀"}
                            </button>
                        ) : (
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                                <p className="text-xs text-text-muted italic">Complete Step {step} to proceed</p>
                            </div>
                        )}

                        <div className="flex justify-center gap-4 text-[10px] text-text-muted font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1">🛡️ SECURE</span>
                            <span className="flex items-center gap-1">⚡ FAST</span>
                            <span className="flex items-center gap-1">✨ PREMIUM</span>
                        </div>
                    </div>

                    <div className="card-premium p-6 flex flex-col items-center text-center space-y-2 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                        <p className="text-sm font-bold text-orange-800">💡 Need Support?</p>
                        <p className="text-xs text-text-muted">Confused about sides or binding? Chat with us on WhatsApp for instant assistance.</p>
                        <button type="button" className="text-orange-600 font-bold text-sm mt-2 flex items-center gap-2 hover:text-orange-700">WhatsApp Support 🔗</button>
                    </div>
                </div>

                {/* 2. Wizard Steps */}
                <div className="lg:col-span-2 space-y-8">
                    {/* 1. Upload Files */}
                    {step === 1 && (
                        <div className="card-premium space-y-6 border-2 border-blue-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold font-outfit flex items-center gap-2">
                                    <span className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-full flex items-center justify-center text-sm">1</span>
                                    Upload Documents
                                </h3>
                                {processingFiles && <span className="text-sm text-blue-600 animate-pulse">Processing...</span>}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <label className="border-2 border-dashed border-blue-300 rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all group">
                                    <div className="w-16 h-16 md:w-12 md:h-12 flex items-center justify-center">
                                        <img src={assets.pdf_icon} alt="PDF" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                                    </div>
                                    <span className="text-[10px] md:text-[9px] font-bold text-center uppercase">PDF</span>
                                    <input type="file" className="hidden" multiple accept=".pdf,application/pdf" onChange={handleFileChange} />
                                </label>
                                <label className="border-2 border-dashed border-orange-300 rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-orange-50 hover:border-orange-500 transition-all group">
                                    <span className="text-3xl md:text-2xl group-hover:scale-110 transition-transform">🖼️</span>
                                    <span className="text-[10px] md:text-[9px] font-bold text-center uppercase">Images</span>
                                    <input type="file" className="hidden" multiple accept="image/*" onChange={handleFileChange} />
                                </label>
                                <label className="border-2 border-dashed border-purple-300 rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-purple-50 hover:border-purple-500 transition-all group">
                                    <span className="text-3xl md:text-2xl group-hover:scale-110 transition-transform">📁</span>
                                    <span className="text-[10px] md:text-[9px] font-bold text-center uppercase">All</span>
                                    <input type="file" className="hidden" multiple onChange={handleFileChange} />
                                </label>
                            </div>

                            {fileMetadata.length > 0 && (
                                <div className="p-4 bg-gradient-to-br from-blue-50 to-orange-50 rounded-xl space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-bold text-blue-800">Uploaded Documents</span>
                                        <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full">
                                            {totalPages} page{totalPages !== 1 ? 's' : ''} total
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {fileMetadata.map((meta, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-blue-100">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 flex-shrink-0">
                                                        {meta.previewURL ? (
                                                            <img src={meta.previewURL} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-2xl">{getDocumentIcon(meta.type, meta.subType)}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold truncate">{meta.name}</p>
                                                        <div className="flex flex-wrap gap-2 text-[10px] text-text-muted mt-0.5">
                                                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{meta.type}</span>
                                                            {meta.subType && (
                                                                <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">{meta.subType}</span>
                                                            )}
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded">{meta.pageCount} pg</span>
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded">{formatFileSize(meta.size)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFile(i)}
                                                    className="ml-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4">
                                <button type="button" onClick={nextStep} disabled={files.length === 0} className="w-full btn-primary py-4 flex items-center justify-center gap-2">
                                    Next <span className="text-xl">→</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 2. Print Options */}
                    {step === 2 && (
                        <div className="card-premium space-y-6 border-2 border-blue-100">
                            <h3 className="text-xl font-bold font-outfit flex items-center gap-2">
                                <span className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-full flex items-center justify-center text-sm">2</span>
                                Print Options
                            </h3>

                            {/* Documents Tabs */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-gray-700">Select Document to Configure:</p>
                                    {fileMetadata.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={applySameAsFirst}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                                        >
                                            📋 Same as First Print
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto no-scrollbar">
                                    {fileMetadata.map((meta, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setActiveDocTab(i)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all whitespace-nowrap ${activeDocTab === i
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100 scale-105 font-bold'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span className="text-lg">{getDocumentIcon(meta.type, meta.subType)}</span>
                                            <div className="flex flex-col items-start leading-tight">
                                                <span className="text-xs font-bold">{meta.name.length > 20 ? meta.name.slice(0, 17) + '...' : meta.name}</span>
                                                <span className={`${activeDocTab === i ? 'text-blue-100' : 'text-slate-400'} text-[9px]`}>{meta.pageCount} pages</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-text-muted">Printing Mode</label>
                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setOptions({ ...options, mode: 'B/W' })}
                                            className={`flex-1 p-3 rounded-2xl border-2 transition-all font-bold flex flex-col items-center gap-3 group ${options.mode === 'B/W'
                                                ? 'bg-blue-50 border-blue-600 shadow-lg ring-2 ring-blue-600/20 scale-[1.02]'
                                                : 'bg-white border-slate-100 hover:border-blue-300 hover:shadow-md'
                                                }`}
                                        >
                                            <div className="w-full aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center p-2">
                                                <img src={assets.bw_print_icon} alt="B/W" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            <div className="text-center">
                                                <span className={`text-[11px] font-black uppercase tracking-widest ${options.mode === 'B/W' ? 'text-blue-800' : 'text-slate-500'}`}>B/W Print</span>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setOptions({ ...options, mode: 'Color' })}
                                            className={`flex-1 p-3 rounded-2xl border-2 transition-all font-bold flex flex-col items-center gap-3 group ${options.mode === 'Color'
                                                ? 'bg-orange-50 border-orange-600 shadow-lg ring-2 ring-orange-600/20 scale-[1.02]'
                                                : 'bg-white border-slate-100 hover:border-orange-300 hover:shadow-md'
                                                }`}
                                        >
                                            <div className="w-full aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center p-2">
                                                <img src={assets.color_print_icon} alt="Color" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            <div className="text-center">
                                                <span className={`text-[11px] font-black uppercase tracking-widest ${options.mode === 'Color' ? 'text-orange-800' : 'text-slate-500'}`}>Color Print</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-text-muted">Print Side</label>
                                    <select value={options.side} onChange={(e) => setOptions({ ...options, side: e.target.value })} className="input-field">
                                        <option value="Single">Single Sided</option>
                                        <option value="Double">Double Sided (Duplex)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-text-muted">Pages to Print</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setOptions({ ...options, pageRangeType: 'All', customPages: '' })}
                                            className={`flex-1 py-3 rounded-xl border-2 transition-all font-semibold text-xs ${options.pageRangeType === 'All'
                                                ? 'bg-blue-600 text-white border-blue-800'
                                                : 'bg-white border-border'
                                                }`}
                                        >
                                            All Pages ({docPages})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setOptions({ ...options, pageRangeType: 'Custom' })}
                                            className={`flex-1 py-3 rounded-xl border-2 transition-all font-semibold text-xs ${options.pageRangeType === 'Custom'
                                                ? 'bg-blue-600 text-white border-blue-800'
                                                : 'bg-white border-border'
                                                }`}
                                        >
                                            Custom Selection
                                        </button>
                                    </div>
                                    {options.pageRangeType === 'Custom' && (
                                        <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <input
                                                type="text"
                                                value={options.customPages}
                                                onChange={(e) => setOptions({ ...options, customPages: e.target.value })}
                                                placeholder="e.g. 1-5, 8, 11-13"
                                                className="input-field text-sm font-mono"
                                            />
                                            <p className="text-[10px] text-text-muted mt-1 px-1 italic">Calculated: {calculateCustomPageCount(options.customPages)} pages to print</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-text-muted">Orientation</label>
                                    <select value={options.orientation} onChange={(e) => setOptions({ ...options, orientation: e.target.value })} className="input-field">
                                        <option value="Portrait">Portrait</option>
                                        <option value="Landscape">Landscape</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-text-muted">Pages per Sheet</label>
                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setOptions({ ...options, pagesPerSheet: 1, orientation: 'Portrait' })}
                                            className={`flex-1 p-2 rounded-2xl border-2 transition-all font-bold flex flex-col items-center gap-2 group ${options.pagesPerSheet === 1
                                                ? 'bg-blue-50 border-blue-600 shadow-md'
                                                : 'bg-white border-slate-100 hover:border-blue-300'
                                                }`}
                                        >
                                            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-100 relative">
                                                <img src={assets.standard_print_icon} alt="Standard" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                {options.pagesPerSheet === 1 && <div className="absolute top-2 right-2 bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">✓</div>}
                                            </div>
                                            <div className="text-center">
                                                <span className={`text-[11px] block ${options.pagesPerSheet === 1 ? 'text-blue-800' : 'text-slate-600'}`}>Standard</span>
                                                <span className="text-[9px] text-slate-400 font-normal">1 Page / Side</span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setOptions({ ...options, pagesPerSheet: 2, orientation: 'Landscape' })}
                                            className={`flex-1 p-2 rounded-2xl border-2 transition-all font-bold flex flex-col items-center gap-2 group relative overflow-hidden ${options.pagesPerSheet === 2
                                                ? 'bg-green-50 border-green-600 shadow-md'
                                                : 'bg-white border-slate-100 hover:border-green-300'
                                                }`}
                                        >
                                            <div className="absolute top-0 right-0 bg-green-600 text-white text-[8px] px-2 py-0.5 rounded-bl-lg z-10">SAVE 50%</div>
                                            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-100 relative">
                                                <img src={assets.money_saver_icon} alt="Money Saver" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                {options.pagesPerSheet === 2 && <div className="absolute top-2 right-2 bg-green-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">✓</div>}
                                            </div>
                                            <div className="text-center">
                                                <span className={`text-[11px] block ${options.pagesPerSheet === 2 ? 'text-green-800' : 'text-slate-600'}`}>Money Saver</span>
                                                <span className="text-[9px] text-slate-400 font-normal">2 Pages / Side · Auto Landscape</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-text-muted">Copies</label>
                                    <div className="flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setOptions({ ...options, copies: Math.max(1, (options.copies || 1) - 1) })}
                                            className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 flex items-center justify-center font-bold text-blue-800 transition-all"
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            value={options.copies}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setOptions({ ...options, copies: val === '' ? '' : parseInt(val) || '' });
                                            }}
                                            onBlur={() => {
                                                if (options.copies === '' || options.copies < 1 || isNaN(options.copies)) {
                                                    setOptions({ ...options, copies: 1 });
                                                }
                                            }}
                                            className="text-2xl font-bold w-20 text-center bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none py-1 shadow-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setOptions({ ...options, copies: (options.copies || 1) + 1 })}
                                            className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 flex items-center justify-center font-bold text-blue-800 transition-all"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-text-muted">Paper Size</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setOptions({ ...options, paperSize: 'A4' })}
                                            className={`flex-1 py-3 rounded-xl border-2 transition-all font-semibold ${options.paperSize === 'A4'
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                                : 'bg-white border-border hover:border-slate-500'
                                                }`}
                                        >
                                            A4 (Standard)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setOptions({ ...options, paperSize: 'A3' })}
                                            className={`flex-1 py-3 rounded-xl border-2 transition-all font-semibold ${options.paperSize === 'A3'
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                                : 'bg-white border-border hover:border-slate-500'
                                                }`}
                                        >
                                            A3 (Large)
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-text-muted">Binding Style</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setOptions({ ...options, binding: 'Loose Papers' })}
                                            className={`p-3 md:p-2 rounded-xl border-2 transition-all font-bold flex flex-col items-center gap-2 md:gap-1 ${options.binding === 'Loose Papers'
                                                ? 'bg-slate-50 border-slate-600'
                                                : 'bg-white border-slate-100 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center text-2xl md:text-xl">📄</div>
                                            <span className="text-[11px] md:text-[10px] text-center">Loose Papers</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => canStaple && setOptions({ ...options, binding: 'Staple' })}
                                            disabled={!canStaple}
                                            title={!canStaple ? `Staple only available for ≤50 sheets (current: ${totalBillingSheets})` : 'Staple Binding'}
                                            className={`p-3 md:p-2 rounded-xl border-2 transition-all font-bold flex flex-col items-center gap-2 md:gap-1 group relative ${!canStaple
                                                ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200'
                                                : options.binding === 'Staple'
                                                    ? 'bg-purple-50 border-purple-600'
                                                    : 'bg-white border-slate-100 hover:border-purple-300'
                                                }`}
                                        >
                                            <div className="absolute top-0 right-0 bg-purple-600 text-white text-[8px] px-1.5 py-0.5 rounded-bl-lg z-10">₹{rules?.additional?.staple_binding || '0.30'}</div>
                                            <div className="w-10 h-10 md:w-8 md:h-8 rounded overflow-hidden">
                                                <img src={assets.staple_icon} alt="Staple" className="w-full h-full object-contain" />
                                            </div>
                                            <span className="text-[11px] md:text-[10px] text-center">Staple</span>
                                            {!canStaple && <span className="text-[8px] text-red-400">&gt;50 sheets</span>}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setOptions({ ...options, binding: 'Spiral' })}
                                            className={`p-3 md:p-2 rounded-xl border-2 transition-all font-bold flex flex-col items-center gap-2 md:gap-1 group relative ${options.binding === 'Spiral'
                                                ? 'bg-blue-50 border-blue-600'
                                                : 'bg-white border-slate-100 hover:border-blue-300'
                                                }`}
                                        >
                                            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded-bl-lg z-10">₹{options.paperSize === 'A3' ? (rules?.additional?.a3_binding || 40) : (rules?.additional?.binding || 15)}</div>
                                            <div className="w-10 h-10 md:w-8 md:h-8 rounded overflow-hidden">
                                                <img src={assets.spiral_binding_icon} alt="Spiral" className="w-full h-full object-cover" />
                                            </div>
                                            <span className="text-[11px] md:text-[10px]">Spiral</span>
                                            {options.binding === 'Spiral' && totalBillingSheets > 300 && (
                                                <span className="text-[7px] text-red-500 font-bold uppercase absolute -top-1 bg-red-50 px-1 border border-red-200 rounded">Limit 300</span>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setOptions({ ...options, binding: 'Chart' })}
                                            className={`p-3 md:p-2 rounded-xl border-2 transition-all font-bold flex flex-col items-center gap-2 md:gap-1 group relative ${options.binding === 'Chart'
                                                ? 'bg-orange-50 border-orange-600'
                                                : 'bg-white border-slate-100 hover:border-orange-300'
                                                }`}
                                        >
                                            <div className="absolute top-0 right-0 bg-orange-600 text-white text-[8px] px-1.5 py-0.5 rounded-bl-lg z-10">₹{options.paperSize === 'A3' ? (rules?.additional?.a3_chart_binding || 20) : (rules?.additional?.chart_binding || 10)}</div>
                                            <div className="w-10 h-10 md:w-8 md:h-8 rounded overflow-hidden">
                                                <img src={assets.chart_binding_icon} alt="Chart" className="w-full h-full object-cover" />
                                            </div>
                                            <span className="text-[11px] md:text-[10px]">Chart</span>
                                        </button>
                                    </div>
                                    {options.binding !== 'Loose Papers' && (
                                        <div className="flex items-center gap-2 mt-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                            <label className="text-[10px] font-bold text-text-muted uppercase">Binding Qty:</label>
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => setOptions({ ...options, bindingQuantity: Math.max(1, (options.bindingQuantity || 1) - 1) })} className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-xs">-</button>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={options.bindingQuantity}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setOptions({ ...options, bindingQuantity: val === '' ? '' : parseInt(val) || '' });
                                                    }}
                                                    onBlur={() => {
                                                        if (options.bindingQuantity === '' || options.bindingQuantity < 1 || isNaN(options.bindingQuantity)) {
                                                            setOptions({ ...options, bindingQuantity: 1 });
                                                        }
                                                    }}
                                                    className="text-xs font-bold w-8 text-center bg-transparent border-b border-slate-300 focus:border-blue-500 focus:outline-none p-0"
                                                />
                                                <button type="button" onClick={() => setOptions({ ...options, bindingQuantity: (options.bindingQuantity || 1) + 1 })} className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-xs">+</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="sm:col-span-2 space-y-2">
                                    <label className="text-sm font-semibold text-text-muted">Additional Notes</label>
                                    <textarea
                                        value={options.notes}
                                        onChange={(e) => setOptions({ ...options, notes: e.target.value })}
                                        className="input-field h-24"
                                        placeholder="Any special instructions or comments..."
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={prevStep} className="flex-1 btn-secondary py-4">← Previous</button>
                                <button type="button" onClick={nextStep} className="flex-[2] btn-primary py-4">Next →</button>
                            </div>
                        </div>
                    )}

                    {/* 3. Fulfillment Method */}
                    {step === 3 && (
                        <div className="card-premium space-y-6 border-2 border-blue-100">
                            <h3 className="text-xl font-bold font-outfit flex items-center gap-2">
                                <span className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-full flex items-center justify-center text-sm">3</span>
                                How Would You Like to Receive?
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFulfillment('delivery')}
                                    className={`p-5 rounded-2xl border-2 transition-all text-left space-y-2 relative overflow-hidden ${fulfillment === 'delivery'
                                        ? 'border-blue-600 bg-blue-50 shadow-lg shadow-blue-100'
                                        : 'border-border hover:border-blue-300'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="text-3xl">🚚</span>
                                        {fulfillment === 'delivery' && pricing.delivery > 0 && (
                                            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">Calculated</span>
                                        )}
                                    </div>
                                    <p className="font-bold">Home Delivery</p>
                                    <p className="text-[10px] text-text-muted leading-relaxed">
                                        Charges applied by <strong>weight range</strong> + <strong>slip cost</strong> (Dynamic Pricing)
                                    </p>
                                    <p className="text-sm font-black text-blue-700">
                                        {pricing.delivery > 0 ? `₹${pricing.delivery.toFixed(2)}` : 'Calculated at Checkout'}
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFulfillment('pickup')}
                                    className={`p-5 rounded-2xl border-2 transition-all text-left space-y-2 ${fulfillment === 'pickup'
                                        ? 'border-green-600 bg-green-50 shadow-lg shadow-green-100'
                                        : 'border-border hover:border-green-300'}`}
                                >
                                    <span className="text-3xl">🏪</span>
                                    <p className="font-bold">Store Pickup</p>
                                    <p className="text-xs text-text-muted">Collect from our store</p>
                                    <p className="text-xs font-bold text-green-600">FREE</p>
                                </button>
                            </div>

                            {/* Address Management UI */}
                            {fulfillment === 'delivery' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                    {/* Saved Address View */}
                                    {!isEditingAddress && user?.address ? (
                                        <div className="p-4 border-2 border-green-100 bg-green-50/50 rounded-2xl flex items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-green-900">📍 Delivery Address</h4>
                                                    <span className="text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Verified</span>
                                                </div>
                                                <p className="text-sm text-green-800 font-medium leading-relaxed">
                                                    {delivery.address}<br />
                                                    {delivery.landmark && <span className="text-xs opacity-75">Near {delivery.landmark}<br /></span>}
                                                    {delivery.district}, {delivery.state} - <strong>{delivery.pincode}</strong>
                                                </p>
                                                <p className="text-xs text-green-700 font-bold mt-1">📞 {delivery.phone}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingAddress(true)}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-800 underline bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm"
                                            >
                                                Edit Address
                                            </button>
                                        </div>
                                    ) : (
                                        /* Edit Address Form */
                                        <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 relative">
                                            {user?.address && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditingAddress(false)}
                                                    className="absolute top-4 right-4 text-[10px] font-bold text-slate-500 hover:text-slate-800 border-b border-slate-300"
                                                >
                                                    Cancel Editing
                                                </button>
                                            )}

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-text-muted">Shipping Pincode</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={delivery.pincode}
                                                        onChange={(e) => handlePincodeChange(e.target.value)}
                                                        maxLength={6}
                                                        placeholder="6-digit Pincode"
                                                        className={`input-field pr-10 tracking-widest ${pincodeError ? 'border-red-500 focus:ring-red-200' : ''}`}
                                                    />
                                                    {pincodeLoading && <span className="absolute right-3 top-3.5 text-xs animate-spin">⌛</span>}
                                                    {!pincodeLoading && delivery.pincode.length === 6 && !pincodeError && (
                                                        <span className="absolute right-3 top-3.5 text-green-500 text-lg">✓</span>
                                                    )}
                                                </div>
                                                {pincodeError && <span className="text-xs text-red-500 font-medium">{pincodeError}</span>}
                                                {(delivery.district || delivery.state) && (
                                                    <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                                                        📍 {delivery.district}, {delivery.state}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2 col-span-2">
                                                    <label className="text-sm font-semibold text-text-muted">Full Address</label>
                                                    <textarea
                                                        value={delivery.address}
                                                        onChange={(e) => setDelivery(prev => ({ ...prev, address: e.target.value }))}
                                                        placeholder="House No, Street Name, Area..."
                                                        className="input-field h-20 resize-none"
                                                    />
                                                </div>
                                                <div className="space-y-2 col-span-2">
                                                    <label className="text-sm font-semibold text-text-muted">Landmark (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={delivery.landmark}
                                                        onChange={(e) => setDelivery(prev => ({ ...prev, landmark: e.target.value }))}
                                                        placeholder="Near bus stop, temple, etc."
                                                        className="input-field"
                                                    />
                                                </div>
                                                <div className="space-y-2 col-span-2">
                                                    <label className="text-sm font-semibold text-text-muted">Phone Number</label>
                                                    <input
                                                        type="tel"
                                                        value={delivery.phone}
                                                        onChange={(e) => setDelivery(prev => ({ ...prev, phone: e.target.value }))}
                                                        maxLength={10}
                                                        placeholder="+91 9876543210"
                                                        className="input-field"
                                                    />
                                                </div>
                                            </div>

                                            {/* Save Address Option */}
                                            {user && (
                                                <div className="flex items-center gap-3 pt-2">
                                                    <input
                                                        type="checkbox"
                                                        id="saveAddress"
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        onChange={async (e) => {
                                                            if (e.target.checked) {
                                                                // Validation
                                                                if (!delivery.pincode || !delivery.address || !delivery.district) {
                                                                    toast.error("Please fill all details to save");
                                                                    e.target.checked = false;
                                                                    return;
                                                                }
                                                                const loadToast = toast.loading("Saving to profile...");
                                                                try {
                                                                    const res = await axios.put('/api/user/update-profile', {
                                                                        address: {
                                                                            line1: delivery.address,
                                                                            pincode: delivery.pincode,
                                                                            city: delivery.district,
                                                                            state: delivery.state,
                                                                            landmark: delivery.landmark
                                                                        }
                                                                    });
                                                                    if (res.data.success) {
                                                                        toast.success("Address Saved to Profile! 💾");
                                                                    } else {
                                                                        toast.error(res.data.message);
                                                                    }
                                                                } catch (err) {
                                                                    toast.error("Failed to save address");
                                                                } finally {
                                                                    toast.dismiss(loadToast);
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor="saveAddress" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                                        Save this address to my profile
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Static Phone Input for Pickup/Layout placeholder (Hidden if Delivery) */}
                            {fulfillment === 'pickup' && (
                                <div className="bg-green-50 p-5 rounded-xl border border-green-200 space-y-2">
                                    <p className="font-bold text-green-800">📍 Pickup Location</p>
                                    <p className="text-sm text-green-700">{shopSettings?.name || "Print Express Store"}</p>
                                    <p className="text-xs text-green-600">{shopSettings?.address || "Coimbatore, Tamil Nadu"}</p>
                                    {shopSettings?.locationUrl && (
                                        <a href={shopSettings.locationUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline font-bold block mt-1">
                                            View on Map
                                        </a>
                                    )}
                                    <p className="text-xs text-text-muted mt-2">You will receive a notification when your order is ready for pickup.</p>
                                </div>
                            )}
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={prevStep} className="flex-1 btn-secondary py-4">← Previous</button>
                                <button type="button" onClick={nextStep} className="flex-[2] btn-primary py-4">Next →</button>
                            </div>
                        </div>
                    )}

                    {/* 4. Payment Method */}
                    {step === 4 && (
                        <div className="card-premium space-y-6 border-2 border-blue-100">
                            <h3 className="text-xl font-bold font-outfit flex items-center gap-2">
                                <span className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-full flex items-center justify-center text-sm">4</span>
                                Payment Method
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { id: 'UPI', icon: '💳', label: 'Online Payment', desc: 'Standard Razorpay' },
                                    { id: 'Wallet', icon: '🪙', label: 'Wallet', desc: `Balance: ₹${walletBalance}` },
                                    { id: 'UPI+Wallet', icon: '🌗', label: 'Split Pay', desc: 'Wallet + Razorpay' },
                                    { id: 'Referral', icon: '🎁', label: 'Referral amount balance', desc: `Balance: ₹${user?.referralBalance || 0}` },
                                ].map(pm => (
                                    <button
                                        type="button"
                                        key={pm.id}
                                        onClick={() => {
                                            if (pm.id === 'Referral') return;
                                            setPaymentMethod(pm.id);
                                            if (pm.id === 'Wallet' || pm.id === 'UPI+Wallet') setUseWallet(true);
                                            else setUseWallet(false);
                                        }}
                                        disabled={(pm.id === 'Wallet' && walletBalance <= 0) || pm.id === 'Referral'}
                                        className={`p-4 rounded-xl border-2 transition-all text-left space-y-1 ${paymentMethod === pm.id
                                            ? 'border-blue-600 bg-blue-50 shadow-md'
                                            : 'border-border hover:border-blue-300'
                                            } ${(pm.id === 'Wallet' && walletBalance <= 0) ? 'opacity-40 cursor-not-allowed' : ''} ${pm.id === 'Referral' ? 'bg-indigo-50 border-indigo-200 cursor-default hover:border-indigo-200 opacity-90' : ''}`}
                                    >
                                        <span className="text-2xl">{pm.icon}</span>
                                        <p className="font-bold text-sm">{pm.label}</p>
                                        <p className="text-[10px] text-text-muted">{pm.desc}</p>
                                    </button>
                                ))}
                            </div>

                            {/* Wallet Balance Info */}
                            {useWallet && walletBalance > 0 && (
                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">🪙</span>
                                        <div>
                                            <p className="font-bold text-sm text-amber-800">Wallet Coins</p>
                                            <p className="text-xs text-amber-600">Available: ₹{walletBalance}</p>
                                        </div>
                                    </div>
                                    <p className="text-lg font-bold text-green-600">-₹{pricing.walletUsed}</p>
                                </div>
                            )}

                            {/* Coupon Code */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-text-muted">🎟️ Have a Coupon Code?</label>
                                {couponApplied ? (
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-200 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">🎉</span>
                                            <div>
                                                <p className="font-bold text-green-800">{couponApplied.code}</p>
                                                <p className="text-xs text-green-600">₹{couponApplied.discount} discount applied!</p>
                                            </div>
                                        </div>
                                        <button onClick={removeCoupon} className="text-red-500 text-xs font-bold hover:text-red-700">Remove</button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            value={couponCode}
                                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                            placeholder="Enter coupon code"
                                            className="input-field flex-1 font-mono uppercase"
                                        />
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={couponLoading}
                                            className="btn-primary px-6 py-3 text-sm whitespace-nowrap"
                                        >
                                            {couponLoading ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={prevStep} className="flex-1 btn-secondary py-4">← Previous</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PrintPage;
