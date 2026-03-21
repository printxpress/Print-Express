import React from 'react'
import Navbar from './components/Navbar'
import { Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import { Toaster } from "react-hot-toast";
import Footer from './components/Footer';
import { useAppContext } from './context/AppContext';
import Login from './components/Login';
import AllProducts from './pages/AllProducts';
import ProductCategory from './pages/ProductCategory';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import AddAddress from './pages/AddAddress';
import MyOrders from './pages/MyOrders';
import Profile from './pages/Profile';
import SellerLogin from './components/seller/SellerLogin';
import SellerLayout from './pages/seller/SellerLayout';
import AddProduct from './pages/seller/AddProduct';
import ProductList from './pages/seller/ProductList';
import Orders from './pages/seller/Orders';
import Dashboard from './pages/seller/Dashboard';
import PrintPage from './pages/PrintPage';
import POSMode from './pages/seller/POSMode';
import ManageServices from './pages/seller/ManageServices';
import PricingRules from './pages/seller/PricingRules';
import Customers from './pages/seller/Customers';
import Analytics from './pages/seller/Analytics';
import AdminWallet from './pages/seller/AdminWallet';
import ShopSettings from './pages/seller/ShopSettings';
import AdminCoupons from './pages/seller/AdminCoupons';
import DeliveryZones from './pages/seller/DeliveryZones';
import BillingDashboard from './pages/seller/BillingDashboard';
import FollowUps from './pages/seller/FollowUps';
import Loading from './components/Loading';
import ManageBanners from './pages/seller/ManageBanners';
import ReferAndEarn from './pages/ReferAndEarn';
import Vouchers from './pages/Vouchers';
import OrderSuccess from './pages/OrderSuccess';
import ReferralManagement from './pages/seller/ReferralManagement';

const App = () => {

  const isSellerPath = useLocation().pathname.includes("seller");
  const { showUserLogin, isSeller, sellerRole } = useAppContext()

  return (
    <div className='text-default min-h-screen text-gray-700 bg-white'>

      {isSellerPath ? null : <Navbar />}
      {showUserLogin ? <Login /> : null}

      <Toaster />

      <div className={`${isSellerPath ? "" : "px-6 md:px-16 lg:px-24 xl:px-32"}`}>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/print' element={<PrintPage />} />
          <Route path='/refer' element={<ReferAndEarn />} />
          <Route path='/vouchers' element={<Vouchers />} />
          <Route path='/products' element={<AllProducts />} />
          <Route path='/products/:category' element={<ProductCategory />} />
          <Route path='/products/:category/:id' element={<ProductDetails />} />
          <Route path='/cart' element={<Cart />} />
          <Route path='/add-address' element={<AddAddress />} />
          <Route path='/order-success' element={<OrderSuccess />} />
          <Route path='/my-orders' element={<MyOrders />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/loader' element={<Loading />} />
          <Route path='seller' element={isSeller ? <SellerLayout /> : <SellerLogin />}>
            <Route index element={sellerRole === 'billing_manager' ? <BillingDashboard /> : <Dashboard />} />
            <Route path='dashboard' element={sellerRole === 'billing_manager' ? <BillingDashboard /> : <Dashboard />} />
            <Route path='billing-dashboard' element={<BillingDashboard />} />
            <Route path='orders' element={<Orders />} />
            <Route path='services' element={<ManageServices />} />
            <Route path='pricing' element={<PricingRules />} />
            <Route path='delivery' element={<DeliveryZones />} />
            <Route path='settings' element={<ShopSettings />} />
            <Route path='customers' element={<Customers />} />
            <Route path='analytics' element={<Analytics />} />
            <Route path='wallet' element={<AdminWallet />} />
            <Route path='coupons' element={<AdminCoupons />} />
            <Route path='referrals' element={<ReferralManagement />} />
            <Route path='followups' element={<FollowUps />} />
            <Route path='banners' element={<ManageBanners />} />
          </Route>
        </Routes>
      </div>
      {!isSellerPath && <Footer />}
    </div>
  )
}

export default App
