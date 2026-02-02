import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { m } from 'framer-motion';
import { Trash2, X, Plus, Save } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { formatNumber } from '../lib/utils';
import Toast from './Toast';
import Portal from './Portal';

const NumberInput = ({ value, onChange, placeholder, className, ...props }) => {
    const [displayVal, setDisplayVal] = useState('');
    useEffect(() => {
        if (value !== undefined && value !== null) {
            setDisplayVal(formatNumber(value));
        }
    }, [value]);
    const handleChange = (e) => {
        const val = e.target.value.replace(/,/g, '');
        if (!isNaN(val)) {
            onChange(val === '' ? 0 : parseFloat(val));
            setDisplayVal(val === '' ? '' : formatNumber(val));
        }
    };
    return (
        <input
            type="text"
            value={displayVal}
            onChange={handleChange}
            placeholder={placeholder}
            className={`input-premium ${className}`}
            autoComplete="off"
            {...props}
        />
    )
}

export default function ProductEditModal({ product, isOpen, onClose, onSave }) {
    const DEFAULT_PRODUCT = {
        name: '', code: '', unit: 'Cái', secondary_unit: '', multiplier: 1,
        cost_price: 0, sale_price: 0, stock: 0, expiry_date: '',
        active_ingredient: '',
        brand: '',
        is_combo: false, combo_items: []
    };

    const [formData, setFormData] = useState(DEFAULT_PRODUCT);
    const [toast, setToast] = useState(null);
    const [allProducts, setAllProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Only reset form data when the modal opens
    useEffect(() => {
        if (isOpen) {
            if (product) {
                setFormData(prev => {
                    // If we are already editing this exact existing product, don't reset
                    if (product.id && prev.id === product.id) return prev;

                    // If we are triggering a new/edit with new data (like pre-filled name), merge with defaults
                    return {
                        ...DEFAULT_PRODUCT,
                        ...product,
                        combo_items: product.combo_items || []
                    };
                });
            } else {
                // New product mode (no product data passed)
                setFormData(DEFAULT_PRODUCT);
            }
        }
    }, [isOpen]);

    // Additional watcher if we DO support switching products while open (e.g. Next/Prev buttons)
    useEffect(() => {
        if (isOpen && product && product.id) {
            if (product.id !== formData.id) {
                setFormData({ ...DEFAULT_PRODUCT, ...product, combo_items: product.combo_items || [] });
            }
        }
    }, [product]);

    useEffect(() => {
        if (isOpen && formData.is_combo) {
            fetchProducts();
        }
    }, [isOpen, formData.is_combo]);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (formData.is_combo && formData.combo_items.length > 0 && allProducts.length > 0) {
            let totalCost = 0;
            let stocks = [];
            formData.combo_items.forEach(item => {
                const p = allProducts.find(prod => prod.id === item.product_id);
                if (p) {
                    totalCost += (p.cost_price || 0) * (item.quantity || 0);
                    stocks.push(Math.floor((p.stock || 0) / (item.quantity || 1)));
                }
            });
            setFormData(prev => ({
                ...prev,
                cost_price: totalCost,
                stock: stocks.length > 0 ? Math.min(...stocks) : 0
            }));
        }
    }, [formData.combo_items, formData.is_combo, allProducts]);

    const fetchProducts = async () => {
        try {
            const res = await axios.get('/api/products');
            // Handle both array and paginated object response
            let data = res.data;
            if (data.items && Array.isArray(data.items)) {
                data = data.items;
            }

            if (Array.isArray(data)) {
                const sorted = data.sort((a, b) => (a.name || "").localeCompare(b.name || "", 'vi', { sensitivity: 'base' }));
                setAllProducts(sorted);
            } else {
                console.error("Invalid products data format", data);
                setAllProducts([]);
            }
        } catch (err) { console.error(err); }
    };

    const saveProduct = async (data) => {
        if (product?.id) {
            await axios.put(`/api/products/${product.id}`, data);
        } else {
            await axios.post('/api/products', data);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await saveProduct(formData);
            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            setToast({ message: err.response?.data?.error || "Lỗi khi lưu sản phẩm.", type: "error" });
        }
    };

    const handleSaveAndContinue = async (e) => {
        e.preventDefault();
        if (!formData.name) {
            setToast({ message: "Vui lòng nhập tên sản phẩm", type: "error" });
            return;
        }

        try {
            await saveProduct(formData);
            onSave();
            setFormData({
                name: '', code: '', unit: 'Cái', secondary_unit: '', multiplier: 1,
                cost_price: 0, sale_price: 0, stock: 0, expiry_date: '',
                active_ingredient: '',
                brand: '',
                is_combo: false, combo_items: []
            });
            setTimeout(() => document.getElementById('prod-name-input')?.focus(), 100);
            setToast({ message: "Đã lưu sản phẩm!", type: "success" });
        } catch (err) {
            console.error(err);
            setToast({ message: err.response?.data?.error || "Lỗi khi lưu sản phẩm.", type: "error" });
        }
    };

    return (
        <Portal>
            <AnimatePresence>
                {isOpen && (
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-y-auto"
                    >
                        <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={onClose}
                        />
                        <m.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25, mass: 0.8 }}
                            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-8 border dark:border-slate-800 transition-colors my-auto relative z-10"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tighter">{product?.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-blue-100 border border-blue-100 dark:border-blue-800">
                                        <input type="checkbox" className="w-4 h-4" checked={formData.is_combo} onChange={e => setFormData({ ...formData, is_combo: e.target.checked, combo_items: e.target.checked ? (formData.combo_items || []) : [] })} autoComplete="off" />
                                        <span className="text-xs font-black uppercase text-primary">Sản phẩm Combo</span>
                                    </label>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-black uppercase text-gray-500 mb-2">Tên sản phẩm</label><input required id="prod-name-input" type="text" className="input-premium w-full p-3 uppercase font-bold" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} autoComplete="off" /></div>
                                    <div><label className="block text-xs font-black uppercase text-gray-500 mb-2">Mã sản phẩm / Combo</label><input type="text" className="input-premium w-full p-3 font-bold" value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} autoComplete="off" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-500 mb-2">Hoạt chất / Thành phần</label>
                                        <input type="text" className="input-premium w-full p-3 font-bold" value={formData.active_ingredient || ''} onChange={e => setFormData({ ...formData, active_ingredient: e.target.value })} autoComplete="off" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-500 mb-2">Hãng / Thương hiệu</label>
                                        <input type="text" className="input-premium w-full p-3 font-bold" value={formData.brand || ''} onChange={e => setFormData({ ...formData, brand: e.target.value })} autoComplete="off" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-500 mb-2">Đơn vị</label>
                                        <input
                                            type="text"
                                            className="input-premium w-full p-3 uppercase font-bold"
                                            value={formData.unit}
                                            list="unit-list"
                                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                            autoComplete="off"
                                        />
                                        <datalist id="unit-list">
                                            <option value="Cái" />
                                            <option value="Chiếc" />
                                            <option value="Hộp" />
                                            <option value="Thùng" />
                                            <option value="Chai" />
                                            <option value="Lọ" />
                                            <option value="Gói" />
                                            <option value="Kg" />
                                            <option value="Gram" />
                                            <option value="Lít" />
                                            <option value="Ml" />
                                            <option value="Viên" />
                                            <option value="Vỉ" />
                                            <option value="Túi" />
                                            <option value="Cuộn" />
                                            <option value="Mét" />
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-500 mb-2">
                                            Tồn kho {formData.is_combo && <span className="text-[10px] text-blue-500 font-bold">(Tự tính)</span>}
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            disabled={formData.is_combo}
                                            className="input-premium w-full p-3 font-bold disabled:opacity-50"
                                            value={formData.stock}
                                            onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div><label className="block text-xs font-black uppercase text-gray-500 mb-2">Hạn sử dụng</label><input type="date" className="input-premium w-full p-3 font-bold" value={formData.expiry_date || ''} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} autoComplete="off" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-500 mb-2">
                                            Giá vốn {formData.is_combo && <span className="text-[10px] text-blue-500 font-bold">(Tự tính)</span>}
                                        </label>
                                        <NumberInput
                                            disabled={formData.is_combo}
                                            className="w-full p-3 font-bold disabled:opacity-50"
                                            value={formData.cost_price}
                                            onChange={val => setFormData({ ...formData, cost_price: val })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-500 mb-2">Giá bán</label>
                                        <NumberInput className="w-full p-3 font-black text-xl text-primary" value={formData.sale_price} onChange={val => setFormData({ ...formData, sale_price: val })} />
                                        {formData.sale_price < formData.cost_price && (
                                            <div className="text-red-500 text-[10px] font-black uppercase mt-1">
                                                Cảnh báo: Giá bán thấp hơn giá nhập!
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {formData.is_combo ? (
                                    <div className="border dark:border-slate-700 rounded-2xl p-4 bg-gray-50 dark:bg-slate-800/30">
                                        <label className="block text-xs font-black uppercase text-primary mb-4">Sản phẩm trong combo (Gõ vào ô search để tìm hàng)</label>

                                        <div className="relative mb-4">
                                            <input
                                                type="text"
                                                className="input-premium w-full p-3 text-xs font-bold"
                                                style={{ paddingLeft: '2.5rem' }}
                                                placeholder="Tìm kiếm sản phẩm để thêm vào combo..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                autoComplete="off"
                                            />
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                            </div>
                                            <AnimatePresence>
                                                {searchQuery && (
                                                    <m.div
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                                        className="dropdown-premium mt-1 max-h-40 overflow-y-auto no-scrollbar overflow-x-hidden"
                                                    >
                                                        <div className="py-0">
                                                            <AnimatePresence mode="popLayout">
                                                                {allProducts
                                                                    .filter(p => !p.is_combo && (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()))
                                                                    .map((p, idx) => (
                                                                        <m.button
                                                                            key={p.id}
                                                                            type="button"
                                                                            initial={{ opacity: 0, x: -10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            exit={{ opacity: 0, scale: 0.9 }}
                                                                            transition={{ delay: idx * 0.02, duration: 0.15 }}
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                if (!formData.combo_items.some(item => item.product_id === p.id)) {
                                                                                    setFormData({ ...formData, combo_items: [...formData.combo_items, { product_id: p.id, quantity: 1, unit: p.unit }] });
                                                                                }
                                                                                setSearchQuery('');
                                                                            }}
                                                                            className="dropdown-item w-full text-left p-3 text-xs font-bold"
                                                                        >
                                                                            {p.name} ({p.unit})
                                                                        </m.button>
                                                                    ))
                                                                }
                                                            </AnimatePresence>
                                                        </div>
                                                    </m.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                            {formData.combo_items.map((item, idx) => {
                                                const p = allProducts.find(prod => prod.id === item.product_id);
                                                return (
                                                    <div key={idx} className="flex gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-lg border dark:border-slate-700">
                                                        <span className="flex-1 text-xs font-bold uppercase">{p?.name || 'Sản phẩm'}</span>
                                                        <div className="flex items-center gap-2">
                                                            <input type="number" className="w-16 text-center border dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded text-xs font-black p-1" value={item.quantity} onChange={e => { const newItems = [...formData.combo_items]; newItems[idx].quantity = parseFloat(e.target.value) || 1; setFormData({ ...formData, combo_items: newItems }); }} autoComplete="off" />
                                                            <span className="text-[10px] font-bold text-gray-500 w-10">{p?.unit || ''}</span>
                                                        </div>
                                                        <button type="button" onClick={() => setFormData({ ...formData, combo_items: formData.combo_items.filter((_, i) => i !== idx) })} className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-tight">Gợi ý: {allProducts.filter(p => !p.is_combo && !formData.combo_items.some(item => item.product_id === p.id)).slice(0, 3).map(p => <button key={p.id} type="button" onMouseDown={(e) => { e.preventDefault(); setFormData({ ...formData, combo_items: [...formData.combo_items, { product_id: p.id, quantity: 1, unit: p.unit }] }); }} className="mr-2 hover:text-primary transition-colors">+ {p.name}</button>)}</div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-black uppercase text-blue-600 mb-2">Đơn vị phụ</label><input type="text" className="input-premium w-full p-3 font-bold" value={formData.secondary_unit || ''} list="unit-list" onChange={e => setFormData({ ...formData, secondary_unit: e.target.value })} autoComplete="off" /></div>
                                        <div><label className="block text-xs font-black uppercase text-blue-600 mb-2">Quy cách</label><input type="number" className="input-premium w-full p-3 font-bold" value={formData.multiplier || 1} onChange={e => setFormData({ ...formData, multiplier: parseFloat(e.target.value) || 1 })} autoComplete="off" /></div>
                                    </div>
                                )}
                                <div className="flex justify-end gap-3 mt-8">
                                    <button type="button" onClick={onClose} className="px-6 py-3 text-gray-400 font-black uppercase text-xs hover:text-gray-600">Hủy</button>
                                    {!product?.id && (
                                        <button type="button" onClick={handleSaveAndContinue} className="px-6 py-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl font-black uppercase text-xs hover:bg-emerald-200 transition-all flex items-center gap-2">
                                            <Plus size={16} /> Lưu & Thêm tiếp
                                        </button>
                                    )}
                                    <button type="submit" className="px-8 py-3 bg-primary text-white rounded-xl font-black uppercase text-xs shadow-xl shadow-blue-500/20 shadow-lg flex items-center gap-2">
                                        <Save size={16} /> Lưu sản phẩm
                                    </button>
                                </div>
                            </form>
                        </m.div>
                    </m.div>
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
