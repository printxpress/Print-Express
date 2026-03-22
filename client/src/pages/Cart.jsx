import { useEffect, useState, useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import { assets } from "../assets/assets";
import toast from "react-hot-toast";

const Cart = () => {
    const { products, currency, cartItems, removeFromCart, getCartCount, updateCartItem, navigate, getCartAmount, axios, user, setCartItems } = useAppContext()
    const [cartArray, setCartArray] = useState([])
    const [addresses, setAddresses] = useState([])
    const [showAddress, setShowAddress] = useState(false)
    const [selectedAddress, setSelectedAddress] = useState(null)
    const [isBulkOrder, setIsBulkOrder] = useState(false)
    const [deliveryMethod, setDeliveryMethod] = useState('standard') // 'standard' or 'parcel'
    const [courierPartner, setCourierPartner] = useState('ST/DTDC Courier')
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [useWallet, setUseWallet] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);

    const subtotal = getCartAmount();
    const subtotalWithTax = subtotal + subtotal * 2 / 100;

    // Referral Discount Calculation (10% max)
    let referralDiscount = 0;
    if (user && user.referralBalance > 0) {
        referralDiscount = Math.min(user.referralBalance, subtotalWithTax * 0.1);
    }

    const totalAmount = Math.max(0, subtotalWithTax - referralDiscount);
    
    // 50/50 Split Pay Logic
    let walletUsed = 0;
    if (useWallet) {
        if (paymentMethod === 'UPI+Wallet') {
            walletUsed = Math.min(walletBalance, totalAmount / 2);
        } else {
            walletUsed = Math.min(walletBalance, totalAmount);
        }
    }
    
    const finalTotalAmount = totalAmount - walletUsed;

    const placeOrder = async (isPaidViaRazorpay = false) => {
        try {
            if (!selectedAddress) {
                return toast.error("Please select an address")
            }

            // Create order first
            const { data } = await axios.post('/api/order/place', {
                userId: user._id,
                items: cartArray.map(item => ({ product: item._id, quantity: item.quantity })),
                address: selectedAddress._id,
                paymentMethod: paymentMethod === 'UPI' ? 'RAZORPAY' : paymentMethod,
                isPaid: false, // Initially false
                referralDiscount, // Passed to backend
                walletUsed,
                courierPartner
            })

            if (data.success) {
                const orderId = data.orderId;

                // Initiate Razorpay if needed
                if ((paymentMethod === 'UPI' || paymentMethod === 'UPI+Wallet') && finalTotalAmount > 0) {
                    const { data: razorpayData } = await axios.post('/api/order/razorpay-order', {
                        amount: finalTotalAmount
                    });

                    if (razorpayData.success) {
                        if (!window.Razorpay) {
                            console.error("Razorpay script (window.Razorpay) is missing!");
                            return toast.error("Razorpay script not loaded. Please refresh.")
                        }

                        console.log("Initializing Razorpay with Key:", import.meta.env.VITE_RAZORPAY_KEY_ID);
                        const options = {
                            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                            amount: razorpayData.razorpayOrder.amount,
                            currency: razorpayData.razorpayOrder.currency,
                            name: "Print Express",
                            description: "Product Purchase",
                            order_id: razorpayData.razorpayOrder.id,
                            handler: async (response) => {
                                try {
                                    const { data: verifyData } = await axios.post('/api/order/razorpay-verify', {
                                        ...response,
                                        orderId
                                    });

                                    if (verifyData.success) {
                                        toast.success("Payment successful! Order placed. 🎉")
                                        setCartItems({})
                                        navigate('/my-orders')
                                    } else {
                                        toast.error(verifyData.message || "Payment verification failed")
                                    }
                                } catch (error) {
                                    toast.error("Payment verification error")
                                }
                            },
                            prefill: {
                                name: user.name,
                                email: user.email,
                                contact: selectedAddress.phone || user.phone
                            },
                            theme: {
                                color: "#2563eb"
                            },
                            modal: {
                                ondismiss: function () {
                                    // Optional: logic when modal is closed
                                }
                            }
                        };

                        const rzp = new window.Razorpay(options);
                        rzp.open();
                    } else {
                        toast.error("Could not initiate payment")
                    }
                } else {
                    // Paid via Wallet or amount is 0
                    toast.success("Order placed successfully! 🎉")
                    setCartItems({})
                    navigate('/my-orders')
                }
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const getCart = useCallback(() => {
        let tempData = []
        for (const items in cartItems) {
            if (cartItems[items] > 0) {
                let itemInfo = products.find((product) => product._id === items);
                if (itemInfo) {
                    tempData.push({
                        ...itemInfo,
                        quantity: cartItems[items]
                    })
                }
            }
        }
        setCartArray(tempData)
    }, [cartItems, products])

    const getUserAddress = async () => {
        try {
            const { data } = await axios.get('/api/user/get-address')
            if (data.success) {
                setAddresses(data.addresses)
                if (data.addresses.length > 0) {
                    setSelectedAddress(data.addresses[0])
                }
            }
        } catch (error) {
            console.error(error.message)
        }
    }

    useEffect(() => {
        if (products.length > 0 && cartItems) {
            getCart()
        }
    }, [products, cartItems, getCart])


    useEffect(() => {
        if (user) {
            getUserAddress()
            const fetchWallet = async () => {
                try {
                    const { data } = await axios.get('/api/user/wallet-balance');
                    if (data.success) setWalletBalance(data.balance);
                } catch (e) { console.error("Error fetching wallet", e); }
            };
            fetchWallet();
        }
    }, [user, axios])

    return products.length > 0 && cartItems ? (
        <div className="flex flex-col md:flex-row mt-16">
            <div className='flex-1 max-w-4xl'>
                <h1 className="text-3xl font-medium mb-6">
                    Shopping Cart <span className="text-sm text-primary">{getCartCount()} Items</span>
                </h1>

                <div className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 text-base font-medium pb-3">
                    <p className="text-left">Product Details</p>
                    <p className="text-center">Subtotal</p>
                    <p className="text-center">Action</p>
                </div>

                {cartArray.map((product, index) => (
                    <div key={index} className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 items-center text-sm md:text-base font-medium pt-3">
                        <div className="flex items-center md:gap-6 gap-3">
                            <div onClick={() => {
                                navigate(`/products/${product.category.toLowerCase()}/${product._id}`); scrollTo(0, 0)
                            }} className="cursor-pointer w-24 h-24 flex items-center justify-center border border-gray-300 rounded">
                                <img className="max-w-full h-full object-cover" src={product.image[0]} alt={product.name} />
                            </div>
                            <div>
                                <p className="hidden md:block font-semibold">{product.name}</p>
                                <div className="font-normal text-gray-500/70">

                                    <div className='flex items-center'>
                                        <p>Qty:</p>
                                        <select onChange={e => updateCartItem(product._id, Number(e.target.value))} value={cartItems[product._id]} className='outline-none'>
                                            {Array(cartItems[product._id] > 9 ? cartItems[product._id] : 9).fill('').map((_, index) => (
                                                <option key={index} value={index + 1}>{index + 1}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-center">{currency}{product.offerPrice * product.quantity}</p>
                        <button onClick={() => removeFromCart(product._id)} className="cursor-pointer mx-auto">
                            <img src={assets.remove_icon} alt="remove" className="inline-block w-6 h-6" />
                        </button>
                    </div>)
                )}

                <button onClick={() => { navigate("/products"); scrollTo(0, 0) }} className="group cursor-pointer flex items-center mt-8 gap-2 text-primary font-medium">
                    <img className="group-hover:-translate-x-1 transition" src={assets.arrow_right_icon_colored} alt="arrow" />
                    Continue Shopping
                </button>

            </div>

            <div className="max-w-[360px] w-full bg-gray-100/40 p-5 max-md:mt-16 border border-gray-300/70">
                <h2 className="text-xl md:text-xl font-medium">Order Summary</h2>
                <hr className="border-gray-300 my-5" />


                <div className="mb-6">
                    <p className="text-sm font-medium uppercase">Delivery Address</p>
                    <div className="relative flex justify-between items-start mt-2">
                        <p className="text-gray-500">{selectedAddress ? `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state}, ${selectedAddress.country}` : "No address found"}</p>
                        <button onClick={() => setShowAddress(!showAddress)} className="text-primary hover:underline cursor-pointer">
                            Change
                        </button>
                        {showAddress && (
                            <div className="absolute top-12 py-1 bg-white border border-gray-300 text-sm w-full">
                                {addresses.map((address, index) => (
                                    <p key={index} onClick={() => { setSelectedAddress(address); setShowAddress(false) }} className="text-gray-500 p-2 hover:bg-gray-100">
                                        {address.street}, {address.city}, {address.state}, {address.country}
                                    </p>
                                ))}
                                <p onClick={() => navigate("/add-address")} className="text-primary text-center cursor-pointer p-2 hover:bg-primary/10">
                                    Add address
                                </p>
                            </div>
                        )}
                    </div>

                    <p className="text-sm font-medium uppercase mt-6">Payment Method</p>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {[
                            { id: 'UPI', icon: '💳', label: 'Online', desc: 'Razorpay' },
                            { id: 'Wallet', icon: '🪙', label: 'Wallet', desc: walletBalance > 0 ? `₹${walletBalance}` : 'Empty' },
                            { id: 'UPI+Wallet', icon: '🌗', label: 'Split Pay', desc: 'Wallet+UPI' },
                        ].map(pm => {
                            const isWalletEmpty = (pm.id === 'Wallet' || pm.id === 'UPI+Wallet') && walletBalance <= 0;
                            return (
                                <button
                                    key={pm.id}
                                    onClick={() => {
                                        if (isWalletEmpty) {
                                            toast.error("Your wallet is empty.");
                                            return;
                                        }
                                        if (pm.id === 'UPI+Wallet') {
                                            toast.success("Split Pay: ₹" + (totalAmount / 2).toFixed(2) + " will be used from wallet, remaining by Online. 🌗", {
                                                icon: '🌗',
                                                duration: 4000
                                            });
                                        }
                                        setPaymentMethod(pm.id);
                                        setUseWallet(pm.id === 'Wallet' || pm.id === 'UPI+Wallet');
                                    }}
                                    className={`p-2 rounded-lg border-2 transition-all text-left ${paymentMethod === pm.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-gray-200'
                                        } ${isWalletEmpty ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm">{pm.icon}</span>
                                        <p className="font-bold text-[10px]">{pm.label}</p>
                                    </div>
                                    <p className="text-[8px] text-gray-400">{pm.desc}</p>
                                </button>
                            );
                        })}
                    </div>

                    {useWallet && walletBalance > 0 && (
                        <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">🪙</span>
                                <p className="text-[10px] font-bold text-amber-800">Wallet Used</p>
                            </div>
                            <p className="text-xs font-bold text-green-600">-₹{walletUsed.toFixed(2)}</p>
                        </div>
                    )}

                    {user?.referralBalance > 0 && (
                        <div className="w-full border border-gray-300 bg-indigo-50 text-indigo-800 px-3 py-2 mt-2 outline-none flex items-center justify-between font-medium">
                            <div className="flex items-center gap-2">
                                <span>🎁</span> Referral amount balance
                            </div>
                            <span className="text-xs">
                                ₹{user.referralBalance}
                            </span>
                        </div>
                    )}

                    <p className="text-sm font-medium uppercase mt-6">Delivery Type</p>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                        <button
                            onClick={() => setCourierPartner('ST/DTDC Courier')}
                            className={`w-full py-2 px-3 border-2 rounded-lg text-xs font-bold transition-all text-left flex flex-col ${courierPartner === 'ST/DTDC Courier' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500'}`}
                        >
                            <div className="flex justify-between items-center w-full">
                                <span>In Courier Service (ST Courier, DTDC)</span>
                                <span>{courierPartner === 'ST/DTDC Courier' ? '✓' : ''}</span>
                            </div>
                            <span className="text-[9px] font-normal opacity-70">(Home Delivery Available)</span>
                        </button>
                        {isBulkOrder && (
                            <button
                                onClick={() => setCourierPartner('Parcel Service (A1, Rathimeena, MSS)')}
                                className={`w-full py-2 px-3 border-2 rounded-lg text-xs font-bold transition-all text-left flex flex-col ${courierPartner === 'Parcel Service (A1, Rathimeena, MSS)' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500'}`}
                            >
                                <div className="flex justify-between items-center w-full">
                                    <span>Parcel Service (A1, Rathimeena, MSS)</span>
                                    <span>{courierPartner === 'Parcel Service (A1, Rathimeena, MSS)' ? '✓' : ''}</span>
                                </div>
                                <span className="text-[9px] font-normal opacity-70">(Home Delivery Not Available - Need to collect in Hub)</span>
                            </button>
                        )}
                    </div>
                </div>

                <hr className="border-gray-300" />

                <div className="text-gray-500 mt-4 space-y-2">
                    <p className="flex justify-between">
                        <span>Price</span><span>{currency}{getCartAmount()}</span>
                    </p>
                    <p className="flex justify-between">
                        <span>Shipping Fee</span>
                        <span className={(isBulkOrder && courierPartner.includes('Parcel')) ? "text-green-600 font-bold" : "text-gray-500"}>
                            {(isBulkOrder && courierPartner.includes('Parcel')) ? "Free" : "₹0.00"}
                        </span>
                    </p>
                    <p className="flex justify-between">
                        <span>Tax (2%)</span><span>{currency}{getCartAmount() * 2 / 100}</span>
                    </p>
                    {referralDiscount > 0 && (
                        <p className="flex justify-between text-indigo-600 font-semibold">
                            <span>Referral Discount (10%)</span><span>-{currency}{referralDiscount.toFixed(2)}</span>
                        </p>
                    )}
                    <p className="flex justify-between text-lg font-medium mt-3">
                        <span>Total Payable:</span><span>
                            {currency}{finalTotalAmount.toFixed(2)}</span>
                    </p>
                </div>

                <button onClick={() => placeOrder()} className="w-full py-3 mt-6 cursor-pointer bg-primary text-white font-medium hover:bg-primary-dull transition">
                    Proceed to Payment 🚀
                </button>
            </div>
        </div>
    ) : null
}

export default Cart;