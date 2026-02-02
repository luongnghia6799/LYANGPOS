import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

import Portal from './Portal';

export default function ConfirmModal({
    isOpen,
    title = "Xác nhận",
    message,
    onConfirm,
    onCancel,
    confirmText = "Xác nhận",
    cancelText = "Hủy bỏ",
    type = "warning" // warning, danger, info
}) {
    const colors = {
        warning: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        danger: "text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800",
        info: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    };

    const btnColors = {
        warning: "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20",
        danger: "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20",
        info: "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20",
    }

    return (
        <Portal>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <m.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white dark:border-slate-800 flex flex-col"
                        >
                            <div className="p-6 flex flex-col items-center text-center">
                                <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center mb-4 border", colors[type])}>
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">{title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                                    {message}
                                </p>
                            </div>

                            <div className="p-6 bg-gray-50/50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex gap-3">
                                <button
                                    onClick={onCancel}
                                    className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 text-gray-400 dark:text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest border border-gray-200 dark:border-slate-700 hover:bg-gray-50 transition-all active:scale-95"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className={cn("flex-1 px-4 py-3 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95", btnColors[type])}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </m.div>
                    </div>
                )}
            </AnimatePresence>
        </Portal>
    );
}
