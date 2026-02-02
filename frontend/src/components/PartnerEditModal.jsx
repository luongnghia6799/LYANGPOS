import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { m } from 'framer-motion';
import { X, User, Phone, MapPin, CreditCard } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import Toast from './Toast';

import Portal from './Portal';

export default function PartnerEditModal({ partner, isOpen, onClose, onSave }) {
    const DEFAULT_PARTNER = {
        name: '',
        is_customer: true,
        is_supplier: false,
        cccd: '',
        phone: '',
        address: '',
        debt_balance: 0
    };

    const [formData, setFormData] = useState(DEFAULT_PARTNER);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (isOpen) {
            if (partner) {
                setFormData(prev => {
                    if (partner.id && prev.id === partner.id) return prev;
                    return { ...DEFAULT_PARTNER, ...partner };
                });
            } else {
                setFormData(DEFAULT_PARTNER);
            }
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            const mainContent = document.getElementById('main-content');
            if (mainContent) mainContent.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            const mainContent = document.getElementById('main-content');
            if (mainContent) mainContent.style.overflow = 'auto';
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
            const mainContent = document.getElementById('main-content');
            if (mainContent) mainContent.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (partner?.id) {
                await axios.put(`/api/partners/${partner.id}`, formData);
            } else {
                await axios.post('/api/partners', formData);
            }
            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            setToast({ message: err.response?.data?.error || "Lỗi khi lưu đối tác.", type: "error" });
        }
    };

    return (
        <Portal>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-y-auto">
                        <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={onClose}
                        />
                        <m.div
                            initial={{ opacity: 0, scale: 0.9, y: 20, rotateX: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10, filter: 'blur(4px)' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200, mass: 0.8 }}
                            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 border dark:border-slate-800 transition-colors my-auto relative z-10"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tighter">
                                    {partner?.id ? 'Sửa thông tin đối tác' : 'Thêm đối tác mới'}
                                </h2>
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-400">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="flex gap-4 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                                    <label className="flex-1 flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded-lg border-2 border-emerald-200 text-emerald-600 focus:ring-emerald-500"
                                            checked={formData.is_customer}
                                            onChange={e => setFormData({ ...formData, is_customer: e.target.checked })}
                                        />
                                        <span className="text-sm font-black uppercase text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-600">Khách Hàng</span>
                                    </label>
                                    <label className="flex-1 flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded-lg border-2 border-emerald-200 text-emerald-600 focus:ring-emerald-500"
                                            checked={formData.is_supplier}
                                            onChange={e => setFormData({ ...formData, is_supplier: e.target.checked })}
                                        />
                                        <span className="text-sm font-black uppercase text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-600">Nhà Cung Cấp</span>
                                    </label>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Tên đối tác</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" size={20} />
                                            <input
                                                required
                                                type="text"
                                                className="input-premium w-full pr-4 py-3.5 font-black uppercase"
                                                style={{ paddingLeft: '3.5rem' }}
                                                placeholder="VÍ DỤ: NGUYỄN VĂN A"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Số CCCD</label>
                                            <div className="relative">
                                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" size={20} />
                                                <input
                                                    type="text"
                                                    className="input-premium w-full pr-4 py-3.5 font-bold"
                                                    style={{ paddingLeft: '3.5rem' }}
                                                    placeholder="Số thẻ căn cước"
                                                    value={formData.cccd || ''}
                                                    onChange={e => setFormData({ ...formData, cccd: e.target.value })}
                                                    autoComplete="off"
                                                />
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Điện thoại</label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" size={20} />
                                                <input
                                                    type="text"
                                                    className="input-premium w-full pr-4 py-3.5 font-bold"
                                                    style={{ paddingLeft: '3.5rem' }}
                                                    placeholder="Số điện thoại"
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    autoComplete="off"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Địa chỉ</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" size={20} />
                                            <input
                                                type="text"
                                                className="input-premium w-full pr-4 py-3.5 font-bold"
                                                style={{ paddingLeft: '3.5rem' }}
                                                placeholder="Địa chỉ liên hệ"
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Công nợ ban đầu</label>
                                        <input
                                            type="number"
                                            className="input-premium w-full p-4 font-black text-blue-600 dark:text-blue-400"
                                            value={formData.debt_balance}
                                            onChange={e => setFormData({ ...formData, debt_balance: parseFloat(e.target.value) || 0 })}
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-8 pt-4 border-t dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-8 py-3.5 text-gray-400 font-black uppercase text-xs hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-10 py-3.5 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all"
                                    >
                                        Lưu đối tác
                                    </button>
                                </div>
                            </form>
                        </m.div>
                    </div>
                )}
                <AnimatePresence>
                    {toast && (
                        <Toast
                            message={toast.message}
                            type={toast.type}
                            onClose={() => setToast(null)}
                        />
                    )}
                </AnimatePresence>
            </AnimatePresence>
        </Portal>
    );
}
