import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit2, Trash2, Search, FileDown, Upload, Package, X, ChevronUp, ChevronDown, ArrowUpDown, Sprout, Wheat, Leaf, FileText } from 'lucide-react';
import { formatNumber, isNearExpiry, isExpired } from '../lib/utils';
import { cn } from '../lib/utils';
import { m, AnimatePresence } from 'framer-motion';
import ProductEditModal from '../components/ProductEditModal';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import LoadingOverlay from '../components/LoadingOverlay';


const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
            ease: [0.22, 1, 0.36, 1]
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            duration: 0.4
        }
    }
};


export default function ProductManager() {
    const [searchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedIds, setSelectedIds] = useState([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);
    const [filterType, setFilterType] = useState(searchParams.get('filter') || 'all');
    const [sortBy, setSortBy] = useState(() => {
        const filter = searchParams.get('filter');
        if (filter === 'expired' || filter === 'near_expiry') return 'expiry_date';
        if (filter === 'out_of_stock' || filter === 'warning') return 'stock';
        if (filter === 'loss') return 'sale_price';
        return 'name';
    });
    const [sortOrder, setSortOrder] = useState(() => {
        const filter = searchParams.get('filter');
        if (filter === 'expired' || filter === 'near_expiry' || filter === 'out_of_stock' || filter === 'loss') return 'asc';
        return 'asc';
    });
    const [brands, setBrands] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState('');
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null); // { title, message, onConfirm, type }

    const fileInputRef = React.useRef(null);

    useEffect(() => {
        fetchProducts();
        setSelectedIds([]);
    }, [page, limit, searchQuery, filterType, sortBy, sortOrder, selectedBrand]);

    useEffect(() => {
        const filter = searchParams.get('filter');
        if (filter) {
            setFilterType(filter);
            if (filter === 'expired' || filter === 'near_expiry') setSortBy('expiry_date');
            else if (filter === 'out_of_stock' || filter === 'warning') setSortBy('stock');
            else if (filter === 'loss') setSortBy('sale_price');
            setSortOrder('asc');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        try {
            const res = await axios.get('/api/products/brands');
            setBrands(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/products', {
                params: {
                    page,
                    limit,
                    search: searchQuery,
                    filterType: filterType,
                    sort_by: sortBy,
                    sort_order: sortOrder,
                    brand: selectedBrand
                }
            });
            if (res.data.items) {
                setProducts(res.data.items);
                setTotalPages(res.data.pages);
                setTotalItems(res.data.total);
            } else {
                setProducts(res.data);
                setTotalPages(1);
                setTotalItems(res.data.length);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
        setPage(1);
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return <ArrowUpDown size={14} className="ml-1 opacity-20" />;
        return sortOrder === 'asc' ? <ChevronUp size={14} className="ml-1 text-[#4a7c59]" /> : <ChevronDown size={14} className="ml-1 text-[#4a7c59]" />;
    };

    const handleSearchTrigger = () => {
        setSearchQuery(searchTerm);
        setPage(1);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearchTrigger();
        }
    };

    const handleDelete = (id) => {
        setConfirm({
            title: "Xác nhận xóa",
            message: "Bạn có chắc chắn muốn xóa sản phẩm này? Thao tác này không thể hoàn tác.",
            onConfirm: async () => {
                try {
                    await axios.delete(`/api/products/${id}`);
                    fetchProducts();
                    setToast({ message: "Đã xóa sản phẩm thành công!", type: "success" });
                } catch (err) { setToast({ message: err.response?.data?.error || "Lỗi khi xóa", type: "error" }); }
                setConfirm(null);
            },
            type: "danger"
        });
    };

    const handleBulkDelete = () => {
        setConfirm({
            title: "Xóa hàng loạt",
            message: `Bạn có chắc chắn muốn xóa ${selectedIds.length} sản phẩm đã chọn?`,
            onConfirm: async () => {
                try {
                    const res = await axios.post('/api/products/bulk-delete', { ids: selectedIds });
                    setToast({ message: res.data.message, type: "success" });
                    setSelectedIds([]);
                    fetchProducts();
                } catch (err) {
                    setToast({ message: err.response?.data?.error || "Lỗi khi xóa hàng loạt", type: "error" });
                }
                setConfirm(null);
            },
            type: "danger"
        });
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === products.length && products.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(products.map(p => p.id));
        }
    };

    const openEdit = (prod) => {
        setEditingProduct(prod);
        setIsModalOpen(true);
    }

    const openAdd = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    }

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formDataImport = new FormData();
        formDataImport.append('file', file);
        try {
            const res = await axios.post('/api/products/import', formDataImport);
            setToast({ message: res.data.message, type: "success" });
            fetchProducts();
        } catch (err) { setToast({ message: err.response?.data?.error || "Lỗi khi nhập file", type: "error" }); }
        e.target.value = '';
    };

    return (
        <m.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="p-4 md:p-8 space-y-6 w-full max-w-[98%] mx-auto transition-colors"
        >
            <m.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-4xl font-black text-[#2d5016] dark:text-[#4a7c59] uppercase tracking-tight flex items-center gap-3 py-1">
                        <Wheat size={36} className="text-[#4a7c59]" />
                        DANH MỤC VỤ MÙA
                    </h1>
                    <p className="text-[#8b6f47] dark:text-[#d4a574]/60 font-medium tracking-tight">Quản lý kho hàng và quy cách sản phẩm</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <AnimatePresence>
                        {selectedIds.length > 0 && (
                            <m.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={handleBulkDelete}
                                className="bg-red-600 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 font-black uppercase text-xs"
                            >
                                <Trash2 size={18} /> Xóa mục chọn ({selectedIds.length})
                            </m.button>
                        )}
                    </AnimatePresence>
                    <button onClick={() => window.open('/api/products/template', '_blank')} className="bg-[#d4a574]/10 dark:bg-[#d4a574]/20 text-[#8b6f47] dark:text-[#d4a574] px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-[#d4a574]/20 transition-all font-black uppercase text-xs border-2 border-[#d4a574]/30">
                        <FileDown size={18} /> Mẫu Excel
                    </button>
                    <button onClick={() => window.open('/api/products/export', '_blank')} className="bg-[#4a7c59]/10 dark:bg-[#4a7c59]/20 text-[#2d5016] dark:text-[#4a7c59] px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-[#4a7c59]/20 transition-all font-black uppercase text-xs border-2 border-[#4a7c59]/30">
                        <FileText size={18} /> Xuất DS
                    </button>
                    <label className="bg-[#f4c430] text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-[#e0b020] transition-all shadow-lg shadow-[#f4c430]/20 font-black uppercase text-xs cursor-pointer">
                        <Upload size={18} /> Nhập Kho
                        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
                    </label>
                    <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:shadow-xl transition-all shadow-lg shadow-[#2d5016]/20 font-black uppercase text-xs">
                        <Plus size={18} /> Thêm Mới
                    </button>
                </div>
            </m.div>

            <m.div variants={itemVariants} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border-2 border-[#d4a574]/30 flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 text-[#8b6f47]" size={20} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sản phẩm..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearchTrigger()}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-[#d4a574]/30 bg-white dark:bg-slate-950 dark:text-white rounded-2xl focus:outline-none focus:border-[#4a7c59] font-bold transition-[border-color,background-color,shadow]"
                        />
                    </div>
                    <button onClick={handleSearchTrigger} className="bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white px-6 py-2.5 rounded-2xl font-black uppercase text-xs hover:shadow-xl transition-all shadow-md flex items-center gap-2">
                        <Search size={16} /> Tìm sản phẩm
                    </button>
                    {searchQuery && (
                        <button
                            onClick={() => { setSearchTerm(''); setSearchQuery(''); setPage(1); }}
                            className="text-[#8b6f47] hover:text-red-500 transition-colors px-2"
                            title="Xóa tìm kiếm"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-xs font-bold text-[#8b6f47]">Hãng:</span>
                    <select
                        value={selectedBrand}
                        onChange={e => { setSelectedBrand(e.target.value); setPage(1); }}
                        className="bg-white/80 dark:bg-slate-950/80 border-2 border-[#d4a574]/30 rounded-2xl px-4 py-2.5 text-sm font-bold outline-none dark:text-white focus:border-[#4a7c59] transition-all shadow-sm cursor-pointer"
                    >
                        <option value="">Tất cả hãng</option>
                        {brands.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-xs font-bold text-[#8b6f47]">Hiển thị:</span>
                    <select
                        value={limit}
                        onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }}
                        className="bg-white/80 dark:bg-slate-950/80 border-2 border-[#d4a574]/30 rounded-2xl px-3 py-2 text-sm font-bold outline-none dark:text-white focus:border-[#4a7c59] transition-all shadow-sm cursor-pointer"
                    >
                        <option value={10}>10 dòng</option>
                        <option value={20}>20 dòng</option>
                        <option value={50}>50 dòng</option>
                        <option value={100}>100 dòng</option>
                    </select>
                </div>
                <div className="flex gap-1.5 p-1.5 bg-gradient-to-r from-[#faf8f3]/50 to-[#f5f1e8]/50 dark:from-slate-900 dark:to-slate-800 rounded-2xl w-fit border-2 border-[#d4a574]/30 shadow-inner">
                    <button
                        onClick={() => { setFilterType('all'); setPage(1); }}
                        className={cn(
                            "relative px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-200",
                            filterType === 'all' ? "text-white" : "text-[#8b6f47] hover:bg-[#d4a574]/10"
                        )}
                    >
                        {filterType === 'all' && (
                            <m.div
                                layoutId="productFilterIndicator"
                                className="absolute inset-0 bg-gradient-to-r from-[#2d5016] to-[#4a7c59] rounded-xl shadow-lg"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">Tất cả</span>
                    </button>
                    <button
                        onClick={() => { setFilterType('safe'); setPage(1); }}
                        className={cn(
                            "relative px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-200",
                            filterType === 'safe' ? "text-white" : "text-[#8b6f47] hover:bg-[#d4a574]/10"
                        )}
                    >
                        {filterType === 'safe' && (
                            <m.div
                                layoutId="productFilterIndicator"
                                className="absolute inset-0 bg-gradient-to-r from-[#2d5016] to-[#4a7c59] rounded-xl shadow-lg"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">Sẵn sàng</span>
                    </button>
                    <button
                        onClick={() => { setFilterType('warning'); setPage(1); }}
                        className={cn(
                            "relative px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-200",
                            filterType === 'warning' ? "text-white" : "text-[#8b6f47] hover:bg-[#d4a574]/10"
                        )}
                    >
                        {filterType === 'warning' && (
                            <m.div
                                layoutId="productFilterIndicator"
                                className="absolute inset-0 bg-orange-500 rounded-xl shadow-lg"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">Cần nhập</span>
                    </button>
                    <button
                        onClick={() => { setFilterType('out_of_stock'); setPage(1); }}
                        className={cn(
                            "relative px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-200",
                            filterType === 'out_of_stock' ? "text-white" : "text-[#8b6f47] hover:bg-[#d4a574]/10"
                        )}
                    >
                        {filterType === 'out_of_stock' && (
                            <m.div
                                layoutId="productFilterIndicator"
                                className="absolute inset-0 bg-[#f4c430] rounded-xl shadow-lg"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">Hết hàng</span>
                    </button>
                    <button
                        onClick={() => { setFilterType('expired'); setPage(1); }}
                        className={cn(
                            "relative px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-200",
                            filterType === 'expired' ? "text-white" : "text-[#8b6f47] hover:bg-[#d4a574]/10"
                        )}
                    >
                        {filterType === 'expired' && (
                            <m.div
                                layoutId="productFilterIndicator"
                                className="absolute inset-0 bg-rose-600 rounded-xl shadow-lg"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">Hết hạn</span>
                    </button>
                    <button
                        onClick={() => { setFilterType('near_expiry'); setPage(1); }}
                        className={cn(
                            "relative px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-200",
                            filterType === 'near_expiry' ? "text-white" : "text-[#8b6f47] hover:bg-[#d4a574]/10"
                        )}
                    >
                        {filterType === 'near_expiry' && (
                            <m.div
                                layoutId="productFilterIndicator"
                                className="absolute inset-0 bg-[#f4c430] rounded-xl shadow-lg"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">Sắp hết hạn</span>
                    </button>
                    <button
                        onClick={() => { setFilterType('loss'); setPage(1); }}
                        className={cn(
                            "relative px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-200",
                            filterType === 'loss' ? "text-white" : "text-[#8b6f47] hover:bg-[#d4a574]/10"
                        )}
                    >
                        {filterType === 'loss' && (
                            <m.div
                                layoutId="productFilterIndicator"
                                className="absolute inset-0 bg-rose-800 rounded-xl shadow-lg"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">Lỗ vốn</span>
                    </button>
                </div>
            </m.div>

            <m.div variants={itemVariants} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border-2 border-[#d4a574]/30 overflow-hidden shadow-lg">
                <AnimatePresence mode="wait">
                    <m.div
                        key={`${filterType}-${selectedBrand}-${searchQuery}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gradient-to-r from-[#2d5016]/10 via-[#4a7c59]/8 to-[#2d5016]/10 border-b-2 border-[#d4a574]/40 transition-colors">
                                    <tr>
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded-md border-2 border-[#d4a574]/50 text-[#4a7c59] focus:ring-[#4a7c59] cursor-pointer"
                                                checked={selectedIds.length === products.length && products.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th onClick={() => handleSort('id')} className="p-4 font-black uppercase text-[10px] text-[#2d5016] dark:text-[#d4a574] cursor-pointer hover:text-[#4a7c59] transition-colors group tracking-widest">
                                            <div className="flex items-center gap-1">MÃ <SortIcon field="id" /></div>
                                        </th>
                                        <th onClick={() => handleSort('name')} className="p-4 font-black uppercase text-[10px] text-[#2d5016] dark:text-[#d4a574] cursor-pointer hover:text-[#4a7c59] transition-colors group tracking-widest">
                                            <div className="flex items-center gap-1">SẢN PHẨM <SortIcon field="name" /></div>
                                        </th>
                                        <th className="p-4 font-black uppercase text-[10px] text-[#2d5016] dark:text-[#d4a574] tracking-widest">HÃNG</th>
                                        <th className="p-4 font-black uppercase text-[10px] text-[#2d5016] dark:text-[#d4a574] tracking-widest">HOẠT CHẤT</th>
                                        <th className="p-4 font-black uppercase text-[10px] text-[#2d5016] dark:text-[#d4a574] tracking-widest">ĐVT</th>
                                        <th onClick={() => handleSort('cost_price')} className="p-4 font-black uppercase text-[10px] text-[#2d5016] dark:text-[#d4a574] text-right cursor-pointer hover:text-[#4a7c59] transition-colors group tracking-widest">
                                            <div className="flex items-center justify-end gap-1">GIÁ NHẬP <SortIcon field="cost_price" /></div>
                                        </th>
                                        <th onClick={() => handleSort('sale_price')} className="p-4 font-black uppercase text-[10px] text-[#2d5016] dark:text-[#d4a574] text-right cursor-pointer hover:text-[#4a7c59] transition-colors group tracking-widest">
                                            <div className="flex items-center justify-end gap-1">GIÁ BÁN <SortIcon field="sale_price" /></div>
                                        </th>
                                        <th onClick={() => handleSort('stock')} className="p-4 font-black uppercase text-[10px] text-[#2d5016] dark:text-[#d4a574] text-right cursor-pointer hover:text-[#4a7c59] transition-colors group tracking-widest">
                                            <div className="flex items-center justify-end gap-1">TỒN KHO <SortIcon field="stock" /></div>
                                        </th>
                                        <th onClick={() => handleSort('expiry_date')} className="p-4 font-black uppercase text-[10px] text-[#2d5016] dark:text-[#d4a574] text-right cursor-pointer hover:text-[#4a7c59] transition-colors group tracking-widest">
                                            <div className="flex items-center justify-end gap-1">HẠN DÙNG <SortIcon field="expiry_date" /></div>
                                        </th>
                                        <th className="p-4 font-black uppercase text-[10px] text-[#2d5016] dark:text-[#d4a574] text-right tracking-widest">THAO TÁC</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-slate-800">
                                    <AnimatePresence>
                                        {products.map((p, idx) => {
                                            const isLowStock = p.stock < 2 * (p.multiplier || 1);
                                            const expired = isExpired(p.expiry_date);
                                            const nearExp = isNearExpiry(p.expiry_date);
                                            const isSelected = selectedIds.includes(p.id);
                                            // The user explicitly asked to remove the "jumping in" effect.
                                            return (
                                                <tr
                                                    key={p.id}
                                                    onDoubleClick={() => openEdit(p)}
                                                    className={cn(
                                                        "hover:bg-[#d4a574]/5 dark:hover:bg-slate-800/50 transition-all duration-200 cursor-pointer border-b border-[#d4a574]/10",
                                                        isSelected ? "bg-[#d4a574]/10 dark:bg-[#4a7c59]/10" : isLowStock ? "bg-red-50/10" : ""
                                                    )}
                                                >
                                                    <td className="p-4">
                                                        <input
                                                            type="checkbox"
                                                            className="w-5 h-5 rounded-md border-2 border-[#d4a574]/50 text-[#4a7c59] focus:ring-[#4a7c59] cursor-pointer"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelect(p.id)}
                                                        />
                                                    </td>
                                                    <td className="p-4 text-gray-400 whitespace-nowrap">#{p.id}</td>
                                                    <td className="p-4 font-bold text-gray-900 dark:text-gray-100 uppercase text-sm leading-tight">
                                                        <div>{p.name}</div>
                                                        {isLowStock && <span className="text-[9px] text-red-500 font-black uppercase">Sắp hết hàng!</span>}
                                                    </td>
                                                    <td className="p-4 font-medium text-xs text-gray-500 max-w-[150px] truncate" title={p.brand}>
                                                        {p.brand || '-'}
                                                    </td>
                                                    <td className="p-4 font-medium text-xs text-gray-500 max-w-[150px] truncate" title={p.active_ingredient}>
                                                        {p.active_ingredient || '-'}
                                                    </td>
                                                    <td className="p-4 text-gray-600 dark:text-gray-400 font-medium">{p.unit}</td>
                                                    <td className="p-4 text-right text-gray-600 dark:text-gray-400">{formatNumber(p.cost_price)}</td>
                                                    <td className={cn("p-4 text-right font-black", p.sale_price < p.cost_price ? "text-red-600" : "text-emerald-600 dark:text-emerald-400")}>
                                                        <div className="text-lg">{formatNumber(p.sale_price)}</div>
                                                        {p.sale_price < p.cost_price && <div className="text-[9px] uppercase font-black">Lỗ vốn!</div>}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex flex-col items-end gap-2"> {/* Added gap for spacing */}
                                                            <span className={cn(
                                                                "px-3 py-1 rounded-lg text-xs font-black backdrop-blur-md border transition-all shadow-sm",
                                                                isLowStock
                                                                    ? "bg-red-500/20 text-red-600 border-red-500/30"
                                                                    : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400"
                                                            )}>
                                                                {p.stock}
                                                            </span>
                                                            {p.secondary_unit && (
                                                                <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
                                                                    {formatNumber(p.stock / p.multiplier)} {p.secondary_unit}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className={cn(
                                                            "px-2 py-1 rounded-lg text-[10px] font-black inline-flex flex-col items-end gap-0.5",
                                                            expired
                                                                ? "bg-rose-600 text-white"
                                                                : nearExp
                                                                    ? "bg-amber-100 text-amber-600 border border-amber-200"
                                                                    : "text-gray-400"
                                                        )}>
                                                            <div className="flex items-center gap-1">
                                                                {expired && <X size={10} className="stroke-[4px]" />}
                                                                {nearExp && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                                                                {p.expiry_date || '...'}
                                                            </div>
                                                            {expired && <span className="text-[8px] uppercase">Đã hết hạn!</span>}
                                                            {nearExp && <span className="text-[8px] uppercase">Sắp hết hạn!</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right space-x-1">
                                                        <button onClick={() => openEdit(p)} className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"><Edit2 size={18} /></button>
                                                        <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                        {products.length === 0 && <div className="p-20 text-center text-gray-500 font-bold uppercase tracking-widest text-sm">Không tìm thấy sản phẩm nào phù hợp.</div>}

                        <div className="p-4 bg-gradient-to-r from-[#faf8f3]/50 to-[#f5f1e8]/50 dark:bg-[#2d5016]/5 border-t-2 border-[#d4a574]/20 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-sm font-bold text-[#8b6f47]">
                                Hiển thị <span className="text-[#2d5016] dark:text-white">{(page - 1) * limit + 1} - {Math.min(page * limit, totalItems)}</span> trên tổng số <span className="text-[#2d5016] dark:text-white">{totalItems}</span> sản phẩm
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-5 py-2.5 border-2 border-[#d4a574]/30 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-[#d4a574]/10 transition-all text-[#2d5016] dark:text-white">Trước</button>
                                {[...Array(totalPages)].map((_, i) => {
                                    const pNum = i + 1;
                                    if (pNum === 1 || pNum === totalPages || (pNum >= page - 2 && pNum <= page + 2)) {
                                        return <button key={pNum} onClick={() => setPage(pNum)} className={cn("w-10 h-10 rounded-2xl text-xs font-black transition-all", page === pNum ? "bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white shadow-lg shadow-[#2d5016]/30 border-0" : "hover:bg-[#d4a574]/10 text-[#8b6f47] dark:text-[#d4a574]/60 border-2 border-[#d4a574]/30")}>{pNum}</button>;
                                    }
                                    if (pNum === page - 3 || pNum === page + 3) return <span key={pNum} className="px-1 text-[#d4a574]">...</span>;
                                    return null;
                                })}
                                <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-5 py-2.5 border-2 border-[#d4a574]/30 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-[#d4a574]/10 transition-all text-[#2d5016] dark:text-white">Sau</button>
                            </div>
                        </div>
                    </m.div>
                </AnimatePresence>
            </m.div>

            <ProductEditModal
                isOpen={isModalOpen}
                product={editingProduct}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchProducts}
            />

            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>

            {
                confirm && (
                    <ConfirmModal
                        isOpen={!!confirm}
                        title={confirm.title}
                        message={confirm.message}
                        onConfirm={confirm.onConfirm}
                        onCancel={() => setConfirm(null)}
                        type={confirm.type}
                    />
                )
            }

            <LoadingOverlay isVisible={loading && products.length === 0} message="Đang kiểm kho..." />
        </m.div >
    );
}

