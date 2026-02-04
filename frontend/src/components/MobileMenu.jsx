
import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Home, Package, ShoppingCart, ListChecks, Settings, LogOut, X, Box } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function MobileMenu({ isOpen, onClose }) {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { label: 'Bán Hàng', icon: ShoppingCart, path: '/mobile-pos' },
        { label: 'Nhập Hàng', icon: Package, path: '/mobile-purchase' },
        { label: 'Soạn Đơn', icon: ListChecks, path: '/mobile-orders' },
        { label: 'Cài Đặt', icon: Settings, path: '/mobile-settings' },
        { label: 'Giao diện Máy tính', icon: Home, path: '/', sub: 'Dành cho quản lý' },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 z-[60] backdrop-blur-md"
                    />
                    <m.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[300px] bg-white dark:bg-slate-950 z-[70] shadow-2xl flex flex-col rounded-r-[2.5rem] overflow-hidden border-r border-gray-100 dark:border-slate-800"
                    >
                        {/* Drawer Header */}
                        <div className="p-8 pb-6 flex flex-col">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-primary/10 rounded-2xl">
                                    <Box className="text-primary" size={24} />
                                </div>
                                <button onClick={onClose} className="p-2 text-gray-400">
                                    <X size={20} />
                                </button>
                            </div>
                            <h2 className="font-black text-2xl tracking-tighter text-gray-800 dark:text-gray-100">LYANG <span className="text-primary">POS</span></h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Smart Farming Solutions</p>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                            {menuItems.map((item, idx) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            navigate(item.path);
                                            onClose();
                                        }}
                                        className={cn(
                                            "flex items-center gap-4 w-full p-4 rounded-2xl transition-all relative overflow-hidden group",
                                            isActive
                                                ? "bg-primary text-white shadow-xl shadow-primary/30"
                                                : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 border border-transparent hover:border-gray-100 dark:hover:border-white/10"
                                        )}
                                    >
                                        <item.icon size={20} className={cn(isActive ? "text-white" : "text-gray-400 group-hover:text-primary")} />
                                        <div className="flex flex-col items-start">
                                            <span className="font-black text-xs uppercase tracking-wider">{item.label}</span>
                                            {item.sub && <span className={cn("text-[8px] font-bold opacity-60 uppercase tracking-tighter", isActive ? "text-white" : "text-gray-400")}>{item.sub}</span>}
                                        </div>
                                        {isActive && (
                                            <m.div
                                                layoutId="menu-active"
                                                className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-slate-900">
                            <button
                                onClick={() => {
                                    sessionStorage.removeItem('user');
                                    navigate('/welcome');
                                }}
                                className="flex items-center gap-4 w-full p-4 rounded-2xl text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut size={20} />
                                Đăng Xuất
                            </button>
                            <div className="mt-4 text-center">
                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Build 2024.02.04.A</span>
                            </div>
                        </div>
                    </m.div>
                </>
            )}
        </AnimatePresence>
    );
}
