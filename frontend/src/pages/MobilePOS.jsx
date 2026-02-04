
import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { m, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, X, Menu, LogOut, ChevronRight, ChevronLeft, Package, Home } from 'lucide-react';
import { formatCurrency, formatNumber } from '../lib/utils';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useProductData } from '../queries/useProductData';
import { useQueryClient } from '@tanstack/react-query';
import MobileMenu from '../components/MobileMenu';
import MobilePartnerSelector from '../components/MobilePartnerSelector'; // New import
import Toast from '../components/Toast';

export default function MobilePOS() {
    const navigate = useNavigate();
    const { data: productsData } = useProductData();
    const [products, setProducts] = useState([]);

    // Sync products when data loads
    useEffect(() => {
        if (productsData) setProducts(productsData);
    }, [productsData]);

    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [showPartnerSelector, setShowPartnerSelector] = useState(false);

    // Categories (derived from products)
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category || 'Khác').filter(Boolean));
        return ['Tất cả', ...Array.from(cats).sort()];
    }, [products]);

    // Filter products
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
        const existing = cart.find(i => i.product_id === product.id);
        if (existing) {
            setCart(cart.map(i =>
                i.product_id === product.id
                    ? { ...i, quantity: i.quantity + 1 }
                    : i
            ));
        } else {
            setCart([...cart, {
                product_id: product.id,
                product_name: product.name,
                price: product.sale_price,
                quantity: 1,
                unit: product.unit
            }]);
        }
        setToast({ message: `Đã thêm ${product.name}`, type: 'success' });

        // Auto-hide toast
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
                type: 'Sale',
                payment_method: 'Cash',
                details: cart.map(item => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price: item.price
                })),
                note: 'Mobile POS Order',
                amount_paid: totalAmount
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

    // Quick Menu to switch back to Desktop mode concepts
    const menuItems = [
        { label: 'Trang chủ', icon: Home, action: () => navigate('/') },
        { label: 'Nhập hàng', icon: Package, action: () => navigate('/purchase') },
    ];

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-900 pb-20 overflow-hidden">
            <MobilePartnerSelector
                isOpen={showPartnerSelector}
                onClose={() => setShowPartnerSelector(false)}
                onSelect={setSelectedPartner}
                selectedPartner={selectedPartner}
                type="Customer"
            />
            {/* Header */}
            <div className="bg-primary p-4 text-white flex items-center justify-between shadow-md z-20">
                <button onClick={() => setIsMenuOpen(true)}>
                    <Menu size={24} />
                </button>
                <div onClick={() => setShowPartnerSelector(true)} className="flex flex-col items-center cursor-pointer active:scale-95 transition-transform">
                    <h1 className="font-bold text-lg uppercase tracking-wider">Lyang Mobile</h1>
                    <div className="flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                        <User size={10} />
                        <span className="truncate max-w-[100px]">{selectedPartner ? selectedPartner.name : 'Khách lẻ'}</span>
                    </div>
                </div>
                <div className="w-6"></div> {/* Spacer */}
            </div>

            {/* Search Bar */}
            <div className="p-3 bg-white dark:bg-slate-800 shadow-sm z-10 sticky top-0">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                        className="w-full bg-gray-100 dark:bg-slate-700 rounded-xl py-2 pl-10 pr-4 outline-none font-medium dark:text-white"
                        placeholder="Tìm sản phẩm..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            className="absolute right-3 top-2.5 text-gray-400"
                            onClick={() => setSearchTerm('')}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 content-start">
                {filteredProducts.map(p => (
                    <m.div
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => addToCart(p)}
                        className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between h-32 relative overflow-hidden"
                    >
                        <div>
                            <div className="font-bold text-sm text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight">{p.name}</div>
                            <div className="text-[10px] text-gray-500 mt-1">{p.unit}</div>
                        </div>
                        <div className="flex justify-between items-end mt-2">
                            <span className="font-black text-primary text-sm">{formatNumber(p.sale_price)}</span>
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                <Plus size={14} strokeWidth={3} />
                            </div>
                        </div>
                        {/* Touch Ripple effect could go here */}
                    </m.div>
                ))}

                {filteredProducts.length === 0 && (
                    <div className="col-span-2 text-center text-gray-400 py-10">
                        Không tìm thấy sản phẩm
                    </div>
                )}
            </div>

            {/* Bottom Cart Sheet (Always visible summary) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-30">
                {/* Expandable Cart List - simplified for "A Thôi" style (minimal) */}
                {cart.length > 0 && (
                    <div className="max-h-[40vh] overflow-y-auto border-b border-dashed border-gray-200 dark:border-slate-700">
                        {cart.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 border-b border-gray-100 dark:border-slate-700/50 last:border-0">
                                <div className="flex-1 pr-2">
                                    <div className="text-xs font-bold truncate dark:text-gray-200">{item.product_name}</div>
                                    <div className="text-[10px] text-gray-500">{formatNumber(item.price)}</div>
                                </div>
                                <div className="flex items-center gap-3 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                                    <button onClick={() => updateQuantity(idx, -1)} className="w-6 h-6 flex items-center justify-center text-gray-600 dark:text-gray-300"><Minus size={14} /></button>
                                    <span className="text-xs font-bold w-4 text-center dark:text-white">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(idx, 1)} className="w-6 h-6 flex items-center justify-center text-gray-600 dark:text-gray-300"><Plus size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Total & Checkout */}
                <div className="p-4 flex gap-4 items-center safe-area-bottom">
                    <div className="flex-1">
                        <div className="text-[10px] uppercase text-gray-500 font-bold">Tổng tiền</div>
                        <div className="text-xl font-black text-primary">{formatNumber(totalAmount)}</div>
                    </div>
                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                        className={cn(
                            "bg-primary text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wide flex items-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-95",
                            cart.length === 0 && "opacity-50 grayscale"
                        )}
                    >
                        <span>Thanh toán</span>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />


            {/* Simple Toast */}
            <AnimatePresence>
                {toast && (
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={cn(
                            "fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-lg z-[60] font-bold text-xs flex items-center gap-2",
                            toast.type === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
                        )}
                    >
                        <span>{toast.message}</span>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
