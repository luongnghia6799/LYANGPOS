import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { m, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Search, Phone, MapPin, Tag, Package, X, Save, FileUp, Download, Users, ChevronUp, ChevronDown, ArrowUpDown, Droplets, Sprout, Wheat, CreditCard, FileText } from 'lucide-react';
import { formatNumber, formatDebt } from '../lib/utils';
import { cn } from '../lib/utils';
import Toast from '../components/Toast';
import PartnerEditModal from '../components/PartnerEditModal';
import PartnerHistoryModal from '../components/PartnerHistoryModal';
import ConfirmModal from '../components/ConfirmModal';
import LoadingOverlay from '../components/LoadingOverlay';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.02,
            ease: "easeOut"
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1]
        }
    }
};


export default function PartnerManager() {
    const [partners, setPartners] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState(null);
    const [historyPartner, setHistoryPartner] = useState(null);

    // Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [filterType, setFilterType] = useState('All');
    const [priceListPartner, setPriceListPartner] = useState(null);
    const [customPrices, setCustomPrices] = useState({});
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [limit, setLimit] = useState(20);
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null); // { title, message, onConfirm, type }

    // Sorting state
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        fetchPartners();
        setSelectedIds([]);
    }, [page, limit, searchQuery, filterType, sortBy, sortOrder]);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await axios.get('/api/products');
            const sorted = res.data.sort((a, b) => (a.name || "").localeCompare(b.name || "", 'vi', { sensitivity: 'base' }));
            setProducts(sorted);
        } catch (err) { console.error(err); }
    };

    const fetchPartners = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/partners', {
                params: {
                    search: searchQuery,
                    type: filterType,
                    page,
                    limit,
                    sort_by: sortBy,
                    sort_order: sortOrder
                }
            });
            if (res.data.items) {
                setPartners(res.data.items);
                setTotalPages(res.data.pages);
                setTotalItems(res.data.total);
            } else {
                setPartners(res.data);
                setTotalPages(1);
                setTotalItems(res.data.length);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
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

    const handleDelete = (id) => {
        setConfirm({
            title: "Xác nhận xóa",
            message: "Bạn có chắc chắn muốn xóa đối tác này? Toàn bộ lịch sử giao dịch sẽ bị ảnh hưởng.",
            onConfirm: async () => {
                try {
                    await axios.delete(`/api/partners/${id}`);
                    setToast({ message: "Đã xóa đối tác thành công", type: "success" });
                    fetchPartners();
                } catch (err) {
                    setToast({ message: err.response?.data?.error || "Lỗi khi xóa", type: "error" });
                }
                setConfirm(null);
            },
            type: "danger"
        });
    };

    const handleBulkDelete = () => {
        setConfirm({
            title: "Xóa hàng loạt",
            message: `Bạn có chắc chắn muốn xóa ${selectedIds.length} đối tác đã chọn?`,
            onConfirm: async () => {
                try {
                    const res = await axios.post('/api/partners/bulk-delete', { ids: selectedIds });
                    setToast({ message: res.data.message, type: "success" });
                    setSelectedIds([]);
                    fetchPartners();
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
        if (selectedIds.length === partners.length && partners.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(partners.map(p => p.id));
        }
    };

    const openAdd = () => {
        setEditingPartner(null);
        setIsModalOpen(true);
    }

    const openEdit = (p) => {
        setEditingPartner(p);
        setIsModalOpen(true);
    }

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fData = new FormData();
        fData.append('file', file);
        try {
            const res = await axios.post('/api/partners/import', fData);
            setToast({ message: res.data.message, type: "success" });
            fetchPartners();
        } catch (err) {
            setToast({ message: "Lỗi import", type: "error" });
        }
    };

    const openPriceList = async (partner) => {
        setPriceListPartner(partner);
        try {
            const res = await axios.get(`/api/custom-prices/${partner.id}`);
            setCustomPrices(res.data);
        } catch (err) { console.error(err); }
    }

    const handleSaveCustomPrice = async (productId, price) => {
        if (!priceListPartner) return;
        try {
            await axios.post('/api/custom-prices', {
                partner_id: priceListPartner.id,
                product_id: productId,
                price: parseFloat(price) || 0
            });
            setCustomPrices(prev => ({ ...prev, [productId]: parseFloat(price) || 0 }));
        } catch (err) {
            setToast({ message: "Lỗi khi lưu giá", type: "error" });
        }
    }

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
                        <Users size={36} className="text-[#4a7c59]" />
                        ĐỐI TÁC VỤ MÙA
                    </h1>
                    <p className="text-[#8b6f47] dark:text-[#d4a574]/60 font-medium tracking-tight">Quản lý khách hàng, nhà cung cấp và công nợ</p>
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
                    <button onClick={() => window.open('/api/partners/template', '_blank')} className="bg-[#d4a574]/10 dark:bg-[#d4a574]/20 text-[#8b6f47] dark:text-[#d4a574] px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-[#d4a574]/20 transition-all font-black uppercase text-xs border-2 border-[#d4a574]/30">
                        <Download size={18} /> Mẫu Excel
                    </button>
                    <button onClick={() => window.open('/api/partners/export', '_blank')} className="bg-[#4a7c59]/10 dark:bg-[#4a7c59]/20 text-[#2d5016] dark:text-[#4a7c59] px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-[#4a7c59]/20 transition-all font-black uppercase text-xs border-2 border-[#4a7c59]/30">
                        <FileText size={18} /> Xuất DS
                    </button>
                    <label className="bg-[#f4c430] text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-[#e0b020] transition-all shadow-lg shadow-[#f4c430]/20 font-black uppercase text-xs cursor-pointer">
                        <FileUp size={18} /> Nhập Excel
                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
                    </label>
                    <button onClick={openAdd} className="bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:shadow-xl transition-all shadow-lg shadow-[#2d5016]/20 font-black uppercase text-xs">
                        <Plus size={18} /> Thêm Đối Tác
                    </button>
                </div>
            </m.div>

            <m.div variants={itemVariants} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border-2 border-[#d4a574]/30 flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 text-[#8b6f47]" size={20} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm đối tác..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearchTrigger()}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-[#d4a574]/30 bg-white dark:bg-slate-950 dark:text-white rounded-2xl focus:outline-none focus:border-[#4a7c59] font-bold transition-all"
                        />
                    </div>
                    <button onClick={handleSearchTrigger} className="bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white px-6 py-2.5 rounded-2xl font-black uppercase text-xs hover:shadow-xl transition-all shadow-md flex items-center gap-2">
                        <Search size={16} /> Tìm đối tác
                    </button>
                    {searchQuery && <button onClick={() => { setSearchTerm(''); setSearchQuery(''); setPage(1); }} className="text-[#8b6f47] hover:text-red-500 transition-colors"><X size={20} /></button>}
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-xs font-bold text-[#8b6f47]">Hiển thị:</span>
                    <select
                        value={limit}
                        onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }}
                        className="bg-white/80 dark:bg-slate-950/80 border-2 border-[#d4a574]/30 rounded-2xl px-3 py-2 text-sm font-bold outline-none dark:text-white focus:border-[#4a7c59] transition-all shadow-sm cursor-pointer"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
                <div className="flex gap-1.5 p-1.5 bg-gradient-to-r from-[#faf8f3]/50 to-[#f5f1e8]/50 dark:from-slate-900 dark:to-slate-800 rounded-2xl w-fit border-2 border-[#d4a574]/30 shadow-inner">
                    <button
                        onClick={() => { setFilterType('All'); setPage(1); }}
                        className={cn(
                            "relative px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-200",
                            filterType === 'All' ? "text-white" : "text-[#8b6f47] hover:bg-[#d4a574]/10"
                        )}
                    >
                        {filterType === 'All' && (
                            <m.div
                                layoutId="partnerFilterIndicator"
                                className="absolute inset-0 bg-gradient-to-r from-[#2d5016] to-[#4a7c59] rounded-xl shadow-lg"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">Tất cả</span>
                    </button>
                    <button
                        onClick={() => { setFilterType('Customer'); setPage(1); }}
                        className={cn(
                            "relative px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-200",
                            filterType === 'Customer' ? "text-white" : "text-[#8b6f47] hover:bg-[#d4a574]/10"
                        )}
                    >
                        {filterType === 'Customer' && (
                            <m.div
                                layoutId="partnerFilterIndicator"
                                className="absolute inset-0 bg-gradient-to-r from-[#2d5016] to-[#4a7c59] rounded-xl shadow-lg"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">Khách hàng</span>
                    </button>
                    <button
                        onClick={() => { setFilterType('Supplier'); setPage(1); }}
                        className={cn(
                            "relative px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-200",
                            filterType === 'Supplier' ? "text-white" : "text-[#8b6f47] hover:bg-[#d4a574]/10"
                        )}
                    >
                        {filterType === 'Supplier' && (
                            <m.div
                                layoutId="partnerFilterIndicator"
                                className="absolute inset-0 bg-[#f4c430] rounded-xl shadow-lg"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">Nhà cung cấp</span>
                    </button>
                    <button
                        onClick={() => { setFilterType('Both'); setPage(1); }}
                        className={cn(
                            "relative px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-200",
                            filterType === 'Both' ? "text-white" : "text-[#8b6f47] hover:bg-[#d4a574]/10"
                        )}
                    >
                        {filterType === 'Both' && (
                            <m.div
                                layoutId="partnerFilterIndicator"
                                className="absolute inset-0 bg-[#2d5016] rounded-xl shadow-lg"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">Hợp tác X</span>
                    </button>
                </div>
            </m.div>

            <m.div variants={itemVariants} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border-2 border-[#d4a574]/30 overflow-hidden shadow-lg">
                <AnimatePresence mode="wait">
                    <m.div
                        key={`${filterType}-${searchQuery}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gradient-to-r from-[#2d5016]/10 via-[#4a7c59]/8 to-[#2d5016]/10 border-b-2 border-[#d4a574]/40 transition-colors">
                                <tr>
                                    <th className="p-4 w-10">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded-md border-2 border-[#d4a574]/50 text-[#4a7c59] focus:ring-[#4a7c59] cursor-pointer"
                                            checked={selectedIds.length === partners.length && partners.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th onClick={() => handleSort('type')} className="p-5 font-black text-[10px] uppercase tracking-widest text-[#2d5016] dark:text-[#d4a574] cursor-pointer hover:text-[#4a7c59] transition-colors group">
                                        <div className="flex items-center">Loại <SortIcon field="type" /></div>
                                    </th>
                                    <th onClick={() => handleSort('name')} className="p-5 font-black text-[10px] uppercase tracking-widest text-[#2d5016] dark:text-[#d4a574] cursor-pointer hover:text-[#4a7c59] transition-colors group">
                                        <div className="flex items-center">Tên & CCCD <SortIcon field="name" /></div>
                                    </th>
                                    <th onClick={() => handleSort('phone')} className="p-5 font-black text-[10px] uppercase tracking-widest text-[#2d5016] dark:text-[#d4a574] cursor-pointer hover:text-[#4a7c59] transition-colors group">
                                        <div className="flex items-center">Liên hệ <SortIcon field="phone" /></div>
                                    </th>
                                    <th onClick={() => handleSort('debt_balance')} className="p-5 font-black text-[10px] uppercase tracking-widest text-[#2d5016] dark:text-[#d4a574] text-right cursor-pointer hover:text-[#4a7c59] transition-colors group">
                                        <div className="flex items-center justify-end">Nợ <SortIcon field="debt_balance" /></div>
                                    </th>
                                    <th className="p-5 font-black text-[10px] uppercase tracking-widest text-[#2d5016] dark:text-[#d4a574] text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-800">
                                <AnimatePresence>
                                    {loading ? (<tr><td colSpan="6" className="p-20 text-center text-gray-400 font-bold">ĐANG TẢI...</td></tr>) : partners.map((p, idx) => {
                                        const isSelected = selectedIds.includes(p.id);
                                        return (
                                            <m.tr
                                                key={p.id}
                                                initial={{ opacity: 0, x: -25 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 25 }}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 90,
                                                    damping: 18,
                                                    mass: 0.8,
                                                    delay: Math.min(idx * 0.02, 0.25)
                                                }}
                                                className={cn(
                                                    "hover:bg-[#d4a574]/5 dark:hover:bg-slate-800/50 transition-all duration-300 cursor-pointer border-b border-[#d4a574]/10",
                                                    isSelected ? "bg-[#d4a574]/15 dark:bg-[#4a7c59]/15" : ""
                                                )}
                                                style={{ willChange: 'opacity, transform' }}
                                                onClick={(e) => {
                                                    // Don't open history if clicking checkbox or action buttons
                                                    if (e.target.tagName === 'INPUT' || e.target.closest('button')) return;
                                                    setHistoryPartner(p);
                                                }}
                                                onDoubleClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    openEdit(p);
                                                }}
                                            >
                                                <td className="p-4">
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded-md border-2 border-[#d4a574]/50 text-[#4a7c59] focus:ring-[#4a7c59] cursor-pointer"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelect(p.id)}
                                                    />
                                                </td>
                                                <td className="p-5 uppercase text-[10px] font-black">
                                                    <div className="flex flex-wrap gap-1">
                                                        {p.is_customer && <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 shadow-sm">Khách</span>}
                                                        {p.is_supplier && <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 shadow-sm">NCC</span>}
                                                    </div>
                                                </td>
                                                <td className="p-5 font-black uppercase text-sm dark:text-gray-100">
                                                    <div>{p.name || '-'}</div>
                                                    <div className="text-[10px] text-slate-500 flex items-center gap-1 font-bold mt-1 opacity-70"><CreditCard size={12} /> {p.cccd || 'Trống'}</div>
                                                </td>
                                                <td className="p-5 text-xs font-bold text-slate-600 dark:text-gray-400">{p.phone || '-'}</td>
                                                <td className={cn("p-5 text-right font-black uppercase text-xs", p.debt_balance > 0 ? "text-blue-700 dark:text-blue-400" : p.debt_balance < 0 ? "text-red-700 dark:text-red-400" : "text-slate-400 dark:text-slate-600")}>{formatDebt(p.debt_balance)}</td>
                                                <td className="p-4 text-right space-x-1">
                                                    {(p.is_customer) && <button onClick={() => openPriceList(p)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"><Tag size={18} /></button>}
                                                    <button onClick={() => openEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={18} /></button>
                                                    <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={18} /></button>
                                                </td>
                                            </m.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                        {!loading && partners.length === 0 && <div className="p-20 text-center text-gray-500 font-bold uppercase tracking-widest text-sm">Không tìm thấy đối tác.</div>}

                        <div className="p-4 bg-gradient-to-r from-[#faf8f3]/50 to-[#f5f1e8]/50 dark:bg-[#2d5016]/5 border-t-2 border-[#d4a574]/20 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-sm font-bold text-[#8b6f47]">
                                Hiển thị <span className="text-[#2d5016] dark:text-white">{(page - 1) * limit + 1} - {Math.min(page * limit, totalItems)}</span> / <span className="text-[#2d5016] dark:text-white">{totalItems}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-4 py-2 border-2 border-[#d4a574]/30 rounded-xl text-sm font-black uppercase tracking-widest disabled:opacity-30 hover:bg-[#d4a574]/10 transition-all text-[#2d5016] dark:text-white">Trước</button>
                                {[...Array(totalPages)].map((_, i) => {
                                    const pNum = i + 1;
                                    if (pNum === 1 || pNum === totalPages || (pNum >= page - 2 && pNum <= page + 2)) {
                                        return <button key={pNum} onClick={() => setPage(pNum)} className={cn("w-10 h-10 rounded-xl text-sm font-black transition-all", page === pNum ? "bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white shadow-lg shadow-[#2d5016]/30" : "hover:bg-[#d4a574]/10 text-[#8b6f47] dark:text-[#d4a574]/60 border-2 border-[#d4a574]/30")}>{pNum}</button>;
                                    }
                                    if (pNum === page - 3 || pNum === page + 3) return <span key={pNum} className="px-1 text-[#d4a574]">...</span>;
                                    return null;
                                })}
                                <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-4 py-2 border-2 border-[#d4a574]/30 rounded-xl text-sm font-black uppercase tracking-widest disabled:opacity-30 hover:bg-[#d4a574]/10 transition-all text-[#2d5016] dark:text-white">Sau</button>
                            </div>
                        </div>
                    </m.div>
                </AnimatePresence>
            </m.div>

            {/* Modals omitted for brevity - preserved in original implementation */}
            <PartnerEditModal
                isOpen={isModalOpen}
                partner={editingPartner}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchPartners}
            />

            {/* Price list modal omitted for brevity - preserved functionality */}
            <AnimatePresence>{priceListPartner && (
                <Portal>
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                            <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50"><div><h3 className="text-xl font-black uppercase tracking-tighter text-primary">Bảng giá sỉ riêng</h3><p className="text-xs text-gray-500 font-bold uppercase">{priceListPartner.name}</p></div><button onClick={() => setPriceListPartner(null)} className="p-2 hover:bg-gray-200 rounded-full"><X size={24} /></button></div>
                            <div className="flex-1 overflow-auto p-6 space-y-4">
                                <table className="w-full text-left">
                                    <thead className="text-[10px] font-black uppercase text-gray-400 tracking-widest"><tr><th className="pb-4">Tên sản phẩm</th><th className="pb-4 text-right">Giá mặc định</th><th className="pb-4 text-right w-40">Giá sỉ riêng</th></tr></thead>
                                    <tbody className="divide-y dark:divide-slate-800">
                                        {products.map(prod => (
                                            <tr key={prod.id}>
                                                <td className="py-3 font-bold text-xs uppercase dark:text-gray-200">{prod.name}</td>
                                                <td className="py-3 text-right font-bold text-gray-400 text-xs">{formatNumber(prod.sale_price)}</td>
                                                <td className="py-3 text-right"><input type="text" className="w-32 p-2 bg-gray-50 dark:bg-slate-800 border dark:border-slate-700 rounded text-right font-black text-blue-600 outline-none" value={formatNumber(customPrices[prod.id] !== undefined ? customPrices[prod.id] : '')} onBlur={(e) => { const val = parseFloat(e.target.value.replace(/,/g, '')); if (!isNaN(val)) handleSaveCustomPrice(prod.id, val); }} onChange={(e) => { const val = e.target.value.replace(/,/g, ''); if (!isNaN(parseFloat(val)) || val === '') setCustomPrices(prev => ({ ...prev, [prod.id]: val })); }} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 text-right"><button onClick={() => setPriceListPartner(null)} className="px-6 py-2 bg-gray-900 text-white rounded-lg font-black uppercase text-xs">Đóng</button></div>
                        </div>
                    </div>
                </Portal>
            )}</AnimatePresence>

            <AnimatePresence>
                {historyPartner && (
                    <PartnerHistoryModal
                        isOpen={!!historyPartner}
                        partner={historyPartner}
                        onClose={() => setHistoryPartner(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}</AnimatePresence>

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

            <LoadingOverlay isVisible={loading && partners.length === 0} message="Đang tìm đối tác..." />
        </m.div >
    );
}

