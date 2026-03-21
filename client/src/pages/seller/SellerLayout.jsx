import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";
import CleanUpModal from "../../components/seller/CleanUpModal";

const SellerLayout = () => {

    const { axios, navigate, sellerRole } = useAppContext();
    const [showCleanUp, setShowCleanUp] = useState(false);

    const sidebarLinks = [
        { name: "Dashboard", path: "/seller", icon: "🏠", roles: ['admin', 'billing_manager'] },
        { name: "Print Orders", path: "/seller/orders", icon: "🖨️", roles: ['admin', 'billing_manager'] },
        { name: "Customers", path: "/seller/customers", icon: "👥", roles: ['admin', 'billing_manager'] },
        { name: "Analytics", path: "/seller/analytics", icon: "📊", roles: ['admin'] },
        { name: "Services", path: "/seller/services", icon: "📄", roles: ['admin'] },
        { name: "Rules", path: "/seller/pricing", icon: "💰", roles: ['admin'] },
        { name: "Coupons", path: "/seller/coupons", icon: "🎟️", roles: ['admin'] },
        { name: "Wallet", path: "/seller/wallet", icon: "🪙", roles: ['admin'] },
        { name: "Zones", path: "/seller/delivery", icon: "🚚", roles: ['admin', 'billing_manager'] },
        { name: "Banners", path: "/seller/banners", icon: "🖼️", roles: ['admin'] },
        { name: "Settings", path: "/seller/settings", icon: "⚙️", roles: ['admin', 'billing_manager'] },
        { name: "Referrals", path: "/seller/referrals", icon: "🤝", roles: ['admin', 'billing_manager'] },
        { name: "Follow-ups", path: "/seller/followups", icon: "📢", roles: ['admin', 'billing_manager'] },
    ];

    const filteredLinks = sidebarLinks.filter(link => !link.roles || link.roles.includes(sellerRole || 'admin'));

    const logout = async () => {
        try {
            const { data } = await axios.get('/api/seller/logout');
            if (data.success) {
                toast.success(data.message)
                navigate('/')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Admin Header */}
            <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-border sticky top-0 z-50">
                <Link to='/' className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">P</div>
                    <span className="font-outfit font-bold text-xl">{sellerRole === 'billing_manager' ? 'Billing' : 'Admin'} <span className="text-primary italic">Panel</span></span>
                </Link>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Logged in as</p>
                        <p className="text-sm font-bold">{sellerRole === 'billing_manager' ? 'Billing Manager' : 'Print Admin'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowCleanUp(true)} className="btn-outline border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 py-2 px-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                            <span>🧹</span> Clean Up
                        </button>
                        <button onClick={logout} className='btn-outline py-2 px-6 text-xs'>Sign Out</button>
                    </div>
                </div>
            </div>

            <CleanUpModal isOpen={showCleanUp} onClose={() => setShowCleanUp(false)} />

            <div className="flex flex-1">
                {/* Sidebar */}
                <div className="w-20 md:w-64 bg-white border-r border-border py-8 flex flex-col gap-2">
                    {filteredLinks.map((item) => (
                        <NavLink to={item.path} key={item.name}
                            className={({ isActive }) => `flex items-center py-4 px-6 gap-4 transition-all
                            ${isActive ? "bg-primary/10 text-primary border-r-4 border-primary"
                                    : "text-text-muted hover:bg-slate-50 hover:text-text-main"
                                }`
                            }
                        >
                            <span className="text-2xl">{item.icon}</span>
                            <p className="md:block hidden font-medium">{item.name}</p>
                        </NavLink>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 overflow-y-auto max-h-[calc(100vh-73px)]">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default SellerLayout;
