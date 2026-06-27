import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";
import axios from "axios";

axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL || "";

// Add Axios Interceptor to include token in headers
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        const sellerToken = localStorage.getItem('sellerToken');

        if (token && config.url.includes('/api/user')) {
            config.headers.Authorization = `Bearer ${token}`;
        } else if (sellerToken && config.url.includes('/api/seller')) {
            config.headers.Authorization = `Bearer ${sellerToken}`;
        } else if (token || sellerToken) {
            // Prioritize sellerToken if we are currently visiting a seller dashboard path (/seller)
            const isSellerPage = window.location.pathname.includes('/seller');
            if (isSellerPage && sellerToken) {
                config.headers.Authorization = `Bearer ${sellerToken}`;
            } else {
                config.headers.Authorization = `Bearer ${token || sellerToken}`;
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add Response Interceptor to handle unauthorized errors
axios.interceptors.response.use(
    (response) => {
        if (response.data && response.data.success === false && response.data.message === 'Not Authorized') {
            localStorage.removeItem('token');
            localStorage.removeItem('sellerToken');
        }
        return response;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {

    const currency = import.meta.env.VITE_CURRENCY;

    const navigate = useNavigate();
    const [user, setUser] = useState(null)
    const [isSeller, setIsSeller] = useState(false)
    const [sellerRole, setSellerRole] = useState(null)
    const [showUserLogin, setShowUserLogin] = useState(false)
    const [products, setProducts] = useState([])
    const [services, setServices] = useState([])

    const [cartItems, setCartItems] = useState({})
    const [searchQuery, setSearchQuery] = useState({})
    const [pricingRules, setPricingRules] = useState(null)

    // Fetch Seller/Admin Status
    const fetchSeller = async () => {
        try {
            const { data } = await axios.get('/api/seller/is-auth');
            if (data.success) {
                setIsSeller(true)
                setSellerRole(data.role)
            }
        } catch (error) {
            setIsSeller(false)
        }
    }

    // Fetch User Auth Status
    const fetchUser = async () => {
        try {
            const { data } = await axios.get('/api/user/is-auth');
            if (data.success) {
                setUser(data.user)
                if (data.user.cart) setCartItems(data.user.cart)
            }
        } catch (error) {
            setUser(null)
        }
    }

    // Fetch Pricing Rules
    const fetchPricing = async () => {
        try {
            const { data } = await axios.get('/api/pricing');
            if (data.success) {
                setPricingRules(data.pricing);
            }
        } catch (error) {
            console.error("Error fetching pricing:", error.message);
        }
    }

    // Fetch All Products
    const fetchProducts = async () => {
        try {
            const { data } = await axios.get('/api/product/list')
            if (data.success) {
                setProducts(data.products)
            }
        } catch (error) {
            console.error(error.message)
        }
    }

    // Fetch All Services
    const fetchServices = async () => {
        try {
            const { data } = await axios.get('/api/services')
            if (data.success) {
                setServices(data.services)
            }
        } catch (error) {
            console.error(error.message)
        }
    }

    const [shopSettings, setShopSettings] = useState(null)

    const fetchShopSettings = async () => {
        try {
            const { data } = await axios.get('/api/shop/settings')
            if (data.success) {
                setShopSettings(data.settings)
            }
        } catch (error) {
            console.error(error.message)
        }
    }

    // Simple Cart Helpers (Keeping for compatibility)
    const addToCart = (itemId) => {
        let cartData = structuredClone(cartItems);
        cartData[itemId] = (cartData[itemId] || 0) + 1;
        setCartItems(cartData);
        toast.success("Added to Cart")
    }

    const updateCartItem = (itemId, quantity) => {
        let cartData = structuredClone(cartItems);
        cartData[itemId] = quantity;
        setCartItems(cartData)
    }

    const removeFromCart = (itemId) => {
        let cartData = structuredClone(cartItems);
        if (cartData[itemId]) {
            cartData[itemId] -= 1;
            if (cartData[itemId] === 0) delete cartData[itemId];
        }
        setCartItems(cartData)
    }

    const getCartCount = () => {
        return Object.values(cartItems).reduce((a, b) => a + b, 0);
    }

    const getCartAmount = () => {
        let totalAmount = 0;
        for (const items in cartItems) {
            let itemInfo = products.find((product) => product._id === items);
            if (itemInfo && cartItems[items] > 0) {
                totalAmount += itemInfo.offerPrice * cartItems[items]
            }
        }
        return Math.floor(totalAmount * 100) / 100;
    }


    useEffect(() => {
        fetchUser()
        fetchSeller()
        fetchPricing()
        fetchProducts()
        fetchServices()
        fetchShopSettings()
    }, [])

    const value = {
        navigate, user, setUser, setIsSeller, isSeller, sellerRole, setSellerRole,
        showUserLogin, setShowUserLogin, products, services, currency, addToCart, updateCartItem, removeFromCart, cartItems, searchQuery, setSearchQuery, getCartAmount, getCartCount, axios, fetchProducts, fetchServices, setCartItems, pricingRules, shopSettings, fetchShopSettings
    }

    return <AppContext.Provider value={value}>
        {children}
    </AppContext.Provider>
}

export const useAppContext = () => {
    return useContext(AppContext)
}
