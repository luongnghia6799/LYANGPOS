
import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Home, Package, ShoppingCart, ListChecks, Settings, LogOut, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function MobileMenu({ isOpen, onClose }) {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { label: 'Bán Hàng', icon: ShoppingCart, path: '/mobile-pos' },
        { label: 'Nhập Hàng', icon: Package, path: '/mobile-purchase' },
        { label: 'Soạn Đơn', icon: ListChecks, path: '/mobile-orders' },
        { label: 'Trang Chủ Desktop', icon: Home, path: '/' },
        { label: 'Cài Đặt', icon: Settings, path: '/settings' },
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
                        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    />
                    <m.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col"
                    >
                        <div className="p-6 bg-primary text-white flex justify-between items-center shadow-lg">
                            <div>
                                <h2 className="font-black text-xl uppercase tracking-wider">Lyang Mobile</h2>
                                <p className="text-white/70 text-xs mt-1">Version 1.1</p>
                            </div>
                            <button onClick={onClose} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                                            "flex items-center gap-4 w-full p-4 rounded-xl transition-all font-bold text-sm",
                                            isActive
                                                ? "bg-primary/10 text-primary border border-primary/20"
                                                : "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200"
                                        )}
                                    >
                                        <item.icon size={22} className={cn(isActive ? "text-primary fill-current" : "text-gray-400")} />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-slate-800">
                            <button
                                onClick={() => {
                                    sessionStorage.removeItem('user');
                                    navigate('/welcome');
                                }}
                                className="flex items-center gap-4 w-full p-4 rounded-xl hover:bg-red-50 text-red-500 font-bold transition-colors"
                            >
                                <LogOut size={22} />
                                Đăng Xuất
                            </button>
                        </div>
                    </m.div>
                </>
            )}
        </AnimatePresence>
    );
}
