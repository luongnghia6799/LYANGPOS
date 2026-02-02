import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { m, AnimatePresence } from 'framer-motion';
import { History, ShoppingBag, Clock, X, ChevronRight, Package, Calendar } from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '../lib/utils';
import { cn } from '../lib/utils';

export default function POSHistoryPanel({ partner, isOpen, onClose, onAddToCart }) {
    const [orders, setOrders] = useState([]);
    const [boughtProducts, setBoughtProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('invoices'); // invoices, products

    useEffect(() => {
        if (isOpen && partner) {
            fetchHistory();
        }
    }, [isOpen, partner]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/orders?partner_id=${partner.id}&limit=10&type=Sale`);
            const items = res.data.items || res.data;
            setOrders(items);

            // Extract unique products
            const productMap = {};
            items.forEach(order => {
                order.details.forEach(detail => {
                    if (!productMap[detail.product_id]) {
                        productMap[detail.product_id] = {
                            id: detail.product_id,
                            name: detail.product_name,
                            unit: detail.product_unit,
                            price: detail.price,
                            total_qty: 0,
                            last_price: detail.price,
                            last_date: order.date,
                            multiplier: detail.multiplier,
                            secondary_unit: detail.secondary_unit,
                            stock: detail.stock
                        };
                    }
                    productMap[detail.product_id].total_qty += detail.quantity;
                    if (new Date(order.date) > new Date(productMap[detail.product_id].last_date)) {
                        productMap[detail.product_id].last_date = order.date;
                        productMap[detail.product_id].last_price = detail.price;
                    }
                });
            });
            setBoughtProducts(Object.values(productMap).sort((a, b) => b.total_qty - a.total_qty));
        } catch (err) {
            console.error("Error fetching POS history:", err);
        } finally {
            setLoading(false);
        }
    };

    const [expandedOrders, setExpandedOrders] = useState({}); // {orderId: boolean}

    const toggleOrderExpansion = (orderId) => {
        setExpandedOrders(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[5000] flex justify-end">
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
                    />
                    <m.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="relative w-[400px] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-primary/20"
                    >
                        {/* Header */}
                        <div className="p-6 border-b dark:border-slate-800 bg-gradient-to-r from-primary/5 to-transparent flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                    <History size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-gray-800 dark:text-gray-100 uppercase tracking-tighter leading-none">Lịch sử khách hàng</h3>
                                    <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mt-1">{partner.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-gray-400 hover:text-rose-500 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex p-4 gap-2">
                            <button
                                onClick={() => setActiveTab('invoices')}
                                className={cn(
                                    "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                    activeTab === 'invoices'
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700"
                                )}
                            >
                                <Clock size={16} /> Hóa đơn
                            </button>
                            <button
                                onClick={() => setActiveTab('products')}
                                className={cn(
                                    "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                    activeTab === 'products'
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700"
                                )}
                            >
                                <ShoppingBag size={16} /> Sản phẩm
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                                    <span className="font-black text-[10px] uppercase tracking-[0.2em]">Đang tải...</span>
                                </div>
                            ) : activeTab === 'invoices' ? (
                                orders.length === 0 ? (
                                    <div className="text-center py-20 text-gray-300 dark:text-slate-700">
                                        <Clock size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black uppercase text-xs tracking-widest">Chưa có hóa đơn nào</p>
                                    </div>
                                ) : (
                                    orders.map((order, idx) => {
                                        const isExpanded = expandedOrders[order.id];
                                        const displayedDetails = isExpanded ? order.details : order.details.slice(0, 3);

                                        return (
                                            <m.div
                                                key={order.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-transparent hover:border-primary/20 transition-all group"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="text-xs font-black text-primary uppercase">#{order.display_id || order.id}</div>
                                                        <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <Calendar size={10} /> {formatDate(order.date)}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-black text-gray-800 dark:text-gray-100">{formatNumber(order.total_amount)}</div>
                                                        <div className={cn(
                                                            "text-[9px] font-black uppercase px-1.5 py-0.5 rounded ml-auto w-fit mt-1",
                                                            order.payment_method === 'Debt' ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                                                        )}>
                                                            {order.payment_method === 'Debt' ? 'Nợ' : 'Tiền mặt'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-1 bg-white/50 dark:bg-slate-900/50 p-2 rounded-xl">
                                                    {displayedDetails.map((d, i) => (
                                                        <div key={i} className="text-[10px] flex justify-between text-gray-600 dark:text-gray-400">
                                                            <span className="truncate flex-1 pr-2 uppercase font-bold">• {d.product_name}</span>
                                                            <span className="font-black">x{formatNumber(d.quantity)}</span>
                                                        </div>
                                                    ))}
                                                    {order.details.length > 3 && (
                                                        <button
                                                            onClick={() => toggleOrderExpansion(order.id)}
                                                            className="text-[9px] text-primary font-bold italic w-full text-left pt-1"
                                                        >
                                                            {isExpanded ? "Thu gọn" : `... và ${order.details.length - 3} sản phẩm khác`}
                                                        </button>
                                                    )}
                                                </div>
                                            </m.div>
                                        );
                                    })
                                )
                            ) : (
                                boughtProducts.length === 0 ? (
                                    <div className="text-center py-20 text-gray-300 dark:text-slate-700">
                                        <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black uppercase text-xs tracking-widest">Chưa mua sản phẩm nào</p>
                                    </div>
                                ) : (
                                    boughtProducts.map((p, idx) => (
                                        <m.div
                                            key={p.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-transparent hover:border-primary/20 transition-all group flex items-center justify-between"
                                        >
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="font-black text-xs text-gray-800 dark:text-gray-100 uppercase truncate" title={p.name}>{p.name}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black text-primary tabular-nums">Đã mua: {formatNumber(p.total_qty)} {p.unit}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                    <span className="text-[10px] font-bold text-gray-400">Giá gần nhất: {formatNumber(p.last_price)}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onAddToCart(p)}
                                                className="w-10 h-10 bg-white dark:bg-slate-700 text-primary hover:bg-primary hover:text-white rounded-xl shadow-sm flex items-center justify-center transition-all active:scale-90"
                                                title="Thêm vào giỏ"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        </m.div>
                                    ))
                                )
                            )}
                        </div>

                        {/* Footer Info */}
                        <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-t dark:border-slate-800">
                            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tổng dự nợ hiện tại</span>
                                    <span className="p-1 px-2 bg-rose-100 text-rose-600 rounded text-[9px] font-black uppercase">Đang nợ</span>
                                </div>
                                <div className="text-2xl font-black text-rose-500 tracking-tighter tabular-nums">
                                    {formatNumber(partner.debt_balance)} <span className="text-xs">VNĐ</span>
                                </div>
                            </div>
                        </div>
                    </m.div>
                </div>
            )}
        </AnimatePresence>
    );
}
