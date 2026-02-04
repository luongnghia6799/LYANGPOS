
import React from 'react';
import { ShoppingCart, Package, ListChecks, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { m } from 'framer-motion';

export default function MobileBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { label: 'Bán hàng', icon: ShoppingCart, path: '/mobile-pos' },
        { label: 'Soạn đơn', icon: ListChecks, path: '/mobile-orders' },
        { label: 'Nhập hàng', icon: Package, path: '/mobile-purchase' },
        { label: 'Cài đặt', icon: Settings, path: '/mobile-settings' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-slate-800 z-[45] flex items-center justify-around px-2 safe-area-bottom">
            {navItems.map((item, idx) => {
                const isActive = location.pathname === item.path;
                return (
                    <button
                        key={idx}
                        onClick={() => navigate(item.path)}
                        className={cn(
                            "relative flex flex-col items-center justify-center w-full h-full gap-1 transition-all",
                            isActive ? "text-primary" : "text-gray-400 dark:text-gray-500"
                        )}
                    >
                        {isActive && (
                            <m.div
                                layoutId="nav-active-pill"
                                className="absolute -top-1 w-8 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                            />
                        )}
                        <item.icon size={22} className={cn("transition-transform", isActive ? "scale-110 stroke-[2.5]" : "scale-100")} />
                        <span className={cn("text-[10px] font-bold uppercase tracking-tight", isActive ? "opacity-100" : "opacity-80")}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
