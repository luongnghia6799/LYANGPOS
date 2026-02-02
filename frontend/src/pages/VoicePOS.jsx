import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import Fuse from 'fuse.js';

import { m, AnimatePresence } from 'framer-motion';
import {
    Mic, Trash2, Plus, Minus, CreditCard, User,
    ArrowLeft, ShoppingCart, Sparkles, CheckCircle,
    AlertCircle, History, Package, Wheat
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../lib/utils';
import VoiceInputButton from '../components/VoiceInputButton';
import Toast from '../components/Toast';
import { VoiceService } from '../lib/voiceService';

const VoicePOS = () => {
    const [products, setProducts] = useState([]);
    const [partners, setPartners] = useState([]);
    const [cart, setCart] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Memoized Fuse search for partners
    const partnerFuse = useMemo(() => {
        return new Fuse(partners, {
            keys: ['name', 'phone'],
            threshold: 0.4
        });
    }, [partners]);

    // Load data on start
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodRes, partRes] = await Promise.all([
                    axios.get('/api/products'),
                    axios.get('/api/partners')
                ]);
                setProducts(prodRes.data);
                setPartners(partRes.data);
            } catch (err) {
                console.error('Failed to load data', err);
                setToast({ message: 'Không thể tải dữ liệu sản phẩm', type: 'error' });
            }
        };
        fetchData();
    }, []);

    const addToCart = (product, quantity = 1, unit = null) => {
        setCart(prev => {
            const existing = prev.find(item => item.product_id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product_id === product.id
                        ? { ...item, quantity: Math.max(0, item.quantity + quantity) }
                        : item
                );
            }
            if (quantity <= 0) return prev;
            return [...prev, {
                product_id: product.id,
                name: product.name,
                price: product.sale_price,
                unit: unit || product.unit,
                quantity: quantity,
                product: product
            }];
        });

        if (quantity > 0) {
            setToast({
                message: `Đã thêm ${quantity} ${unit || product.unit} ${product.name}`,
                type: 'success'
            });
        }
    };


    const handleVoiceCommand = (result) => {
        if (!result) return;

        if (result.type === 'COMMAND') {
            switch (result.command) {
                case 'CLEAR_CART':
                    setCart([]);
                    setToast({ message: 'Đã xóa sạch giỏ hàng', type: 'info' });
                    VoiceService.speak('Đã xóa sạch giỏ hàng');
                    break;
                case 'CHECKOUT':
                    if (cart.length > 0) {
                        VoiceService.speak('Đang thực hiện thanh toán');
                        handleCheckout();
                    } else {
                        setToast({ message: 'Giỏ hàng đang trống!', type: 'error' });
                        VoiceService.speak('Giỏ hàng đang trống, chưa có gì để thanh toán ạ');
                    }
                    break;
                case 'HOLD_ORDER':
                    setToast({ message: 'Đã lưu đơn (tạm thời)', type: 'success' });
                    VoiceService.speak('Đã lưu đơn tạm thời');
                    setCart([]);
                    break;
                default:
                    break;
            }
            return;
        }

        if (result.type === 'SET_PARTNER') {
            const searchTerm = result.partnerName;
            const matches = partnerFuse.search(searchTerm);
            if (matches.length > 0) {
                const partner = matches[0].item;
                setSelectedPartner(partner);
                setToast({ message: `Đã chọn khách: ${partner.name}`, type: 'success' });
                VoiceService.speak(`Đã chọn khách hàng ${partner.name}`);
            } else {
                setToast({ message: `Không tìm thấy khách: "${searchTerm}"`, type: 'error' });
                VoiceService.speak(`Dạ em không tìm thấy khách hàng nào tên là ${searchTerm}`);
            }
            return;
        }

        if (result.type === 'ADJUST') {
            if (cart.length > 0) {
                const lastItem = cart[cart.length - 1];
                updateQuantity(lastItem.product_id, result.quantity);
                const action = result.quantity > 0 ? 'cộng thêm' : 'bớt đi';
                const msg = `Đã ${action} ${Math.abs(result.quantity)} ${result.unit || lastItem.unit} cho ${lastItem.name}`;
                setToast({ message: msg, type: 'success' });
                VoiceService.speak(msg);
            } else {
                setToast({ message: 'Giỏ hàng đang trống, không biết bớt hàng gì!', type: 'error' });
                VoiceService.speak('Giỏ hàng đang trống, em không biết bớt hàng gì ạ');
            }
            return;
        }


        if (!result.success) {

            if (result?.productName) {
                setToast({ message: `Không tìm thấy sản phẩm: "${result.productName}"`, type: 'error' });
                VoiceService.speak(`Dạ em không tìm thấy sản phẩm nào tên là ${result.productName}`);
            }
            return;
        }

        addToCart(result.product, result.quantity, result.unit);
        VoiceService.speak(`Đã thêm ${result.quantity} ${result.unit || result.product.unit} ${result.product.name}`);
    };


    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.product_id !== productId));
    };

    const updateQuantity = (productId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.product_id === productId) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };


    const totalAmount = useMemo(() =>
        cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        [cart]);

    const handleCheckout = async () => {
        if (cart.length === 0) {
            setToast({ message: 'Giỏ hàng đang trống!', type: 'error' });
            return;
        }

        setIsProcessing(true);
        try {
            const orderData = {
                partner_id: selectedPartner?.id || null,
                type: 'Sale',
                payment_method: selectedPartner ? 'Debt' : 'Cash',
                amount_paid: selectedPartner ? 0 : totalAmount,
                total_amount: totalAmount,
                details: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price
                }))
            };

            await axios.post('/api/orders', orderData);
            setCart([]);
            setSelectedPartner(null);
            setToast({ message: 'Thanh toán thành công!', type: 'success' });
        } catch (err) {
            console.error('Checkout failed', err);
            setToast({ message: 'Thanh toán thất bại!', type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#faf8f3] dark:bg-[#050804] font-sans">
            {/* Premium Header for Seniors */}
            <header className="px-8 py-6 bg-white/70 dark:bg-black/20 backdrop-blur-xl border-b border-primary/10 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-primary rounded-2xl shadow-lg ring-4 ring-primary/10">
                        <Mic className="text-white" size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-primary dark:text-[#d4a574] leading-none uppercase tracking-tighter">
                            Bán hàng Giọng nói
                        </h1>
                        <p className="text-sm font-bold text-text-muted mt-1 uppercase tracking-widest opacity-60">
                            Công nghệ AI dành cho nông dân
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">Tổng cộng</p>
                        <p className="text-4xl font-black text-primary dark:text-[#f4c430] tabular-nums tracking-tighter">
                            {formatCurrency(totalAmount)}
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content: Split Layout */}
            <div className="flex-1 flex overflow-hidden p-6 gap-6">

                {/* Left Side: Cart Items (Large for readability) */}
                <div className="flex-1 flex flex-col bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-[3rem] border border-white/20 shadow-xl overflow-hidden">
                    <div className="p-8 border-b border-primary/5 flex justify-between items-center bg-primary/5">
                        <h2 className="text-xl font-black text-primary uppercase tracking-tight flex items-center gap-3">
                            <ShoppingCart size={24} /> Giỏ hàng ({cart.length})
                        </h2>
                        {cart.length > 0 && (
                            <button
                                onClick={() => setCart([])}
                                className="text-xs font-black text-rose-500 uppercase flex items-center gap-2 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all"
                            >
                                <Trash2 size={16} /> Xóa sạch
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {cart.length === 0 ? (
                                <m.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="h-full flex flex-col items-center justify-center text-text-muted/30"
                                >
                                    <Sparkles size={120} strokeWidth={0.5} className="mb-6 animate-pulse" />
                                    <p className="text-2xl font-black uppercase tracking-widest text-center">
                                        Bấm Mic bên dưới <br /> và nói để thêm hàng
                                    </p>
                                    <div className="mt-8 p-6 bg-primary/5 rounded-3xl border border-dashed border-primary/20 max-w-md text-center">
                                        <p className="text-sm font-bold text-primary/60 italic">
                                            Ví dụ: "Bán cho tôi 5 chai Rio", "2 bao Anvil"...
                                        </p>
                                    </div>
                                </m.div>
                            ) : (
                                cart.map((item, idx) => (
                                    <m.div
                                        key={item.product_id}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-primary/10 flex items-center gap-6 group hover:shadow-xl hover:border-primary/30 transition-all"
                                    >
                                        <div className="w-16 h-16 rounded-22 bg-primary/5 text-primary flex items-center justify-center font-black text-2xl">
                                            {idx + 1}
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase leading-none">
                                                {item.name}
                                            </h3>
                                            <p className="text-sm font-bold text-primary/60 mt-2 uppercase flex items-center gap-2">
                                                <Package size={14} /> {item.unit} | {formatCurrency(item.price)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4 bg-primary/5 p-2 rounded-2xl">
                                            <button
                                                onClick={() => updateQuantity(item.product_id, -1)}
                                                className="w-12 h-12 rounded-xl bg-white text-primary flex items-center justify-center shadow-md hover:bg-primary hover:text-white transition-all"
                                            >
                                                <Minus size={24} strokeWidth={3} />
                                            </button>
                                            <span className="text-3xl font-black text-primary w-16 text-center tabular-nums">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(item.product_id, 1)}
                                                className="w-12 h-12 rounded-xl bg-white text-primary flex items-center justify-center shadow-md hover:bg-primary hover:text-white transition-all"
                                            >
                                                <Plus size={24} strokeWidth={3} />
                                            </button>
                                        </div>

                                        <div className="text-right min-w-[150px]">
                                            <p className="text-[10px] font-black text-text-muted uppercase opacity-40 leading-none">Thành tiền</p>
                                            <p className="text-2xl font-black text-primary tabular-nums tracking-tighter">
                                                {formatCurrency(item.price * item.quantity)}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => removeFromCart(item.product_id)}
                                            className="p-4 text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={24} />
                                        </button>
                                    </m.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Side: Partner & Actions */}
                <div className="w-[400px] flex flex-col gap-6">

                    {/* Partner Selector */}
                    <div className="bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-[3rem] border border-white/20 p-8 shadow-xl">
                        <h2 className="text-lg font-black text-primary uppercase mb-6 flex items-center gap-2">
                            <User size={20} /> Đối tác / Khách hàng
                        </h2>

                        {!selectedPartner ? (
                            <div className="space-y-4">
                                <div className="p-6 bg-primary text-white rounded-[2rem] shadow-lg shadow-primary/20 flex flex-col items-center text-center cursor-pointer hover:scale-[1.02] transition-transform">
                                    <User size={40} className="mb-2" />
                                    <p className="font-black uppercase text-sm tracking-widest">Khách lẻ (Mặc định)</p>
                                    <p className="text-[10px] opacity-70 mt-1 uppercase font-bold text-white/80">Thanh toán tiền mặt</p>
                                </div>
                                <div className="text-center font-bold text-xs text-text-muted uppercase tracking-widest opacity-40">-- HOẶC CHỌN --</div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Tìm tên hoặc SĐT..."
                                        className="w-full p-4 pl-12 rounded-2xl border-2 border-primary/10 focus:border-primary outline-none font-bold bg-white/80 transition-all shadow-sm"
                                        onChange={(e) => {
                                            const found = partners.find(p => p.name.toLowerCase().includes(e.target.value.toLowerCase()) || p.phone?.includes(e.target.value));
                                            if (found && e.target.value.length > 2) {
                                                // Simple selection for now, maybe show a dropdown
                                            }
                                        }}
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40">
                                        <User size={20} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-primary/20 rounded-[2.5rem] flex items-center gap-4 relative">
                                <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xl">
                                    {selectedPartner.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-primary uppercase text-lg leading-tight">{selectedPartner.name}</p>
                                    <p className="text-xs font-bold text-text-muted">{selectedPartner.phone || 'N/A'}</p>
                                </div>
                                <button onClick={() => setSelectedPartner(null)} className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Quick Info */}
                    <div className="flex-1 bg-gradient-to-br from-primary to-emerald-800 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                        <Wheat size={200} className="absolute -right-20 -bottom-20 opacity-10 rotate-12 transition-transform group-hover:scale-110 duration-[2s]" />
                        <div className="relative z-10">
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] opacity-60 mb-2">Thanh toán</h3>
                            <p className="text-5xl font-black tabular-nums tracking-tighter mb-8">
                                {formatCurrency(totalAmount)}
                            </p>

                            <div className="space-y-6 pt-6 border-t border-white/10">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold opacity-60 uppercase text-[10px] tracking-widest">Hình thức</span>
                                    <span className="font-black uppercase tracking-tight flex items-center gap-2">
                                        <CreditCard size={16} /> {selectedPartner ? 'Ghi nợ' : 'Tiền mặt'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold opacity-60 uppercase text-[10px] tracking-widest">Số món</span>
                                    <span className="font-black tracking-tight">{cart.length} sản phẩm</span>
                                </div>
                            </div>

                            <button
                                disabled={isProcessing || cart.length === 0}
                                onClick={handleCheckout}
                                className={`
                  w-full mt-10 py-6 rounded-[2rem] font-black uppercase text-xl tracking-widest transition-all shadow-2xl flex items-center justify-center gap-3
                  ${isProcessing || cart.length === 0
                                        ? 'bg-white/10 cursor-not-allowed text-white/30'
                                        : 'bg-[#f4c430] text-primary hover:bg-white hover:scale-105 active:scale-95 shadow-[#f4c430]/30'}
                `}
                            >
                                {isProcessing ? (
                                    <span className="animate-pulse">Đang xử lý...</span>
                                ) : (
                                    <>
                                        <CheckCircle size={24} strokeWidth={3} /> Hoàn tất đơn
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Voice Command Guide for Help */}
            <div className="max-w-7xl mx-auto px-10 pb-32">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-10 bg-white/50 backdrop-blur-xl rounded-[3rem] border border-white/40 shadow-xl">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                            <Package size={24} />
                        </div>
                        <div>
                            <h4 className="font-black text-primary uppercase text-xs tracking-widest mb-2">Thêm hàng</h4>
                            <p className="text-text-muted text-sm leading-relaxed">"5 chai Rio", "2 bao Urea", "Lấy cho tôi 10 lít Bo"</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                            <User size={24} />
                        </div>
                        <div>
                            <h4 className="font-black text-primary uppercase text-xs tracking-widest mb-2">Chọn khách</h4>
                            <p className="text-text-muted text-sm leading-relaxed">"Bán cho anh Nghĩa", "Khách là chú Tám", "Tên là Hùng"</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h4 className="font-black text-primary uppercase text-xs tracking-widest mb-2">Lệnh khác</h4>
                            <p className="text-text-muted text-sm leading-relaxed">"Xóa đơn" (reset), "Thanh toán" (chốt đơn), "Cho thêm 2" (tăng món cuối)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* The Magic Mic Component */}
            <VoiceInputButton onCommand={handleVoiceCommand} currentProducts={products} />

            <Toast toast={toast} onClose={() => setToast(null)} />

        </div>
    );
};

export default VoicePOS;
