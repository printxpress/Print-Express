import React, { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import PrintExpressLogo from './PrintExpressLogo'

const Navbar = () => {
  const [open, setOpen] = React.useState(false)
  const { user, setUser, setShowUserLogin, navigate, axios } = useAppContext();
  const location = useLocation();
  const menuRef = useRef(null);

  const logout = async () => {
    try {
      const { data } = await axios.get('/api/user/logout')
      if (data.success) {
        toast.success(data.message)
        localStorage.removeItem('token')
        setUser(null);
        navigate('/')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const navLinkClass = ({ isActive }) =>
    `nav-link pb-1 text-sm ${isActive ? 'text-primary font-semibold' : 'text-gray-700'}`;

  return (
    <nav className="flex items-center justify-between py-3 md:py-4 sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-blue-100 shadow-sm" ref={menuRef}>

      <NavLink to='/' onClick={() => setOpen(false)} className="hover:scale-105 transition-transform flex-shrink-0">
        <PrintExpressLogo className="h-9 md:h-10" />
      </NavLink>

      {/* Desktop Navigation - ALL items visible */}
      <div className="hidden md:flex items-center gap-4 lg:gap-6 font-medium">
        <NavLink to='/' className={navLinkClass}>Home</NavLink>
        <NavLink to='/print' className={navLinkClass}>Print Online</NavLink>
        <NavLink to='/vouchers' className={navLinkClass}>Vouchers & Offers</NavLink>
        <NavLink to='/refer' className={navLinkClass}>Refer & Earn</NavLink>
        <p
          onClick={() => user ? navigate('/my-orders') : setShowUserLogin(true)}
          className={`cursor-pointer pb-1 text-sm ${location.pathname === '/my-orders' ? 'text-primary font-semibold' : 'text-gray-700 font-medium hover:text-primary transition-colors'}`}
        >
          My Orders
        </p>
        <p
          onClick={() => user ? navigate('/profile') : setShowUserLogin(true)}
          className={`cursor-pointer pb-1 text-sm ${location.pathname === '/profile' ? 'text-primary font-semibold' : 'text-gray-700 font-medium hover:text-primary transition-colors'}`}
        >
          My Profile
        </p>
      </div>

      {/* User Section & Mobile Toggle */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* All India Badge - compact */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-orange-50 to-green-50 rounded-full border border-orange-200">
          <span className="text-sm">🇮🇳</span>
          <span className="text-[10px] font-semibold text-gray-600">All India</span>
        </div>

        {!user ? (
          <button
            onClick={() => setShowUserLogin(true)}
            className="btn-primary py-2 px-4 md:py-2 md:px-6 text-sm hover-glow"
          >
            Login
          </button>
        ) : (
          <div className='relative group flex items-center gap-2 cursor-pointer'>
            <div className="text-right hidden lg:block">
              <p className="text-[10px] text-text-muted">Welcome,</p>
              <p className="text-xs font-bold">{user.name}</p>
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center font-bold text-primary border-2 border-primary/30 hover:scale-110 transition-transform text-sm">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <ul className='hidden group-hover:block absolute top-12 right-0 bg-white shadow-2xl border border-border py-2 w-44 rounded-xl text-sm z-50 animate-fade-in-up'>
              <li onClick={() => navigate("/profile")} className='p-3 hover:bg-blue-50 cursor-pointer flex items-center gap-2 transition-colors'>
                👤 My Profile
              </li>
              <li onClick={() => navigate("/my-orders")} className='p-3 hover:bg-blue-50 cursor-pointer flex items-center gap-2 transition-colors'>
                📦 My Orders
              </li>
              <li onClick={() => navigate("/vouchers")} className='p-3 hover:bg-blue-50 cursor-pointer flex items-center gap-2 transition-colors'>
                🎟️ Vouchers
              </li>
              <li onClick={() => navigate("/refer")} className='p-3 hover:bg-blue-50 cursor-pointer flex items-center gap-2 transition-colors'>
                🎁 Refer & Earn
              </li>
              <li onClick={logout} className='p-3 hover:bg-red-50 text-red-500 cursor-pointer flex items-center gap-2 border-t border-border transition-colors'>
                🚪 Logout
              </li>
            </ul>
          </div>
        )}

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-2xl hover:bg-blue-50 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu Overlay - ALL items visible */}
      {open && (
        <div className="absolute top-full left-0 w-full bg-white shadow-2xl py-6 flex flex-col items-center gap-4 text-lg font-semibold md:hidden border-t border-blue-100 animate-slide-in-left z-50">
          <NavLink to="/" onClick={() => setOpen(false)} className="w-full text-center py-2 hover:bg-blue-50 transition-colors">
            Home
          </NavLink>
          <NavLink to="/print" onClick={() => setOpen(false)} className="w-full text-center py-2 hover:bg-blue-50 transition-colors">
            Print Online
          </NavLink>
          <NavLink to="/vouchers" onClick={() => setOpen(false)} className="w-full text-center py-2 hover:bg-blue-50 transition-colors">
            Vouchers & Offers
          </NavLink>
          <NavLink to="/refer" onClick={() => setOpen(false)} className="w-full text-center py-2 hover:bg-blue-50 transition-colors">
            Refer & Earn
          </NavLink>
          <p
            onClick={() => { setOpen(false); user ? navigate('/my-orders') : setShowUserLogin(true); }}
            className="w-full text-center py-2 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            My Orders
          </p>
          <p
            onClick={() => { setOpen(false); user ? navigate('/profile') : setShowUserLogin(true); }}
            className="w-full text-center py-2 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            My Profile
          </p>

          {/* All India Badge in Mobile */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-green-50 rounded-full border border-orange-200 mt-1">
            <span className="text-lg">🇮🇳</span>
            <span className="text-sm font-semibold text-gray-700">Serving All India</span>
          </div>

          {!user ? (
            <button
              onClick={() => { setOpen(false); setShowUserLogin(true); }}
              className="btn-primary w-2/3 mt-2"
            >
              Login
            </button>
          ) : (
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="btn-outline w-2/3 mt-2"
            >
              Logout
            </button>
          )}
        </div>
      )}

    </nav>
  )
}

export default Navbar
