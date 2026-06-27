import React, { useEffect, useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast';

const SellerLogin = () => {
    const { isSeller, setIsSeller, setSellerRole, navigate, axios } = useAppContext()
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const onSubmitHandler = async (event) => {
        try {
            event.preventDefault();
            const { data } = await axios.post('/api/seller/login', { email, password })
            if (data.success) {
                if (data.token) {
                    localStorage.setItem('sellerToken', data.token);
                }
                setIsSeller(true)
                setSellerRole(data.role)
                navigate('/seller')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    useEffect(() => {
        if (isSeller) {
            navigate("/seller")
        }
    }, [isSeller])

    return !isSeller && (
        <form onSubmit={onSubmitHandler} className='min-h-screen flex items-center text-sm text-gray-600 bg-gradient-to-br from-blue-50 to-slate-100'>
            <div className='flex flex-col gap-5 m-auto items-start p-8 py-12 min-w-80 sm:min-w-96 rounded-2xl shadow-2xl border border-gray-200 bg-white'>
                <div className="text-center w-full space-y-2">
                    <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto">🖨️</div>
                    <p className='text-2xl font-bold font-outfit'>
                        Staff Login
                    </p>
                    <p className="text-xs text-text-muted">Print Express Dashboard</p>
                </div>
                <div className="w-full space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Username</label>
                    <input onChange={(e) => setEmail(e.target.value)} value={email}
                        type="text" placeholder="Enter Username"
                        className="input-field" required />
                </div>
                <div className="w-full space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Password</label>
                    <input onChange={(e) => setPassword(e.target.value)} value={password}
                        type="password" placeholder="Enter Password"
                        className="input-field" required />
                </div>
                <button className="btn-primary w-full py-3 text-base">Login to Dashboard</button>
            </div>
        </form>
    )
}

export default SellerLogin
