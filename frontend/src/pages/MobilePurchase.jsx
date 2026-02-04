import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { m, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, Package, X, Menu, ChevronRight, User, ShoppingCart } from 'lucide-react';
import { formatNumber } from '../lib/utils';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useProductData, usePartnerData } from '../queries/useProductData';
import MobileMenu from '../components/MobileMenu';
import MobilePartnerSelector from '../components/MobilePartnerSelector';

export default function MobilePurchase() {
    const navigate = useNavigate();
    const { data: productsData } = useProductData();
    const { data: partnersData } = usePartnerData();

    const products = productsData || [];
    const partners = partnersData || [];

    const [isCartExpanded, setIsCartExpanded] = useState(true);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [showPartnerSelector, setShowPartnerSelector] = useState(false);

    const searchInputRef = useRef(null);
    const cartItemRefs = useRef({});

    const filteredProducts = useMemo(() => {
        let res = products;
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            res = res.filter(p =>
                (p.name || '').toLowerCase().includes(s) ||
                (p.code || '').toLowerCase().includes(s)
            );
        }
        return res;
    }, [products, searchTerm]);

    const addToCart = (product) => {
        const existingIdx = cart.findIndex(i => i.product_id === product.id);
        if (existingIdx > -1) {
            setCart(prev => prev.map((item, idx) =>
                idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
            ));
            setTimeout(() => {
                cartItemRefs.current[existingIdx]?.focus();
                cartItemRefs.current[existingIdx]?.select();
            }, 100);
        } else {
            const newItem = {
                product_id: product.id,
                product_name: product.name,
                price: product.cost_price,
                quantity: 1,
                unit: product.unit
            };
            const newIdx = cart.length;
            setCart(prev => [...prev, newItem]);
            setTimeout(() => {
                cartItemRefs.current[newIdx]?.focus();
                cartItemRefs.current[newIdx]?.select();
            }, 100);
        }
        setIsCartExpanded(true); // Auto expand when adding
        setToast({ message: `Đã thêm ${product.name}`, type: 'success' });
        setTimeout(() => setToast(null), 1500);
    };

    const updateQuantity = (idx, delta) => {
        const newCart = [...cart];
        newCart[idx].quantity += delta;
        if (newCart[idx].quantity <= 0) {
            setCart(cart.filter((_, i) => i !== idx));
        } else {
            setCart(newCart);
        }
    };

    const totalAmount = useMemo(() => cart.reduce((sum, i) => sum + (i.price * i.quantity), 0), [cart]);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        try {
            const orderData = {
                partner_id: selectedPartner ? selectedPartner.id : null,
                type: 'Purchase',
                payment_method: 'Cash',
                details: cart.map(item => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price: item.price
                })),
                note: 'Mobile Purchase Order',
                amount_paid: totalAmount
            };
            await axios.post('/api/orders', orderData);
            setCart([]);
            setToast({ message: 'Nhập hàng thành công!', type: 'success' });
            setTimeout(() => setToast(null), 2000);
            setSelectedPartner(null);
        } catch (err) {
            setToast({ message: 'Lỗi nhập hàng', type: 'error' });
        }
    };

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-50 dark:bg-slate-950 overflow-hidden text-[#4a7c59]">
            <MobilePartnerSelector
                isOpen={showPartnerSelector}
                onClose={() => setShowPartnerSelector(false)}
                onSelect={setSelectedPartner}
                selectedPartner={selectedPartner}
                type="Supplier"
            />

            {/* Minimal Header */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 p-4 flex items-center justify-between z-20">
                <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 text-gray-500">
                    <Menu size={24} />
                </button>
                <div onClick={() => setShowPartnerSelector(true)} className="flex flex-col items-center flex-1 mx-4">
                    <h1 className="font-black text-sm uppercase tracking-[0.2em] text-[#4a7c59]">NHẬP KHO</h1>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4a7c59] animate-pulse"></div>
                        <span className="text-[10px] font-bold text-gray-400 truncate max-w-[120px]">
                            {selectedPartner ? selectedPartner.name : 'NCC Vãng Lai'}
                        </span>
                    </div>
                </div>
                <button onClick={() => setShowPartnerSelector(true)} className="p-2 -mr-2 text-[#4a7c59]">
                    <User size={22} />
                </button>
            </div>

            {/* Sticky Search */}
            <div className="bg-white dark:bg-slate-900 shadow-sm z-10 sticky top-0 border-b border-gray-100 dark:border-slate-800">
                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            ref={searchInputRef}
                            className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl py-2 pl-10 pr-4 outline-none font-medium text-sm dark:text-white border border-transparent focus:border-[#4a7c59]/30 transition-all"
                            placeholder="Tìm sản phẩm nhập..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 content-start pb-64">
                {filteredProducts.map(p => (
                    <m.div
                        key={p.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => addToCart(p)}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col justify-between h-36 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-1.5 opacity-0 group-active:opacity-100 transition-opacity">
                            <div className="bg-[#4a7c59]/10 rounded-full p-1 text-[#4a7c59]">
                                <Plus size={12} strokeWidth={4} />
                            </div>
                        </div>
                        <div>
                            <div className="font-bold text-[13px] text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight">{p.name}</div>
                            <div className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-tighter">{p.unit}</div>
                        </div>
                        <div className="flex justify-between items-end mt-2">
                            <span className="font-black text-[#4a7c59] text-sm">{formatNumber(p.cost_price)}</span>
                            <div className="w-7 h-7 bg-[#4a7c59] text-white rounded-lg flex items-center justify-center shadow-lg shadow-[#4a7c59]/30">
                                <Plus size={16} strokeWidth={3} />
                            </div>
                        </div>
                    </m.div>
                ))}
            </div>

            {/* Bottom Cart Action */}
            <AnimatePresence>
                {cart.length > 0 && (
                    <m.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        className="fixed bottom-0 left-0 right-0 z-30 flex flex-col"
                    >
                        {/* Cart Items List Container */}
                        <div className="mx-3 mb-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col transition-all">
                            <div
                                onClick={() => setIsCartExpanded(!isCartExpanded)}
                                className="p-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50 cursor-pointer active:bg-gray-100 dark:active:bg-slate-800"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="bg-[#4a7c59] p-1.5 rounded-lg text-white">
                                        <ShoppingCart size={14} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-black text-[10px] uppercase tracking-wider text-[#4a7c59]">Giỏ hàng ({cart.length})</span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{isCartExpanded ? 'Bấm để thu gọn' : 'Bấm để xem chi tiết'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={(e) => { e.stopPropagation(); setCart([]); }} className="text-[10px] font-bold text-red-500 uppercase">Xóa hết</button>
                                    <div className={cn("transition-transform duration-300", isCartExpanded ? "rotate-180" : "rotate-0")}>
                                        <ChevronRight size={16} className="rotate-90 text-gray-400" />
                                    </div>
                                </div>
                            </div>
                            {isCartExpanded && (
                                <div className="overflow-y-auto max-h-[25vh]">
                                    {cart.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start p-3 border-b border-gray-50 dark:border-slate-800/50 last:border-0 gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold dark:text-gray-200 leading-tight break-words">{item.product_name}</div>
                                                <div className="text-[10px] text-gray-400 font-bold mt-0.5">{formatNumber(item.price)}</div>
                                            </div>
                                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 rounded-xl p-0.5 shrink-0 w-[110px] justify-between">
                                                <button onClick={() => updateQuantity(idx, -1)} className="w-8 h-8 flex items-center justify-center text-gray-500"><Minus size={14} /></button>
                                                <input
                                                    ref={el => cartItemRefs.current[idx] = el}
                                                    type="number"
                                                    inputMode="numeric"
                                                    value={item.quantity}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            setSearchTerm('');
                                                            searchInputRef.current?.focus();
                                                        }
                                                    }}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const newCart = [...cart];
                                                        newCart[idx].quantity = val;
                                                        if (val <= 0) {
                                                            setCart(cart.filter((_, i) => i !== idx));
                                                        } else {
                                                            setCart(newCart);
                                                        }
                                                    }}
                                                    className="text-xs font-black w-8 text-center bg-transparent outline-none dark:text-white"
                                                />
                                                <button onClick={() => updateQuantity(idx, 1)} className="w-8 h-8 flex items-center justify-center text-gray-500"><Plus size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Checkout Button */}
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-gray-100 dark:border-slate-800 p-3 pt-4 px-6 shadow-2xl safe-area-bottom">
                            <div className="flex items-center justify-between mb-3 text-[#4a7c59]">
                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">TỔNG NHẬP</div>
                                <div className="text-xl font-black">{formatNumber(totalAmount)}</div>
                            </div>
                            <button
                                onClick={handleCheckout}
                                className="w-full bg-[#4a7c59] text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-[#4a7c59]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                <span>Nhập hàng</span>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>

            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <AnimatePresence>
                {toast && (
                    <m.div
                        initial={{ opacity: 0, scale: 0.8, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        className={cn(
                            "fixed top-24 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full shadow-2xl z-[70] font-bold text-xs flex items-center gap-2",
                            toast.type === 'success' ? "bg-white dark:bg-slate-800 text-[#4a7c59] border border-[#4a7c59]/20" : "bg-red-500 text-white"
                        )}
                    >
                        <div className={cn("w-2 h-2 rounded-full", toast.type === 'success' ? "bg-[#4a7c59]" : "bg-white")}></div>
                        <span>{toast.message}</span>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
