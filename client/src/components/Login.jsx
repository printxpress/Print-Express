import React, { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const Login = () => {

    const { setShowUserLogin, setUser, axios, navigate } = useAppContext()

    const [isRegister, setIsRegister] = useState(false);

    // Customer States
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState("phone"); // 'phone' or 'otp'

    const [referralCode, setReferralCode] = useState("");
    const [loading, setLoading] = useState(false);

    // Auto-capture referral code from URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get('ref');
        if (ref) {
            setReferralCode(ref.toUpperCase());
        }
    }, [setShowUserLogin]);

    // Audio Ref for notification sound
    const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

    const playNotification = () => {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => console.log("Sound play error:", err));
    };

    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();

        // Indian Phone Number Validation
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return toast.error("Please enter a valid 10-digit Indian phone number.");
        }

        setLoading(true);
        try {
            const { data } = await axios.post('/api/user/send-otp', { phone });
            if (data.success) {
                toast.success('Authentication code sent successfully');
                playNotification();
                setStep("otp");

                // AUTO APPLY LOGIC: If server returns OTP (Dev/Demo mode)
                if (data.otp) {
                    setOtp(data.otp);
                    // Generate a random delay between 5 to 8 seconds
                    const delay = Math.floor(Math.random() * (8000 - 5000 + 1)) + 5000;
                    setTimeout(() => {
                        handleVerifyOtp(null, data.otp);
                    }, delay);
                }
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }

    const handleVerifyOtp = async (e, directOtp) => {
        if (e) e.preventDefault();
        const finalOtp = directOtp || otp;

        if (!finalOtp || finalOtp.length !== 6) {
            return toast.error("Please enter a valid 6-digit verification code");
        }

        setLoading(true);
        try {
            const { data } = await axios.post('/api/user/verify-otp', {
                phone,
                otp: finalOtp,
                name: name || undefined,
                referralCode: referralCode || undefined
            });
            if (data.success) {
                if (data.token) localStorage.setItem('token', data.token);
                setUser(data.user);

                if (!data.isNewUser) {
                    // Existing customer - Welcome card flow
                    setStep("welcome");
                    setTimeout(() => {
                        setShowUserLogin(false);
                        toast.success('Welcome back!');
                        if (!data.isProfileComplete) {
                            toast('Please complete your profile details', { icon: '📝' });
                            navigate('/profile?edit=true');
                        }
                    }, 2000);
                } else {
                    // New user - Close immediately
                    setShowUserLogin(false);
                    toast.success('Registered successfully');
                    if (!data.isProfileComplete) {
                        setTimeout(() => {
                            toast('Please complete your profile details', { icon: '📝' });
                            navigate('/profile?edit=true');
                        }, 500);
                    }
                }
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div onClick={() => setShowUserLogin(false)} className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md'>
            <div onClick={(e) => e.stopPropagation()} className="card-premium w-full max-w-md animate-in fade-in zoom-in duration-300 bg-white shadow-2xl overflow-hidden p-0 border-none">

                {/* Header Section */}
                <div className="bg-slate-50 p-8 text-center border-b border-slate-100">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto shadow-lg shadow-blue-200 mb-4">
                        📱
                    </div>
                    <h2 className="text-2xl font-black font-outfit text-slate-900 tracking-tight">
                        Welcome to Print Express
                    </h2>
                    {step === 'otp' ? (
                        <div className="mt-2 flex items-center justify-center gap-2 bg-blue-50 py-2 px-4 rounded-full w-fit mx-auto border border-blue-100">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <p className="text-blue-700 text-[10px] font-black uppercase tracking-widest leading-none">
                                Authenticating: {phone}
                            </p>
                        </div>
                    ) : step === 'welcome' ? (
                        <div className="mt-2 flex items-center justify-center gap-2 bg-green-50 py-2 px-4 rounded-full w-fit mx-auto border border-green-100">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <p className="text-green-700 text-[10px] font-black uppercase tracking-widest leading-none">
                                Verified Successfully
                            </p>
                        </div>
                    ) : (
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                            Login or Create Account
                        </p>
                    )}
                </div>

                <div className="p-8 space-y-6">
                    {step === 'phone' ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name (Optional for existing users)</label>
                                <input
                                    onChange={(e) => setName(e.target.value)}
                                    value={name}
                                    placeholder="Enter your name"
                                    className="input-field py-3 text-sm"
                                    type="text"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                <input
                                    onChange={(e) => setPhone(e.target.value)}
                                    value={phone}
                                    placeholder="+91 9876543210"
                                    className="input-field py-3 text-sm font-mono"
                                    type="tel"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referral Code (Optional)</label>
                                <input
                                    onChange={(e) => setReferralCode(e.target.value)}
                                    value={referralCode}
                                    placeholder="PRINTXXXX"
                                    className="input-field py-3 text-sm font-mono uppercase"
                                    type="text"
                                />
                            </div>
                            <button
                                disabled={loading}
                                className="btn-primary w-full py-4 text-sm font-bold shadow-xl shadow-blue-100"
                            >
                                {loading ? 'Authenticating you...' : 'Login / Register'}
                            </button>
                        </form>
                    ) : step === 'otp' ? (
                        <div className="space-y-6 py-6 text-center">
                            <div className="flex flex-col items-center justify-center gap-4">
                                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Authenticating you ⚡</h3>
                                    <p className="text-xs text-slate-500">Confirming credentials and proceeding...</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col items-center gap-1 w-full max-w-xs mx-auto">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phone Number</p>
                                <p className="text-sm font-black text-slate-900 font-mono tracking-tight">{phone}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 py-6 text-center animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto shadow-sm border border-green-200">
                                👋
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black font-outfit text-slate-800">Welcome Back!</h3>
                                <p className="text-base font-bold text-blue-600 font-outfit">{name || (phone ? `User (${phone.slice(-4)})` : 'Customer')}</p>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Redirecting you in 2 seconds...</p>
                        </div>
                    )}
                </div>

                {/* Footer Notice */}
                <div className="bg-slate-50 p-4 text-center">
                    <button
                        onClick={() => setShowUserLogin(false)}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        Close Modal
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Login
