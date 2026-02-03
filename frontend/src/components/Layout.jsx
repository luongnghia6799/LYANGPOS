import {
    LayoutDashboard,
    ShoppingCart,
    Truck,
    History as HistoryIcon,
    Package,
    Users,
    LogOut,
    Wallet,
    Sun,
    Moon,
    Settings as SettingsIcon,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    LayoutTemplate,
    Sprout,
    Wheat,
    Droplets,
    Leaf,
    Coins,
    SprayCan,
    Calendar,
    Home,
    BookOpen,
    Power,
    Landmark
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { cn } from '../lib/utils';

const NavItem = ({ icon: Icon, label, path, active }) => (
    <div className="relative">
        <Link
            to={path}
            className={cn(
                "relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all duration-300 select-none",
                active
                    ? "text-white"
                    : "text-white/60 hover:text-white"
            )}
        >
            <m.div
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                transition={{ duration: 0.3 }}
            >
                <Icon size={18} className={cn("transition-colors duration-300", active ? "text-white" : "group-hover:text-white")} />
            </m.div>
            <span className="whitespace-nowrap tracking-tight">{label}</span>
        </Link>
        {active && (
            <m.div
                layoutId="nav-active-bg"
                className="absolute inset-0 bg-white/20 shadow-[0_0_10px_rgba(255,255,255,0.2)] backdrop-blur-md rounded-xl z-0"
                transition={{ type: "spring", stiffness: 800, damping: 45, mass: 0.3 }}
            />
        )}
        {!active && (
            <m.div
                className="absolute inset-0 bg-white/0 rounded-xl z-0"
                whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
                transition={{ duration: 0.1 }}
            />
        )}
    </div>
);

export default function Layout({ children }) {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [appTheme, setAppTheme] = useState(localStorage.getItem('app_theme') || 'agri');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('user_avatar') || '');
    const [isNavCollapsed, setIsNavCollapsed] = useState(localStorage.getItem('nav_collapsed') === 'true');
    const userMenuRef = useRef(null);
    const navigate = useNavigate();

    const MENU_ITEMS = [
        { icon: Home, label: "Tổng quan", path: "/" },
        { icon: Wheat, label: "Bán hàng (POS)", path: "/pos" },
        { icon: Truck, label: "Nhập hàng", path: "/purchase" },
        { icon: HistoryIcon, label: "Lịch sử", path: "/history" },
        { icon: Calendar, label: "Sổ Giao Dịch", path: "/summary" },
        { icon: SprayCan, label: "Tổng Hợp", path: "/analysis" },
        { icon: Leaf, label: "Báo cáo", path: "/reports" },
        { icon: Sprout, label: "Danh mục", path: "/products" },
        { icon: Droplets, label: "Đối tác", path: "/partners" },
        { icon: Coins, label: "Quỹ tiền", path: "/vouchers" },
        { icon: Landmark, label: "Tài khoản", path: "/banking" },
        { icon: LayoutTemplate, label: "Thiết kế hóa đơn", path: "/invoice-designer" },
    ];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', appTheme);
        localStorage.setItem('app_theme', appTheme);
    }, [appTheme]);

    useEffect(() => {
        localStorage.setItem('nav_collapsed', isNavCollapsed);
    }, [isNavCollapsed]);

    useEffect(() => {
        const checkUpdates = () => {
            const url = localStorage.getItem('user_avatar');
            if (url !== avatarUrl) setAvatarUrl(url || '');
        };
        const interval = setInterval(checkUpdates, 2000);
        return () => clearInterval(interval);
    }, [avatarUrl]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const handleLogout = () => {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        navigate('/welcome');
    };

    // Keyboard Shortcuts for switching tabs
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && (e.key === 'PageUp' || e.key === 'PageDown')) {
                e.preventDefault();
                const currentIndex = MENU_ITEMS.findIndex(item => item.path === location.pathname);
                if (currentIndex === -1) return;

                let nextIndex;
                if (e.key === 'PageDown') {
                    nextIndex = (currentIndex + 1) % MENU_ITEMS.length;
                } else {
                    nextIndex = (currentIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
                }
                navigate(MENU_ITEMS[nextIndex].path);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [location.pathname, navigate]);

    const sharedTransition = {
        type: "spring",
        stiffness: 260,
        damping: 32,
        mass: 1
    };

    return (
        <div className="flex flex-col h-screen w-full main-content-bg overflow-hidden print:h-auto print:overflow-visible print:block selection:bg-blue-100 dark:selection:bg-blue-900 transition-colors">
            {/* Nav Restore Handle - Only visible when collapsed */}
            <AnimatePresence>
                {isNavCollapsed && (
                    <m.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="fixed top-0 left-1/2 -translate-x-1/2 z-[600] print:hidden"
                    >
                        <button
                            onClick={() => setIsNavCollapsed(false)}
                            className="bg-primary/80 backdrop-blur-md text-white px-6 py-1.5 rounded-b-2xl shadow-xl border border-white/20 border-t-0 hover:bg-primary transition-all flex items-center gap-2 group"
                        >
                            <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                            <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Hiện Menu</span>
                        </button>
                    </m.div>
                )}
            </AnimatePresence>

            {/* Top Navigation Bar */}
            <m.header
                initial={false}
                animate={{
                    y: isNavCollapsed ? -120 : 0,
                    opacity: isNavCollapsed ? 0 : 1,
                    height: isNavCollapsed ? 0 : 'auto',
                }}
                transition={sharedTransition}
                className="z-[500] print:hidden"
            >
                <div className="px-6 py-3">
                    <nav className="w-full flex items-center justify-between gap-4 px-8 py-3 rounded-2xl border border-white/10 top-nav-gradient shadow-2xl backdrop-blur-md relative">
                        {/* Logo */}
                        <m.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-4"
                        >
                            <Link to="/" className="flex items-center gap-3 shrink-0">
                                <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-2xl" />
                                <div className="flex flex-col">
                                    <h1 className="text-xl font-black text-white tracking-tight leading-none text-glow">LyangPOS</h1>
                                    <span className="text-[8px] text-white/70 font-bold tracking-widest uppercase">BY LYANG NGHĨA</span>
                                </div>
                            </Link>
                        </m.div>

                        {/* Menu Items - Scrollable if too many */}
                        <div className="flex-1 overflow-hidden">
                            <m.div
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.01
                                        }
                                    }
                                }}
                                className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth"
                            >
                                {MENU_ITEMS.map((item) => (
                                    <m.div
                                        key={item.path}
                                        variants={{
                                            hidden: { opacity: 0 },
                                            visible: { opacity: 1 }
                                        }}
                                        transition={{ duration: 0.1 }}
                                    >
                                        <NavItem
                                            icon={item.icon}
                                            label={item.label}
                                            path={item.path}
                                            active={isActive(item.path)}
                                        />
                                    </m.div>
                                ))}
                            </m.div>
                        </div>

                        {/* Right Side Actions */}
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                            {/* Theme Toggle Buttons */}
                            <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1 border border-white/10 backdrop-blur-sm shadow-inner group">
                                <m.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setAppTheme('agri')}
                                    className={cn(
                                        "w-6 h-6 rounded-lg transition-all duration-300 relative",
                                        appTheme === 'agri' ? "bg-white shadow-[0_0_15px_rgba(255,255,255,0.6)]" : "bg-[#2d5016] opacity-50 hover:opacity-80"
                                    )}
                                    title="Vụ Mùa (Xanh)"
                                >
                                    {appTheme === 'agri' && (
                                        <m.div layoutId="theme-dot" className="absolute inset-0 border-2 border-[#2d5016] rounded-lg" />
                                    )}
                                </m.button>
                                <m.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setAppTheme('luxury')}
                                    className={cn(
                                        "w-6 h-6 rounded-lg transition-all duration-300 relative",
                                        appTheme === 'luxury' ? "bg-white shadow-[0_0_15px_rgba(255,255,255,0.6)]" : "bg-[#A67C00] opacity-50 hover:opacity-80"
                                    )}
                                    title="Luxury (Vàng Gold)"
                                >
                                    {appTheme === 'luxury' && (
                                        <m.div layoutId="theme-dot" className="absolute inset-0 border-2 border-[#A67C00] rounded-lg" />
                                    )}
                                </m.button>
                            </div>

                            <m.button
                                whileHover={{ scale: 1.1, rotate: 15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={toggleTheme}
                                className="p-2 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all shadow-sm relative overflow-hidden group"
                                title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
                            >
                                <AnimatePresence mode="wait" initial={false}>
                                    <m.div
                                        key={theme}
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -20, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                                    </m.div>
                                </AnimatePresence>
                            </m.button>

                            {/* User Menu */}
                            <div className="relative" ref={userMenuRef}>
                                <m.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-2 p-1 pl-1 pr-3 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-all group shadow-lg"
                                >
                                    <m.div
                                        whileHover={{ rotate: 5 }}
                                        className="w-8 h-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white font-black overflow-hidden shadow-md"
                                    >
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            JSON.parse(sessionStorage.getItem('user') || '{}').display_name?.charAt(0) || <Users size={18} />
                                        )}
                                    </m.div>
                                    <span className="text-sm font-black text-white hidden sm:block">
                                        {JSON.parse(sessionStorage.getItem('user') || '{}').display_name?.split(' ')[0] || 'User'}
                                    </span>
                                    <m.div
                                        animate={{ rotate: showUserMenu ? 180 : 0 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    >
                                        <SettingsIcon size={14} className="text-white/40 group-hover:text-white transition-colors" />
                                    </m.div>
                                </m.button>

                                <AnimatePresence>
                                    {showUserMenu && (
                                        <m.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute top-full right-0 mt-3 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden p-2 z-[600]"
                                        >
                                            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
                                                <p className="font-black text-slate-800 dark:text-white truncate">{JSON.parse(sessionStorage.getItem('user') || '{}').display_name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">@{JSON.parse(sessionStorage.getItem('user') || '{}').username}</p>
                                            </div>
                                            <div className="space-y-1 mt-1">
                                                <Link to="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 font-bold text-sm">
                                                    <SettingsIcon size={18} />
                                                    <span>Cài đặt hệ thống</span>
                                                </Link>
                                                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Bạn có chắc chắn muốn thoát ứng dụng và TẮT SERVER không?')) {
                                                            axios.post('/api/shutdown').catch(() => { });
                                                            setTimeout(() => window.close(), 500);
                                                        }
                                                    }}
                                                    className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 font-black text-sm"
                                                >
                                                    <Power size={18} />
                                                    <span>Thoát ứng dụng</span>
                                                </button>
                                                <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 font-bold text-sm">
                                                    <LogOut size={18} />
                                                    <span>Đăng xuất</span>
                                                </button>
                                            </div>
                                        </m.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <m.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setIsNavCollapsed(true)}
                                className="p-2 rounded-xl text-white/50 hover:bg-white/20 hover:text-white transition-all border border-white/5 hover:border-white/20"
                                title="Thu gọn menu"
                            >
                                <ChevronUp size={20} />
                            </m.button>
                        </div>
                    </nav>
                </div>
            </m.header>

            {/* Main Content Area */}
            <m.main
                layout
                id="main-content"
                className="flex-1 overflow-auto relative z-0 print:overflow-visible print:h-auto print:static selection:bg-primary/10"
                transition={sharedTransition}
            >
                {children}
            </m.main>
        </div>
    );
}
