import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { m, AnimatePresence } from 'framer-motion';
import { Clock, User, Menu, ListChecks, ChevronLeft, Check, Filter, Layers, ArrowRight } from 'lucide-react';
import { formatNumber } from '../lib/utils';
import MobileMenu from '../components/MobileMenu';
import { cn } from '../lib/utils';

export default function MobileOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [toast, setToast] = useState(null);
    const [filterStatus, setFilterStatus] = useState('Pending');

    const fetchTodayOrders = async () => {
        setLoading(true);
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const day = now.getDate();
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
            await axios.patch(`/api/orders/${selectedOrder.id}/status`, { status: 'Completed' });
            setToast({ message: `Đã soạn xong đơn #${selectedOrder.display_id || selectedOrder.id}`, type: 'success' });
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
        <div className="h-[100dvh] flex flex-col bg-gray-50 dark:bg-slate-950 overflow-hidden">
            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            {/* Glass Header */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 p-4 flex items-center justify-between z-20">
                <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 text-gray-500">
                    <Menu size={24} />
                </button>
                <div className="flex flex-col items-center flex-1">
                    <h1 className="font-black text-sm uppercase tracking-[0.2em] text-orange-500">SOẠN ĐƠN</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            filterStatus === 'Pending' ? "bg-red-500 animate-pulse" : "bg-green-500"
                        )}></span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            {filterStatus === 'Pending' ? 'Đang chờ soạn' : 'Đã soạn xong'}
                        </span>
                    </div>
                </div>
                <button
                    onClick={toggleFilter}
                    className={cn(
                        "p-2.5 rounded-xl transition-all shadow-sm",
                        filterStatus === 'Completed' ? "bg-green-500 text-white shadow-green-500/20" : "bg-orange-500 text-white shadow-orange-500/20"
                    )}
                >
                    <Filter size={20} />
                </button>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
                {loading && orders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Đang tải dữ liệu...</span>
                    </div>
                )}

                {!loading && filteredOrders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30 grayscale">
                        <Layers size={64} strokeWidth={1} className="mb-4" />
                        <p className="font-black text-sm uppercase tracking-widest">Trống trơn</p>
                    </div>
                )}

                {filteredOrders.sort((a, b) => b.id - a.id).map(order => (
                    <m.div
                        key={order.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setSelectedOrder(order)}
                        className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-active:opacity-100 transition-opacity">
                            <ArrowRight size={20} />
                        </div>

                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="font-black text-gray-800 dark:text-gray-100 text-xl tracking-tight">#{order.display_id || order.id}</div>
                                <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5 mt-1">
                                    <Clock size={12} className="text-orange-500" />
                                    {new Date(order.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-black text-orange-500 text-lg leading-none">{formatNumber(order.total_amount)}</div>
                                <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1 opacity-50">{order.payment_method}</div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-dashed border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                    <User size={14} className="text-gray-400" />
                                </div>
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300 truncate">
                                    {order.partner_name || 'Khách lẻ'}
                                </span>
                            </div>
                        </div>
                    </m.div>
                ))}
            </div>

            {/* Order Detail Modal (Full Screen Glass) */}
            <AnimatePresence>
                {selectedOrder && (
                    <m.div
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        className="fixed inset-0 bg-white dark:bg-slate-950 z-[100] flex flex-col"
                    >
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 p-4 sticky top-0 z-10 flex items-center justify-between">
                            <button onClick={() => setSelectedOrder(null)} className="p-2 -ml-2 text-gray-400 active:scale-95 transition-transform">
                                <ChevronLeft size={32} />
                            </button>
                            <div className="text-center flex-1">
                                <div className="font-black text-lg text-orange-500 tracking-tighter">ĐƠN HÀNG #{selectedOrder.display_id || selectedOrder.id}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase truncate px-4">{selectedOrder.partner_name || 'Khách lẻ'}</div>
                            </div>
                            <div className="w-8"></div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Danh sách mặt hàng</div>
                            {selectedOrder.details.map((detail, idx) => (
                                <m.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-center gap-4"
                                >
                                    <div className="w-12 h-12 bg-orange-500 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-orange-500/20">
                                        {detail.quantity}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-gray-800 dark:text-gray-100 text-base leading-tight break-words">
                                            {detail.product_name}
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                                            {formatNumber(detail.price)} / {detail.unit}
                                        </div>
                                    </div>
                                    <label className="flex-shrink-0 relative">
                                        <input type="checkbox" className="peer hidden" />
                                        <div className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-slate-700 peer-checked:bg-green-500 peer-checked:border-green-500 transition-all flex items-center justify-center text-transparent peer-checked:text-white">
                                            <Check size={18} strokeWidth={4} />
                                        </div>
                                    </label>
                                </m.div>
                            ))}

                            <div className="mt-8 bg-gray-900 dark:bg-orange-500/10 p-6 rounded-3xl text-white dark:text-orange-500 shadow-xl overflow-hidden relative">
                                <div className="absolute -right-4 -bottom-4 opacity-10">
                                    <ShoppingCart size={120} />
                                </div>
                                <div className="flex justify-between items-center relative z-10">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Tổng thanh toán</span>
                                    <span className="font-black text-2xl">{formatNumber(selectedOrder.total_amount)}</span>
                                </div>
                                {selectedOrder.note && (
                                    <div className="mt-4 pt-4 border-t border-white/10 dark:border-orange-500/20 relative z-10">
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Ghi chú</div>
                                        <div className="font-bold text-sm italic">"{selectedOrder.note}"</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 safe-area-bottom bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800">
                            {selectedOrder.status !== 'Completed' ? (
                                <button
                                    onClick={handleMarkAsPicked}
                                    className="w-full bg-orange-500 text-white font-black py-5 rounded-2xl text-base uppercase tracking-[0.2em] shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                >
                                    <span>Đã soạn xong</span>
                                    <Check size={20} strokeWidth={3} />
                                </button>
                            ) : (
                                <div className="w-full bg-green-500/10 text-green-500 font-black py-5 rounded-2xl text-base uppercase tracking-[0.2em] text-center border-2 border-green-500/20 flex items-center justify-center gap-2">
                                    <Check size={20} strokeWidth={4} />
                                    <span>Hoàn tất</span>
                                </div>
                            )}
                        </div>
                    </m.div>
                )}
            </AnimatePresence>

            {/* Premium Toast Container */}
            <AnimatePresence>
                {toast && (
                    <m.div
                        initial={{ opacity: 0, scale: 0.8, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, scale: 0.8, y: -20, x: '-50%' }}
                        className={cn(
                            "fixed top-24 left-1/2 px-8 py-3 rounded-full shadow-2xl z-[110] font-bold text-xs flex items-center gap-2",
                            toast.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
                        )}
                    >
                        <Check size={16} strokeWidth={4} />
                        <span>{toast.message}</span>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
