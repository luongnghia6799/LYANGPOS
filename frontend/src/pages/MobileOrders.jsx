
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { m, AnimatePresence } from 'framer-motion';
import { Clock, User, Menu, ListChecks, ChevronRight, Check, Filter } from 'lucide-react';
import { formatNumber } from '../lib/utils';
import MobileMenu from '../components/MobileMenu';
import { cn } from '../lib/utils';

export default function MobileOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [toast, setToast] = useState(null);
    const [filterStatus, setFilterStatus] = useState('Pending'); // 'Pending' or 'Completed'

    const fetchTodayOrders = async () => {
        setLoading(true);
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const day = now.getDate();

            // Note: status filter is handled locally for now
            const res = await axios.get(`/api/orders?type=Sale&year=${year}&month=${month}&day=${day}&limit=100`);
            setOrders(res.data.items || res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTodayOrders();
        const interval = setInterval(fetchTodayOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => (o.status || 'Pending') === filterStatus);
    }, [orders, filterStatus]);

    const handleMarkAsPicked = async () => {
        if (!selectedOrder) return;
        try {
            await axios.post(`/api/orders/${selectedOrder.id}/status`, { status: 'Completed' });

            setToast({ message: `Đã soạn xong đơn #${selectedOrder.display_id || selectedOrder.id}`, type: 'success' });

            // Optimistic update
            setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'Completed' } : o));

            setTimeout(() => setToast(null), 2000);
            setSelectedOrder(null);
        } catch (err) {
            setToast({ message: 'Lỗi cập nhật trạng thái', type: 'error' });
        }
    };

    const toggleFilter = () => {
        setFilterStatus(prev => prev === 'Pending' ? 'Completed' : 'Pending');
    };

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-50 dark:bg-slate-900 overflow-hidden">
            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            {/* Header */}
            <div className="bg-orange-500 p-4 text-white flex items-center justify-between shadow-md z-20">
                <button onClick={() => setIsMenuOpen(true)}>
                    <Menu size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="font-bold text-lg uppercase tracking-wider">Soạn Đơn</h1>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Hôm nay</span>
                        <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold",
                            filterStatus === 'Pending' ? "bg-red-500/30 text-red-100" : "bg-green-500/30 text-green-100"
                        )}>
                            {filterStatus === 'Pending' ? 'Chờ soạn' : 'Đã soạn'}
                        </span>
                    </div>
                </div>
                <button
                    onClick={toggleFilter}
                    className={cn(
                        "p-2 rounded-full transition-colors",
                        filterStatus === 'Completed' ? "bg-white/30" : "hover:bg-white/10"
                    )}
                >
                    <ListChecks size={24} />
                </button>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-8">
                {loading && orders.length === 0 && <div className="text-center py-10 text-gray-400">Đang tải...</div>}

                {!loading && filteredOrders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                        <Check size={48} className="mb-2" />
                        <p className="font-bold">Không có đơn hàng nào {filterStatus === 'Pending' ? 'cần soạn' : 'đã soạn'}</p>
                    </div>
                )}

                {filteredOrders.map(order => (
                    <m.div
                        key={order.id}
                        layoutId={`order-${order.id}`}
                        onClick={() => setSelectedOrder(order)}
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 active:scale-[0.98] transition-transform relative overflow-hidden"
                    >
                        {order.status === 'Completed' && (
                            <div className="absolute top-0 right-0 p-1 bg-green-500 text-white rounded-bl-lg">
                                <Check size={12} strokeWidth={4} />
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="font-bold text-gray-800 dark:text-gray-200">#{order.display_id || order.id}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                    <Clock size={12} />
                                    {new Date(order.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-black text-primary">{formatNumber(order.total_amount)}</div>
                                <div className="text-[10px] text-gray-400 uppercase font-bold">{order.payment_method}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-dashed border-gray-100 dark:border-slate-700 mt-2">
                            <User size={14} className="text-gray-400" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate pr-4">
                                {order.partner_name || 'Khách lẻ'}
                            </span>
                        </div>
                    </m.div>
                ))}
            </div>

            {/* Order Detail Popup */}
            <AnimatePresence>
                {selectedOrder && (
                    <m.div
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        className="fixed inset-0 bg-gray-50 dark:bg-slate-900 z-50 flex flex-col"
                    >
                        <div className="bg-white dark:bg-slate-800 p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
                            <button onClick={() => setSelectedOrder(null)} className="p-2 -ml-2 text-gray-500">
                                <ChevronRight size={24} className="rotate-180" />
                            </button>
                            <div className="text-center">
                                <div className="font-black text-lg">#{selectedOrder.display_id || selectedOrder.id}</div>
                                <div className="text-xs text-gray-500">{selectedOrder.partner_name || 'Khách lẻ'}</div>
                            </div>
                            <div className="w-8"></div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 pb-20">
                            <div className="space-y-4">
                                {selectedOrder.details.map((detail, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 flex items-center gap-4">
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center font-black text-primary text-lg">
                                            {detail.quantity}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-800 dark:text-gray-200 text-lg leading-snug">
                                                {detail.product_name}
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                {formatNumber(detail.price)} / {detail.unit}
                                            </div>
                                        </div>
                                        <label className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-slate-600 flex items-center justify-center has-[:checked]:bg-green-500 has-[:checked]:border-green-500 has-[:checked]:text-white transition-colors cursor-pointer">
                                            <input type="checkbox" className="hidden" />
                                            <Check size={16} />
                                        </label>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-500">Tổng tiền</span>
                                    <span className="font-bold text-xl">{formatNumber(selectedOrder.total_amount)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Ghi chú</span>
                                    <span className="font-medium">{selectedOrder.note || 'Không có'}</span>
                                </div>
                            </div>

                            {selectedOrder.status !== 'Completed' ? (
                                <button
                                    onClick={handleMarkAsPicked}
                                    className="w-full mt-6 bg-primary text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-primary/30 active:scale-95 transition-transform"
                                >
                                    Đã Soạn Xong
                                </button>
                            ) : (
                                <div className="w-full mt-6 bg-green-500/10 text-green-600 font-bold py-4 rounded-xl text-lg text-center border-2 border-green-500/20">
                                    ✓ Đã Soạn Xong
                                </div>
                            )}
                        </div>
                    </m.div>
                )}
            </AnimatePresence>

            {/* Toast Overlay */}
            <AnimatePresence>
                {toast && (
                    <m.div
                        initial={{ opacity: 0, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        className={cn(
                            "fixed top-20 left-1/2 px-6 py-3 rounded-full shadow-2xl z-[70] font-bold text-sm flex items-center gap-2",
                            toast.type === 'success' ? "bg-green-600 text-white" : "bg-red-500 text-white"
                        )}
                    >
                        <Check size={18} />
                        <span>{toast.message}</span>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
