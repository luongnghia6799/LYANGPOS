
import React, { useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Search, User, X, Plus, Check } from 'lucide-react';
import { usePartnerData } from '../queries/useProductData';
import { cn } from '../lib/utils';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';

export default function MobilePartnerSelector({ isOpen, onClose, onSelect, selectedPartner, type = 'Customer' }) {
    const { data: partnersData } = usePartnerData();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newPartnerName, setNewPartnerName] = useState('');

    const partners = partnersData || [];

    const filteredPartners = useMemo(() => {
        let res = partners;
        // Filter by type if needed (though API returns all?)
        // Usually partners table has type if distinguishing Supplier/Customer
        // For simplicity, we search all

        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            res = res.filter(p =>
                (p.name || '').toLowerCase().includes(s) ||
                (p.phone || '').includes(s)
            );
        }
        return res;
    }, [partners, searchTerm]);

    const handleCreatePartner = async () => {
        if (!newPartnerName.trim()) return;
        try {
            const res = await axios.post('/api/partners', {
                name: newPartnerName,
                phone: '',
                address: '',
                type: type // 'Customer' or 'Supplier'
            });
            await queryClient.invalidateQueries(['partners']);
            onSelect(res.data);
            onClose();
            setNewPartnerName('');
            setIsCreating(false);
        } catch (err) {
            console.error(err);
            alert('Lỗi tạo đối tác');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
                    />
                    <m.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 h-[80vh] bg-white dark:bg-slate-900 z-[70] rounded-t-3xl flex flex-col shadow-2xl"
                    >
                        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Chọn {type === 'Customer' ? 'Khách Hàng' : 'Nhà Cung Cấp'}</h3>
                            <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input
                                    autoFocus
                                    className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl py-2 pl-10 pr-4 outline-none font-medium text-gray-800 dark:text-gray-200"
                                    placeholder="Tìm tên hoặc SĐT..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2">
                            {/* Default option */}
                            <button
                                onClick={() => {
                                    onSelect(null);
                                    onClose();
                                }}
                                className={cn(
                                    "w-full p-4 rounded-xl flex items-center justify-between border transition-all",
                                    !selectedPartner
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-gray-300"
                                )}
                            >
                                <span className="font-bold">{type === 'Customer' ? 'Khách Lẻ' : 'NCC Vãng Lai'}</span>
                                {!selectedPartner && <Check size={18} />}
                            </button>

                            {/* Create New Prompt */}
                            {searchTerm && filteredPartners.length === 0 && !isCreating && (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full p-4 rounded-xl flex items-center gap-3 bg-blue-50 text-blue-600 border border-blue-100 font-bold"
                                >
                                    <Plus size={20} />
                                    Tạo mới "{searchTerm}"
                                </button>
                            )}

                            {/* Creating Form */}
                            {isCreating && (
                                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl space-y-3">
                                    <div className="font-bold text-sm">Tạo đối tác mới</div>
                                    <input
                                        className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                                        placeholder="Tên đối tác"
                                        value={newPartnerName || searchTerm}
                                        onChange={e => setNewPartnerName(e.target.value)}
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setIsCreating(false)} className="px-3 py-1.5 text-sm text-gray-500">Hủy</button>
                                        <button onClick={handleCreatePartner} className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg font-bold">Lưu</button>
                                    </div>
                                </div>
                            )}

                            {filteredPartners.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        onSelect(p);
                                        onClose();
                                    }}
                                    className={cn(
                                        "w-full p-4 rounded-xl flex items-center justify-between border transition-all text-left",
                                        selectedPartner?.id === p.id
                                            ? "bg-primary/10 border-primary text-primary"
                                            : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                                    )}
                                >
                                    <div>
                                        <div className="font-bold text-sm dark:text-gray-200">{p.name}</div>
                                        {p.phone && <div className="text-xs text-gray-400 mt-0.5">{p.phone}</div>}
                                    </div>
                                    {selectedPartner?.id === p.id && <Check size={18} />}
                                </button>
                            ))}
                        </div>
                    </m.div>
                </>
            )}
        </AnimatePresence>
    );
}
