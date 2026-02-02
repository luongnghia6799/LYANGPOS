import React, { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Lock, X, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import Portal from './Portal';

export default function PasswordConfirmModal({
    isOpen,
    title = "Xác nhận bảo mật",
    message = "Vui lòng nhập mật khẩu để tiếp tục",
    onConfirm,
    onCancel,
    placeholder = "Nhập mật khẩu...",
}) {
    const [password, setPassword] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(password);
    };

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
                                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 border text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800">
                                    <Lock size={32} />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">{title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium mb-6">
                                    {message}
                                </p>

                                <form onSubmit={handleSubmit} className="w-full">
                                    <input
                                        ref={inputRef}
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={placeholder}
                                        className="w-full p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-center text-gray-800 dark:text-white transition-all text-lg"
                                    />
                                </form>
                            </div>

                            <div className="p-6 bg-gray-50/50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex gap-3">
                                <button
                                    onClick={onCancel}
                                    className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 text-gray-400 dark:text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest border border-gray-200 dark:border-slate-700 hover:bg-gray-50 transition-all active:scale-95"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={() => onConfirm(password)}
                                    disabled={!password}
                                    className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Xác nhận
                                </button>
                            </div>
                        </m.div>
                    </div>
                )}
            </AnimatePresence>
        </Portal>
    );
}

