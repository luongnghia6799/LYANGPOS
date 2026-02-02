import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { m, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, Plus, Search, User, CreditCard, FileText, ShoppingCart, Info } from 'lucide-react';
import { formatNumber, formatDate, cn } from '../lib/utils';
import ProductEditModal from './ProductEditModal';
import Toast from './Toast';
import Portal from './Portal';

export default function OrderEditPopup({ order, partner, onClose, onSave }) {
    const [cart, setCart] = useState(order.details.map(d => ({
        ...d,
        product_id: d.product_id,
        quantity: d.quantity,
        price: d.price,
        unit: d.product_unit,
        secondary_unit: d.secondary_unit,
        multiplier: d.multiplier || 1,
        secondary_qty: d.quantity / (d.multiplier || 1)
    })));
    const [note, setNote] = useState(order.note || '');
    const [amountPaid, setAmountPaid] = useState(order.amount_paid || 0);
    const [paymentMethod, setPaymentMethod] = useState(order.payment_method || (order.amount_paid >= order.total_amount ? 'Cash' : 'Debt'));
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [toast, setToast] = useState(null);

    const totalAmount = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const fetchProducts = async () => {
        try {
            const res = await axios.get('/api/products');
            setProducts(res.data);
        } catch (err) { console.error(err); }
    };

    const updateItem = (idx, field, value) => {
        const newCart = [...cart];
        const item = newCart[idx];
        if (field === 'secondary_qty') {
            item.secondary_qty = value;
            item.quantity = value * item.multiplier;
        } else if (field === 'quantity') {
            item.quantity = value;
            item.secondary_qty = value / item.multiplier;
        } else {
            item[field] = value;
        }
        setCart(newCart);
    };

    const removeItem = (idx) => {
        setCart(cart.filter((_, i) => i !== idx));
    };

    const handleSave = async () => {
        if (cart.length === 0) return;
        setLoading(true);
        try {
            const data = {
                partner_id: order.partner_id,
                type: order.type,
                payment_method: paymentMethod,
                details: cart.map(d => ({
                    product_id: d.product_id,
                    quantity: d.quantity,
                    price: d.price,
                    product_name: d.product_name
                })),
                note,
                amount_paid: amountPaid
            };
            await axios.put(`/api/orders/${order.id}`, data);
            onSave();
        } catch (err) {
            setToast({ message: err.response?.data?.error || "Lỗi khi lưu", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = useMemo(() => {
        const s = searchTerm.toLowerCase();
        if (!s) return [];
        return products.filter(p => p.name.toLowerCase().includes(s) || (p.code && p.code.toLowerCase().includes(s))).slice(0, 10);
    }, [products, searchTerm]);

    const addToCart = (p) => {
        setCart([{
            product_id: p.id,
            product_name: p.name,
            product_unit: p.unit,
            secondary_unit: p.secondary_unit,
            multiplier: p.multiplier,
            quantity: 1,
            secondary_qty: 1 / (p.multiplier || 1),
            price: order.type === 'Sale' ? p.sale_price : p.cost_price
        }, ...cart]);
        setSearchTerm('');
        setIsProductDropdownOpen(false);
        setActiveIndex(0);

        // Auto focus the new row's quantity
        setTimeout(() => {
            const sec = document.getElementById(`edit-sec-qty-0`);
            if (sec && p.secondary_unit) {
                sec.focus();
                sec.select();
            } else {
                const main = document.getElementById(`edit-main-qty-0`);
                main?.focus();
                main?.select();
            }
        }, 200);
    };
    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-y-auto bg-slate-900/40 backdrop-blur-sm" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100000 }}>
            <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <m.div
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                className="relative bg-white dark:bg-slate-950 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col z-10"
            >
                {/* Header */}
                <div className="p-6 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-2xl", order.type === 'Sale' ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600")}>
                            {order.type === 'Sale' ? <ShoppingCart size={24} /> : <FileText size={24} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                Chi Tiết Hóa Đơn #{order.display_id}
                            </h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {order.type === 'Sale' ? 'Bán hàng' : 'Nhập hàng'} • Đối tác: {order.partner_name || partner?.name || 'Khách Lẻ'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    {/* Left: Cart Editing */}
                    <div className="flex-1 flex flex-col overflow-hidden border-r dark:border-slate-800">
                        {/* Search Bar */}
                        <div className="p-4 bg-slate-50/30 dark:bg-slate-900/30 border-b dark:border-slate-800">
                            <div className="relative">
                                <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="🔍 Tìm sản phẩm thêm vào đơn..."
                                    className="w-full pl-11 p-3.5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-primary outline-none font-bold text-sm transition-all"
                                    value={searchTerm}
                                    onChange={e => { setSearchTerm(e.target.value); setIsProductDropdownOpen(true); setActiveIndex(0); }}
                                    onKeyDown={e => {
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setActiveIndex(prev => Math.min(prev + 1, filteredProducts.length - 1));
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setActiveIndex(prev => Math.max(prev - 1, 0));
                                        } else if (e.key === 'Enter' || e.key === 'Tab') {
                                            if (filteredProducts[activeIndex]) {
                                                e.preventDefault();
                                                addToCart(filteredProducts[activeIndex]);
                                            }
                                        }
                                    }}
                                />
                                <AnimatePresence>
                                    {isProductDropdownOpen && filteredProducts.length > 0 && (
                                        <m.div
                                            key="product-dropdown" // Added key for AnimatePresence
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                            className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border dark:border-slate-800 z-50 overflow-hidden"
                                        >
                                            {filteredProducts.map((p, pIdx) => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => addToCart(p)}
                                                    className={cn(
                                                        "p-3 cursor-pointer flex justify-between items-center transition-colors",
                                                        pIdx === activeIndex ? "bg-primary text-white" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    )}
                                                >
                                                    <div>
                                                        <div className={cn("font-bold text-sm", pIdx === activeIndex ? "text-white" : "dark:text-white")}>{p.name}</div>
                                                        <div className={cn("text-[10px] uppercase font-bold", pIdx === activeIndex ? "text-white/80" : "text-slate-400")}>{p.unit} - {formatNumber(order.type === 'Sale' ? p.sale_price : p.cost_price)}</div>
                                                    </div>
                                                    <Plus size={16} className={pIdx === activeIndex ? "text-white" : "text-primary"} />
                                                </div>
                                            ))}
                                        </m.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Cart Table */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead className="text-[10px] font-black uppercase text-slate-400 tracking-widest sticky top-0 bg-white dark:bg-slate-950 z-10 p-2">
                                    <tr>
                                        <th className="p-2">Sản phẩm</th>
                                        <th className="p-2 w-28">Quy cách</th>
                                        <th className="p-2 w-28">Số lượng</th>
                                        <th className="p-2 w-32">Đơn giá</th>
                                        <th className="p-2 text-right">Thành tiền</th>
                                        <th className="p-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item, idx) => (
                                        <tr key={idx} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl overflow-hidden group">
                                            <td className="p-3 rounded-l-2xl">
                                                <div className="font-bold text-sm dark:text-white line-clamp-1">{item.product_name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{item.product_unit}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-transparent outline-none font-black text-xs text-primary text-center"
                                                        id={`edit-sec-qty-${idx}`}
                                                        value={item.secondary_qty}
                                                        onFocus={e => e.target.select()}
                                                        onChange={e => updateItem(idx, 'secondary_qty', parseFloat(e.target.value) || 0)}
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.secondary_unit || '...'}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="bg-white dark:bg-slate-800 px-2 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-transparent outline-none font-black text-xs text-slate-600 dark:text-slate-300 text-center"
                                                        id={`edit-main-qty-${idx}`}
                                                        value={item.quantity}
                                                        onFocus={e => e.target.select()}
                                                        onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="bg-white dark:bg-slate-800 px-2 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-transparent outline-none font-black text-xs text-emerald-600 dark:text-emerald-400 text-right"
                                                        id={`edit-price-${idx}`}
                                                        value={item.price}
                                                        onFocus={e => e.target.select()}
                                                        onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-3 text-right font-black text-slate-700 dark:text-slate-200">
                                                {formatNumber(item.price * item.quantity)}
                                            </td>
                                            <td className="p-3 text-center rounded-r-2xl">
                                                <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right: Payment & Summary */}
                    <div className="w-full lg:w-80 bg-slate-50/50 dark:bg-slate-900/30 p-6 flex flex-col gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Hình thức thanh toán</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setPaymentMethod('Cash')}
                                        className={cn("p-3 rounded-2xl font-black text-xs uppercase flex flex-col items-center gap-2 border-2 transition-all", paymentMethod === 'Cash' ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400")}
                                    >
                                        <CreditCard size={18} /> Tiền mặt
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('Debt')}
                                        className={cn("p-3 rounded-2xl font-black text-xs uppercase flex flex-col items-center gap-2 border-2 transition-all", paymentMethod === 'Debt' ? "bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/20" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400")}
                                    >
                                        <FileText size={18} /> Công nợ
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Thanh toán (Đã trả)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full p-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary font-black text-lg text-primary text-right"
                                        value={amountPaid}
                                        onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                                    />
                                    <button
                                        onClick={() => setAmountPaid(totalAmount)}
                                        className="absolute left-3 top-4 text-[10px] font-black text-slate-300 hover:text-primary uppercase"
                                    >Tất cả</button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Ghi chú đơn hàng</label>
                                <textarea
                                    className="w-full p-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-primary font-bold text-sm min-h-[80px]"
                                    placeholder="Nội dung ghi chú..."
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mt-auto pt-6 border-t dark:border-slate-800 space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] font-black uppercase text-slate-400">Tổng cộng</span>
                                <span className="text-2xl font-black text-slate-800 dark:text-white">{formatNumber(totalAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] font-black uppercase text-slate-400">Còn lại</span>
                                <span className={cn("text-sm font-black", totalAmount - amountPaid > 0 ? "text-rose-500" : "text-emerald-500")}>
                                    {formatNumber(totalAmount - amountPaid)}
                                </span>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full py-4 bg-primary text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <Save size={20} /> {loading ? 'Đang lưu...' : 'Lưu cập nhật'}
                            </button>
                        </div>
                    </div>
                </div>
            </m.div>
            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
