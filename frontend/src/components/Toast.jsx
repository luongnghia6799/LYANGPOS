import React, { useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

import Portal from './Portal';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    const savedCallback = React.useRef(onClose);

    useEffect(() => {
        savedCallback.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const timer = setTimeout(() => {
            savedCallback.current();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration]);

    return (
        <Portal>
            <m.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className={cn(
                    "fixed top-6 right-6 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl no-print",
                    type === 'success'
                        ? "bg-emerald-50/90 dark:bg-emerald-950/90 border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                        : "bg-rose-50/90 dark:bg-rose-950/90 border-rose-100 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                )}
            >
                {type === 'success' ? (
                    <div className="p-1.5 bg-emerald-500 rounded-lg text-white">
                        <CheckCircle size={20} />
                    </div>
                ) : (
                    <div className="p-1.5 bg-rose-500 rounded-lg text-white">
                        <AlertCircle size={20} />
                    </div>
                )}
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Thông báo</span>
                    <span className="font-bold text-sm">{message}</span>
                </div>
                <button
                    onClick={onClose}
                    className="ml-4 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                    <X size={16} />
                </button>
                <m.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: duration / 1000, ease: "linear" }}
                    className={cn(
                        "absolute bottom-0 left-0 h-1 rounded-full",
                        type === 'success' ? "bg-emerald-500" : "bg-rose-500"
                    )}
                />
            </m.div>
        </Portal>
    );
};

export default Toast;
