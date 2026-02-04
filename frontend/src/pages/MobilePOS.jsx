import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { m, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, User, X, Menu, ChevronRight, ShoppingCart, Trash2, ChevronDown } from 'lucide-react';
import { formatNumber } from '../lib/utils';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useProductData } from '../queries/useProductData';
import MobileMenu from '../components/MobileMenu';
import MobilePartnerSelector from '../components/MobilePartnerSelector';
import ConfirmModal from '../components/ConfirmModal';

export default function MobilePOS() {
    const triggerHaptic = (style = 'medium') => {
        if (window.navigator?.vibrate) {
            if (style === 'light') window.navigator.vibrate(10);
            else if (style === 'medium') window.navigator.vibrate(20);
            else if (style === 'heavy') window.navigator.vibrate([30, 50, 30]);
            else if (style === 'success') window.navigator.vibrate([10, 30, 10]);
        }
    };

    const navigate = useNavigate();
    const { data: productsData } = useProductData();
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem('mobile_pos_cart');
        return saved ? JSON.parse(saved) : [];
    });
    const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('mobile_pos_search') || '');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(() => localStorage.getItem('mobile_pos_category') || 'Tất cả');
    const [selectedPartner, setSelectedPartner] = useState(() => {
        const saved = localStorage.getItem('mobile_pos_partner');
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        localStorage.setItem('mobile_pos_cart', JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        localStorage.setItem('mobile_pos_search', searchTerm);
    }, [searchTerm]);

    useEffect(() => {
        localStorage.setItem('mobile_pos_category', selectedCategory);
    }, [selectedCategory]);

    useEffect(() => {
        localStorage.setItem('mobile_pos_partner', JSON.stringify(selectedPartner));
    }, [selectedPartner]);
    const [showPartnerSelector, setShowPartnerSelector] = useState(false);

    const searchInputRef = useRef(null);
    const cartItemRefs = useRef({});

    useEffect(() => {
        if (productsData) setProducts(productsData);
    }, [productsData]);

    const [isCartExpanded, setIsCartExpanded] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
    const [customPrices, setCustomPrices] = useState({});

    useEffect(() => {
        if (selectedPartner) {
            axios.get(`/api/custom-prices/${selectedPartner.id}`)
                .then(res => setCustomPrices(res.data))
                .catch(err => console.error(err));
        } else {
            setCustomPrices({});
        }
    }, [selectedPartner]);

    // Update cart prices when customPrices change
    useEffect(() => {
        if (cart.length > 0) {
            setCart(prevCart => prevCart.map(item => {
                const customPrice = customPrices[item.product_id];
                if (customPrice !== undefined) {
                    return { ...item, price: customPrice };
                }
                const originalProd = products.find(p => p.id === item.product_id);
                return { ...item, price: originalProd ? originalProd.sale_price : item.price };
            }));
        }
    }, [customPrices]);

    useEffect(() => {
        if (paymentMethod === 'Bank') {
            axios.get('/api/bank-accounts').then(res => {
                setBankAccounts(res.data);
                if (res.data.length > 0) setSelectedBankAccountId(res.data[0].id);
            });
        }
    }, [paymentMethod]);

    const categories = useMemo(() => {
        if (!products) return ['Tất cả'];
        const cats = new Set(products.map(p => p.category || 'Khác').filter(Boolean));
        return ['Tất cả', ...Array.from(cats).sort()];
    }, [products]);

    const filteredProducts = useMemo(() => {
        let res = products;
        if (selectedCategory && selectedCategory !== 'Tất cả') {
            res = res.filter(p => p.category === selectedCategory);
        }
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            res = res.filter(p =>
                (p.name || '').toLowerCase().includes(s) ||
                (p.code || '').toLowerCase().includes(s)
            );
        }
        return res;
    }, [products, searchTerm, selectedCategory]);

    const addToCart = (product) => {
        triggerHaptic('light');
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
                price: customPrices[product.id] !== undefined ? customPrices[product.id] : product.sale_price,
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
        triggerHaptic('light');
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
        triggerHaptic('medium');
        try {
            const orderData = {
                partner_id: selectedPartner ? selectedPartner.id : null,
                type: 'Sale',
                payment_method: paymentMethod,
                bank_account_id: paymentMethod === 'Bank' ? selectedBankAccountId : null,
                details: cart.map(item => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price: item.price
                })),
                note: 'Mobile POS Order',
                amount_paid: paymentMethod === 'Debt' ? 0 : totalAmount
            };
            await axios.post('/api/orders', orderData);
            setCart([]);
            setToast({ message: 'Thanh toán thành công!', type: 'success' });
            setTimeout(() => setToast(null), 2000);
            setSelectedPartner(null);
        } catch (err) {
            setToast({ message: 'Lỗi thanh toán', type: 'error' });
        }
    };

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-50 dark:bg-slate-950 overflow-hidden relative">

            {/* Minimal Header */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 p-4 flex items-center justify-between z-20">
                <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 text-gray-500 dark:text-gray-400">
                    <Menu size={24} />
                </button>
                <div onClick={() => setShowPartnerSelector(true)} className="flex flex-col items-center flex-1 mx-4 cursor-pointer">
                    <h1 className="font-black text-sm uppercase tracking-[0.2em] text-primary">LYANG POS</h1>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-gray-400 truncate max-w-[120px]">
                            {selectedPartner ? selectedPartner.name : 'Khách lẻ'}
                        </span>
                    </div>
                </div>
                <button onClick={() => setShowPartnerSelector(true)} className="p-2 -mr-2 text-primary">
                    <User size={22} />
                </button>
            </div>

            {/* Search & Categories (Fixed) */}
            <div className="bg-white dark:bg-slate-900 shadow-sm z-10 border-b border-gray-100 dark:border-slate-800 shrink-0">
                <div className="p-3 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            ref={searchInputRef}
                            className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl py-2 pl-10 pr-4 outline-none font-medium text-sm dark:text-white border border-transparent focus:border-primary/30 transition-all"
                            placeholder="Tìm sản phẩm..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className="absolute right-3 top-2.5 text-gray-400" onClick={() => setSearchTerm('')}>
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Categories Tab Bar */}
                <div className="flex overflow-x-auto no-scrollbar gap-2 px-3 pb-3">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                                selectedCategory === cat || (!selectedCategory && cat === 'Tất cả')
                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                    : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product Grid - Vertical List of Horizontal Rectangles */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 content-start pb-64">
                {filteredProducts.map(p => (
                    <m.div
                        key={p.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => addToCart(p)}
                        className="bg-white dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-between min-h-[70px] relative overflow-hidden group active:bg-gray-50 dark:active:bg-white/5 transition-colors"
                    >
                        <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-1 h-3 bg-primary rounded-full"></div>
                                <div className="font-black text-[12px] text-gray-800 dark:text-gray-100 uppercase tracking-tight truncate leading-none">
                                    {p.name}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                    {p.unit}
                                </div>
                                <div className="text-[10px] font-black text-primary/70 tracking-tight">
                                    Mã: {p.code || '---'}
                                </div>
                                <div className={cn(
                                    "text-[10px] font-black tracking-tight px-2 py-0.5 rounded-md",
                                    (p.current_stock || 0) <= 0
                                        ? "bg-red-50 text-red-500 dark:bg-red-500/10"
                                        : "bg-primary/5 text-primary dark:bg-primary/10"
                                )}>
                                    Tồn: {p.current_stock || 0}
                                </div>
                                {p.secondary_unit && (
                                    <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md italic">
                                        1 {p.unit} = {p.multiplier} {p.secondary_unit}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <span className="font-black text-primary text-[14px] leading-none tracking-tight">
                                    {formatNumber(p.sale_price)}
                                </span>
                                <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">VND / {p.unit}</span>
                            </div>
                            <div className="w-9 h-9 bg-primary/10 dark:bg-primary/20 text-primary rounded-xl flex items-center justify-center group-active:scale-90 transition-transform">
                                <Plus size={20} strokeWidth={3} />
                            </div>
                        </div>
                    </m.div>
                ))}
            </div>

            {/* Bottom Cart Action (High Visibility Floating Panel) */}
            <AnimatePresence>
                {cart.length > 0 && (
                    <m.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        className="fixed bottom-0 left-0 right-0 z-40 pb-4 px-3 pointer-events-none flex flex-col justify-end"
                        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                    >
                        {/* Premium Gradient Container */}
                        <m.div
                            layout
                            className={cn(
                                "bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden flex flex-col pointer-events-auto relative",
                                "max-h-[70dvh]"
                            )}>
                            {/* Decorative Background Glow */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

                            {/* Pro Header / Summary Bar */}
                            <div
                                onClick={() => {
                                    setIsCartExpanded(!isCartExpanded);
                                    triggerHaptic('medium');
                                }}
                                className={cn(
                                    "p-5 flex justify-between items-center cursor-pointer transition-all",
                                    isCartExpanded
                                        ? "bg-gradient-to-b from-primary/5 to-transparent border-b border-gray-100 dark:border-slate-800"
                                        : "bg-gradient-to-r from-primary to-primary/80 text-white shadow-xl"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2.5 rounded-2xl transition-all shadow-lg cursor-pointer",
                                        isCartExpanded ? "bg-primary text-white animate-pulse" : "bg-white text-primary"
                                    )}>
                                        <ShoppingCart size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={cn("font-black text-xs uppercase tracking-[0.15em]", isCartExpanded ? "text-gray-900 dark:text-white" : "text-white")}>
                                            ({cart.length})
                                        </span>
                                        {!isCartExpanded && (
                                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-tighter">Thanh toán ngay</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 flex-1 justify-end">
                                    <div className="text-right flex flex-col items-end">
                                        <div className={cn("font-black text-xl leading-none tracking-tighter", isCartExpanded ? "text-primary" : "text-white")}>
                                            {formatNumber(totalAmount)}
                                        </div>
                                        {!isCartExpanded && <div className="text-[8px] font-bold uppercase tracking-widest opacity-60 text-right">Thành tiền</div>}
                                    </div>
                                    {isCartExpanded && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setItemToDelete('all'); }}
                                            className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90 border border-red-100"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Cart Items (Expanded - Showing 2 most recent by height) */}
                            {isCartExpanded && (
                                <div className="max-h-[155px] overflow-y-auto no-scrollbar bg-gray-50/10 dark:bg-slate-900/20 px-4 py-2">
                                    {[...cart].reverse().map((item, revIdx) => {
                                        const idx = cart.length - 1 - revIdx;
                                        return (
                                            <m.div key={idx} className="relative mb-1 last:mb-0 group">
                                                {/* Delete Action Background */}
                                                <div
                                                    className="absolute inset-y-0 right-0 w-20 bg-red-500 rounded-2xl flex items-center justify-center text-white"
                                                    onClick={() => setItemToDelete(idx)}
                                                >
                                                    <Trash2 size={20} />
                                                </div>

                                                <m.div
                                                    drag="x"
                                                    dragConstraints={{ left: -80, right: 0 }}
                                                    dragElastic={0.1}
                                                    className="flex items-center justify-between py-3 border-b border-gray-100/50 dark:border-slate-800/50 last:border-0 gap-3 bg-white dark:bg-slate-900 relative z-10"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-extrabold text-[12px] text-gray-800 dark:text-gray-200 leading-tight uppercase truncate">
                                                            {item.product_name || item.name}
                                                        </div>
                                                        <div className="text-[9px] font-black text-primary mt-1 flex items-center gap-2">
                                                            <span>{formatNumber(item.price)}đ</span>
                                                            <span className="w-1 h-1 rounded-full bg-primary/30"></span>
                                                            <span className="text-gray-400">T.Tiền: {formatNumber(item.price * item.quantity)}đ</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-0.5 border border-gray-200 dark:border-white/5 shrink-0">
                                                        <button onClick={() => updateQuantity(idx, -1)} className="w-8 h-8 flex items-center justify-center text-primary active:scale-90 transition-transform"><Minus size={14} strokeWidth={3} /></button>
                                                        <input
                                                            ref={el => cartItemRefs.current[idx] = el}
                                                            type="number"
                                                            inputMode="numeric"
                                                            value={item.quantity}
                                                            onFocus={(e) => e.target.select()}
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
                                                                    setItemToDelete(idx);
                                                                } else {
                                                                    setCart(newCart);
                                                                }
                                                            }}
                                                            className="text-xs font-black w-7 text-center bg-transparent outline-none dark:text-white"
                                                        />
                                                        <button onClick={() => updateQuantity(idx, 1)} className="w-8 h-8 flex items-center justify-center text-primary active:scale-90 transition-transform"><Plus size={14} strokeWidth={3} /></button>
                                                    </div>
                                                </m.div>
                                            </m.div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Compact Payment Method Selector */}
                            {isCartExpanded && (
                                <div className="px-5 py-2 border-t border-gray-100 dark:border-slate-800/50">
                                    <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-[1.25rem] relative">
                                        {[
                                            { id: 'Cash', label: 'Tiền mặt' },
                                            { id: 'Bank', label: 'Chuyển khoản' },
                                            { id: 'Debt', label: 'Ghi nợ' }
                                        ].map(method => (
                                            <button
                                                key={method.id}
                                                onClick={() => { setPaymentMethod(method.id); triggerHaptic('light'); }}
                                                className={cn(
                                                    "flex-1 py-2 rounded-xl text-[10px] font-black transition-all relative z-10",
                                                    paymentMethod === method.id
                                                        ? "text-white"
                                                        : "text-gray-500 dark:text-gray-400"
                                                )}
                                            >
                                                {method.label}
                                                {paymentMethod === method.id && (
                                                    <m.div
                                                        layoutId="active-method"
                                                        className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-sm"
                                                    />
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Bank Selector - Slim version */}
                                    {paymentMethod === 'Bank' && bankAccounts.length > 0 && (
                                        <m.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            className="mt-2 overflow-hidden"
                                        >
                                            <select
                                                value={selectedBankAccountId}
                                                onChange={(e) => setSelectedBankAccountId(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-3 py-2 text-[10px] font-bold outline-none text-gray-700 dark:text-gray-200"
                                            >
                                                {bankAccounts.map(bank => (
                                                    <option key={bank.id} value={bank.id}>{bank.bank_name} - {bank.account_number}</option>
                                                ))}
                                            </select>
                                        </m.div>
                                    )}
                                </div>
                            )}

                            {/* Checkout Final Action */}
                            <div className={cn(
                                "p-5 pt-2 transition-all shrink-0",
                                isCartExpanded ? "bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800" : "hidden"
                            )}>
                                <button
                                    onClick={handleCheckout}
                                    className="w-full bg-primary text-white py-4 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                >
                                    <span>Lưu hóa đơn</span>
                                    <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                                        <ChevronRight size={18} />
                                    </div>
                                </button>
                            </div>
                        </m.div>
                    </m.div>
                )}
            </AnimatePresence>

            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            {/* Premium Toast Container */}
            <AnimatePresence>
                {toast && (
                    <m.div
                        initial={{ opacity: 0, scale: 0.8, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        className={cn(
                            "fixed top-24 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full shadow-2xl z-[70] font-bold text-xs flex items-center gap-2",
                            toast.type === 'success' ? "bg-white dark:bg-slate-800 text-primary border border-primary/20" : "bg-red-500 text-white"
                        )}
                    >
                        <div className={cn("w-2 h-2 rounded-full", toast.type === 'success' ? "bg-primary" : "bg-white")}></div>
                        <span>{toast.message}</span>
                    </m.div>
                )}
            </AnimatePresence>
            <ConfirmModal
                isOpen={itemToDelete !== null}
                title={itemToDelete === 'all' ? "Xóa giỏ hàng?" : "Xóa sản phẩm?"}
                message={itemToDelete === 'all'
                    ? "Bạn có chắc chắn muốn xóa toàn bộ sản phẩm trong giỏ hàng không?"
                    : `Bạn có chắc chắn muốn xóa "${cart[itemToDelete]?.product_name}" khỏi giỏ hàng?`}
                type="danger"
                onConfirm={() => {
                    if (itemToDelete === 'all') {
                        setCart([]);
                    } else {
                        setCart(cart.filter((_, i) => i !== itemToDelete));
                    }
                    setItemToDelete(null);
                }}
                onCancel={() => setItemToDelete(null)}
            />
            <MobilePartnerSelector
                isOpen={showPartnerSelector}
                onClose={() => setShowPartnerSelector(false)}
                onSelect={setSelectedPartner}
                selectedPartner={selectedPartner}
                type="Customer"
            />
        </div >
    );
}
