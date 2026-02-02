import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { m, AnimatePresence } from 'framer-motion';
import { X, Search, Calendar, CreditCard, Printer, Eye, Edit, Trash2, ChevronUp, ChevronDown, ArrowUpDown, FileText, Filter } from 'lucide-react';
import { formatNumber, formatDate, cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import OrderEditPopup from './OrderEditPopup';
import PrintTemplate from './PrintTemplate';
import { DEFAULT_SETTINGS } from '../lib/settings';
import { useReactToPrint } from 'react-to-print';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import Portal from './Portal';

export default function PartnerHistoryModal({ isOpen, partner, onClose }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All'); // All, Sale, Purchase, Transactions
    const [dateFilter, setDateFilter] = useState({ year: new Date().getFullYear(), month: '', day: '', quarter: '' });
    const [ptttFilter, setPtttFilter] = useState('All'); // All, Cash, Debt
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [debtCycles, setDebtCycles] = useState([]);
    const [selectedCycle, setSelectedCycle] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);
    const [excludeSettled, setExcludeSettled] = useState(false);
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null); // { title, message, onConfirm, type }

    // Print states
    const [printSettings, setPrintSettings] = useState(DEFAULT_SETTINGS);
    const printRef = useRef();

    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && partner) {
            fetchDebtCycles();
            fetchPrintSettings();
            // Lock background scroll
            document.body.style.overflow = 'hidden';
            const mainContent = document.getElementById('main-content');
            if (mainContent) mainContent.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            const mainContent = document.getElementById('main-content');
            if (mainContent) mainContent.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = '';
            const mainContent = document.getElementById('main-content');
            if (mainContent) mainContent.style.overflow = 'auto';
        };
    }, [isOpen, partner]);

    useEffect(() => {
        if (isOpen && partner) {
            fetchOrders();
        }
    }, [isOpen, partner, activeTab, dateFilter, ptttFilter, selectedCycle, page, limit, excludeSettled]);

    const fetchPrintSettings = async () => {
        try {
            const res = await axios.get('/api/print-templates?module=Report');
            const data = res.data;
            if (data && data.length > 0) {
                const defaultTemplate = data.find(t => t.is_default) || data[0];
                if (defaultTemplate) {
                    try {
                        const config = JSON.parse(defaultTemplate.config);
                        setPrintSettings(prev => ({ ...prev, ...config }));
                    } catch (e) {
                        console.error("Error parsing template config", e);
                    }
                }
            }
        } catch (err) { console.error(err); }
    };

    const fetchDebtCycles = async () => {
        try {
            const res = await axios.get(`/api/partners/${partner.id}/debt-cycles`);
            setDebtCycles(res.data);
        } catch (err) { console.error(err); }
    };

    const handleRecalculateDebt = async () => {
        setConfirm({
            title: "Tính toán lại nợ",
            message: "Hệ thống sẽ tính toán lại toàn bộ lịch sử để cập nhật số dư công nợ chính xác nhất. Tiếp tục?",
            onConfirm: async () => {
                try {
                    const res = await axios.post(`/api/partners/${partner.id}/recalculate-debt`);
                    fetchDebtCycles();
                    fetchOrders();
                    setToast({ message: `Đã cập nhật số dư nợ mới: ${formatNumber(res.data.new_balance)} VNĐ`, type: "success" });
                } catch (err) {
                    console.error(err);
                    setToast({ message: "Lỗi khi tính toán lại nợ", type: "error" });
                }
                setConfirm(null);
            },
            type: "warning"
        });
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            if (activeTab === 'Transactions') {
                const res = await axios.get('/api/vouchers', {
                    params: {
                        partner_id: partner.id,
                        start_date: selectedCycle?.start_date,
                        end_date: selectedCycle?.end_date
                    }
                });
                const mappedVouchers = res.data.map(v => ({
                    ...v,
                    display_id: v.type === 'Receipt' ? `PT-${v.id}` : `PC-${v.id}`,
                    total_amount: v.amount,
                    payment_method: 'Cash' // Vouchers are cash
                }));
                // Client side slice for pagination
                const start = (page - 1) * limit;
                setOrders(mappedVouchers.slice(start, start + limit));
                setTotalItems(mappedVouchers.length);
                setTotalPages(Math.ceil(mappedVouchers.length / limit));

            } else if (activeTab === 'All') {
                // Fetch both Orders and Vouchers
                const commonParams = {
                    partner_id: partner.id,
                    start_date: selectedCycle?.start_date,
                    end_date: selectedCycle?.end_date
                };
                const [ordersRes, vouchersRes] = await Promise.all([
                    axios.get('/api/orders', { params: { ...commonParams, limit: 1000 } }),
                    axios.get('/api/vouchers', { params: commonParams })
                ]);

                const fetchedOrders = (ordersRes.data.items || ordersRes.data).map(o => ({
                    ...o,
                    category: 'Order',
                    display_id: o.display_id || `DH-${o.id}`
                })).filter(o => o.payment_method === 'Debt'); // Only show Debt orders in History to avoid confusion

                const fetchedVouchers = vouchersRes.data.map(v => ({
                    ...v,
                    category: 'Voucher',
                    display_id: v.type === 'Receipt' ? `PT-${v.id}` : `PC-${v.id}`,
                    total_amount: v.amount,
                    payment_method: 'Cash',
                    type: v.type // 'Receipt' or 'Payment'
                }));

                // Merge
                let combined = [...fetchedOrders, ...fetchedVouchers];

                // Dual Filter Logic
                if (selectedCycle) {
                    const start = new Date(selectedCycle.start_date);
                    const end = selectedCycle.end_date ? new Date(selectedCycle.end_date) : new Date();
                    combined = combined.filter(i => {
                        const d = new Date(i.date);
                        return d >= start && d <= end;
                    });
                }

                // Date Filter (Year/Month/Day/Quarter) - can work with Cycle
                if (dateFilter.year) {
                    combined = combined.filter(i => new Date(i.date).getFullYear() === parseInt(dateFilter.year));
                }
                if (dateFilter.month) {
                    combined = combined.filter(i => new Date(i.date).getMonth() + 1 === parseInt(dateFilter.month));
                }
                if (dateFilter.day) {
                    combined = combined.filter(i => new Date(i.date).getDate() === parseInt(dateFilter.day));
                }
                if (dateFilter.quarter) {
                    if (dateFilter.quarter === '1') combined = combined.filter(i => [1, 2, 3].includes(new Date(i.date).getMonth() + 1));
                    if (dateFilter.quarter === '2') combined = combined.filter(i => [4, 5, 6].includes(new Date(i.date).getMonth() + 1));
                    if (dateFilter.quarter === '3') combined = combined.filter(i => [7, 8, 9].includes(new Date(i.date).getMonth() + 1));
                    if (dateFilter.quarter === '4') combined = combined.filter(i => [10, 11, 12].includes(new Date(i.date).getMonth() + 1));
                }

                if (ptttFilter !== 'All') {
                    combined = combined.filter(i => i.payment_method === ptttFilter);
                }

                if (excludeSettled) {
                    // Identify settled orders (amount_paid >= total_amount)
                    const settledOrderIds = new Set(combined.filter(o => o.category === 'Order' && o.amount_paid >= Math.abs(o.total_amount)).map(o => o.id));
                    combined = combined.filter(o => {
                        // Hide settled orders
                        if (o.category === 'Order' && settledOrderIds.has(o.id)) return false;
                        // Hide vouchers linked to settled orders
                        if (o.category === 'Voucher' && o.order_id && settledOrderIds.has(o.order_id)) return false;
                        return true;
                    });
                }

                // Sort desc
                combined.sort((a, b) => new Date(b.date) - new Date(a.date));

                // Client pagination
                const startIdx = (page - 1) * limit;
                setOrders(combined.slice(startIdx, startIdx + limit)); // Show paginated
                setTotalItems(combined.length);
                setTotalPages(Math.ceil(combined.length / limit));

                printDataRef.current = combined;

            } else {
                // Sale or Purchase tabs - standard server pagination
                const params = {
                    partner_id: partner.id,
                    page,
                    limit,
                    type: activeTab,
                    year: dateFilter.year,
                    month: dateFilter.month,
                    day: dateFilter.day,
                    quarter: dateFilter.quarter,
                    // Force Debt payments for Orders history as requested to avoid confusion with Cash funds
                    payment_method: 'Debt',
                    start_date: selectedCycle?.start_date,
                    end_date: selectedCycle?.end_date
                };

                const res = await axios.get('/api/orders', { params });
                if (res.data.items) {
                    setOrders(res.data.items);
                    setTotalPages(res.data.pages);
                    setTotalItems(res.data.total);
                    printDataRef.current = res.data.items;
                } else {
                    setOrders(res.data);
                    setTotalPages(1);
                    setTotalItems(res.data.length);
                    printDataRef.current = res.data;
                }
            }
        } catch (err) {
            console.error("Error fetching partner history:", err);
        } finally {
            setLoading(false);
        }
    };

    const printDataRef = useRef([]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Bao_Cao_${partner.name}_${formatDate(new Date())}`,
    });

    // Helper to calculate signed amount based on transaction type relative to "Receivable Debt"
    // Sale (+), Payment (+), Purchase (-), Receipt (-)
    // Note: Cash Sales/Purchases technically satisfy themselves so net debt impact is 0, 
    // but in a transaction list they are usually shown as +Val (Sale) or -Val (Purchase).
    // The User specifically asked for "Receipt" to subtract.
    const getSignedAmount = (o) => {
        // Cash Orders do not affect Debt Balance logic (immediate settlement)
        if (o.category === 'Order' && o.payment_method === 'Cash') return 0;

        const val = o.total_amount || 0;
        if (o.type === 'Receipt' || o.type === 'Purchase') return -val;
        return val;
    };

    const totalAmount = useMemo(() => orders.reduce((sum, o) => sum + getSignedAmount(o), 0), [orders]);

    // Calculate discrepancy for "Opening Balance" check (Only relevant when viewing ALL history)
    const discrepancy = useMemo(() => {
        if (activeTab !== 'All' || !partner || isNaN(totalAmount)) return 0;
        // Current Debt - Sum(History)
        // Note: debt_balance is what we think is true. History is what we derived.
        // If debt_balance = 1M, History = 0. Diff = 1M. We need to create 1M transaction.
        return partner.debt_balance - totalAmount;
    }, [partner, totalAmount, activeTab]);

    const handleFixOpeningBalance = async () => {
        if (!discrepancy || Math.abs(discrepancy) < 1000) return; // Ignore small float diffs
        setConfirm({
            title: "Ghi nhận nợ đầu kỳ",
            message: `Phát hiện chênh lệch ${formatNumber(discrepancy)} VNĐ. Hệ thống sẽ tạo phiếu "Nợ đầu kỳ" để cân bằng lịch sử. Tiếp tục?`,
            onConfirm: async () => {
                try {
                    await axios.post(`/api/partners/${partner.id}/fix-opening-balance`, { amount: discrepancy });
                    fetchOrders();
                    fetchDebtCycles();
                    setToast({ message: "Đã tạo phiếu nợ đầu kỳ thành công!", type: "success" });
                } catch (e) {
                    console.error(e);
                    setToast({ message: "Lỗi: " + (e.response?.data?.error || e.message), type: "error" });
                }
                setConfirm(null);
            },
            type: "info"
        });
    };

    return (
        <Portal>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-8 no-print backdrop-blur-sm bg-slate-900/40" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
                        <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0"
                        />
                        <m.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white dark:bg-slate-900 w-full max-w-6xl max-h-full md:max-h-[95vh] overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/20 flex flex-col transition-colors"
                        >
                            {/* Header */}
                            <div className="p-6 border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter flex items-center gap-3">
                                        <FileText size={28} />
                                        Lịch sử giao dịch: {partner.name}
                                    </h3>
                                    <p className="text-xs font-bold text-gray-500 uppercase mt-1 flex items-center gap-4">
                                        <span>SĐT: {partner.phone || 'N/A'}</span>
                                        <span>| Nợ hiện tại: <span className={cn(partner.debt_balance > 0 ? "text-blue-500" : partner.debt_balance < 0 ? "text-red-500" : "text-gray-400")}>{formatNumber(Math.abs(partner.debt_balance))} {partner.debt_balance > 0 ? '(Nợ mình)' : partner.debt_balance < 0 ? '(Mình nợ)' : ''}</span></span>
                                        {activeTab === 'All' && Math.abs(discrepancy) > 1000 && (
                                            <button
                                                onClick={handleFixOpeningBalance}
                                                className="ml-2 text-[9px] bg-rose-500 hover:bg-rose-600 text-white px-2 py-1 rounded-lg font-black transition-colors"
                                                title="Tạo phiếu nợ đầu kỳ để khớp số liệu"
                                            >
                                                <ArrowUpDown size={10} className="inline mr-1" /> GHI NHẬN NỢ ĐẦKỲ ({formatNumber(discrepancy)})
                                            </button>
                                        )}
                                        <button
                                            onClick={handleRecalculateDebt}
                                            className="ml-2 text-[9px] bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded-lg font-black transition-colors"
                                            title="Tính toán lại nợ từ lịch sử (Cẩn thận: Sẽ xóa số dư thủ công nếu không có lịch sử)"
                                        >
                                            <ArrowUpDown size={10} className="inline mr-1" /> ĐỒNG BỘ NỢ
                                        </button>
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer bg-gray-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-transparent hover:border-emerald-500 transition-all">
                                        <input
                                            type="checkbox"
                                            checked={excludeSettled}
                                            onChange={e => setExcludeSettled(e.target.checked)}
                                            className="accent-emerald-500 w-4 h-4 cursor-pointer"
                                        />
                                        <span className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-300">Ẩn đơn đã tất toán</span>
                                    </label>
                                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-xl font-black text-xs uppercase hover:bg-emerald-200 transition-colors">
                                        <Printer size={16} /> In Báo Cáo
                                    </button>
                                    <button onClick={onClose} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-gray-400 hover:text-rose-500 rounded-xl transition-all">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="p-6 bg-white dark:bg-slate-900 border-b dark:border-slate-800 space-y-4">
                                <div className="flex flex-wrap gap-4 items-center">
                                    <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
                                        <button onClick={() => setActiveTab('All')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all", activeTab === 'All' ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" : "text-gray-400")}>Tất cả</button>
                                        <button onClick={() => setActiveTab('Sale')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all", activeTab === 'Sale' ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" : "text-gray-400")}>Bán hàng</button>
                                        <button onClick={() => setActiveTab('Purchase')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all", activeTab === 'Purchase' ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" : "text-gray-400")}>Nhập hàng</button>
                                        <button onClick={() => setActiveTab('Transactions')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all", activeTab === 'Transactions' ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" : "text-gray-400")}>Lịch sử trả nợ</button>
                                    </div>

                                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-transparent focus-within:border-emerald-500 transition-all">
                                        <Calendar size={16} className="text-emerald-500" />
                                        <select value={dateFilter.day} onChange={e => setDateFilter({ ...dateFilter, day: e.target.value })} className="bg-transparent border-none outline-none font-bold text-xs uppercase cursor-pointer dark:text-gray-200">
                                            <option value="">Ngày</option>
                                            {[...Array(31)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                                        </select>
                                        <span className="text-gray-300">/</span>
                                        <select value={dateFilter.month} onChange={e => setDateFilter({ ...dateFilter, month: e.target.value })} className="bg-transparent border-none outline-none font-bold text-xs uppercase cursor-pointer dark:text-gray-200">
                                            <option value="">Tháng</option>
                                            {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                                        </select>
                                        <span className="text-gray-300">/</span>
                                        <select value={dateFilter.quarter} onChange={e => setDateFilter({ ...dateFilter, quarter: e.target.value })} className="bg-transparent border-none outline-none font-bold text-xs uppercase cursor-pointer dark:text-gray-200">
                                            <option value="">Quý</option>
                                            <option value="1">Quý 1</option>
                                            <option value="2">Quý 2</option>
                                            <option value="3">Quý 3</option>
                                            <option value="4">Quý 4</option>
                                        </select>
                                        <span className="text-gray-300">/</span>
                                        <select value={dateFilter.year} onChange={e => setDateFilter({ ...dateFilter, year: e.target.value })} className="bg-transparent border-none outline-none font-bold text-xs uppercase cursor-pointer dark:text-gray-200">
                                            {[...Array(5)].map((_, i) => {
                                                const y = new Date().getFullYear() - i;
                                                return <option key={y} value={y}>{y}</option>
                                            })}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                                        <CreditCard size={16} className="text-emerald-500" />
                                        <select value={ptttFilter} onChange={e => setPtttFilter(e.target.value)} className="bg-transparent border-none outline-none font-bold text-xs uppercase cursor-pointer dark:text-gray-200">
                                            <option value="All">PTTT: Tất cả</option>
                                            <option value="Cash">Tiền mặt</option>
                                            <option value="Debt">Công nợ</option>
                                        </select>
                                    </div>


                                    <div className="relative group">
                                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border-2 border-transparent hover:border-amber-500/50 transition-all cursor-pointer">
                                            <Filter size={16} className="text-amber-500" />
                                            <select
                                                value={selectedCycle ? JSON.stringify(selectedCycle) : ""}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setSelectedCycle(val ? JSON.parse(val) : null);
                                                    setPage(1);
                                                }}
                                                className="bg-transparent border-none outline-none font-bold text-xs uppercase cursor-pointer dark:text-gray-200"
                                            >
                                                <option value="">Tất cả thời gian (Kỳ nợ)</option>
                                                {debtCycles.map((c, i) => (
                                                    <option key={i} value={JSON.stringify({ ...c, index: i + 1 })}>
                                                        Kỳ {i + 1} ({formatDate(c.start_date).split(' ')[0]} - {c.end_date ? formatDate(c.end_date).split(' ')[0] : 'Hiện tại'}): {c.status}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="ml-auto flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase text-gray-400">Hiển thị:</span>
                                        <select value={limit} onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }} className="bg-gray-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-[10px] font-black outline-none dark:text-white uppercase cursor-pointer transition-colors">
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="flex-1 overflow-auto p-6 bg-gray-50/30 dark:bg-slate-950/30">
                                {/* Unified Table View for All and specific types */}
                                <table className="w-full text-left border-separate border-spacing-y-2">
                                    <thead className="bg-[#f0fdf4] dark:bg-emerald-950/20 uppercase text-[10px] font-black tracking-widest text-emerald-800/60 dark:text-emerald-400/60 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 rounded-l-2xl">Mã</th>
                                            <th className="p-4">Ngày giao dịch</th>
                                            <th className="p-4">Loại</th>
                                            <th className="p-4">PTTT/Ghi chú</th>
                                            <th className="p-4 text-right">Tổng tiền</th>
                                            <th className="p-4 text-right rounded-r-2xl">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-0">
                                        {loading ? (
                                            <tr><td colSpan="6" className="p-20 text-center text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Đang tải dữ liệu...</td></tr>
                                        ) : orders.length === 0 ? (
                                            <tr><td colSpan="6" className="p-20 text-center text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Không có dữ liệu</td></tr>
                                        ) : (
                                            <>
                                                {orders.map((o, idx) => {
                                                    const signedAmount = getSignedAmount(o);
                                                    const isCashOrder = o.category === 'Order' && o.payment_method === 'Cash';
                                                    const isNegative = signedAmount < 0;

                                                    return (
                                                        <m.tr
                                                            key={o.id + o.category}
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.02 }}
                                                            className="bg-white dark:bg-slate-800 hover:shadow-lg hover:z-20 relative group transition-all group rounded-2xl cursor-default"
                                                        >
                                                            <td className="p-4 font-black text-gray-400 rounded-l-2xl group-hover:text-emerald-500 transition-colors">
                                                                #{o.display_id || o.id}
                                                            </td>
                                                            <td className="p-4 font-bold text-gray-600 dark:text-gray-300 text-sm whitespace-nowrap">
                                                                {formatDate(o.date)}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                                                    o.type === 'Sale' ? "bg-blue-100 text-blue-600" :
                                                                        o.type === 'Purchase' ? "bg-amber-100 text-amber-600" :
                                                                            o.type === 'Receipt' ? "bg-emerald-100 text-emerald-600" :
                                                                                "bg-rose-100 text-rose-600"
                                                                )}>
                                                                    {o.type === 'Sale' ? 'Bán hàng' : o.type === 'Purchase' ? 'Nhập hàng' : o.type === 'Receipt' ? 'Thanh toán (Thu)' : 'Thanh toán (Chi)'}
                                                                </span>
                                                                {o.category === 'Order' && o.total_amount < 0 && (
                                                                    <div className="text-[8px] font-black text-amber-500 uppercase mt-1 tracking-wider">Trả hàng</div>
                                                                )}
                                                            </td>
                                                            <td className="p-4">
                                                                {o.category === 'Order' ? (
                                                                    o.total_amount < 0 ? (
                                                                        <span className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                                                            o.payment_method === 'Debt' ? "bg-amber-100 text-amber-600" : "bg-purple-100 text-purple-600"
                                                                        )}>
                                                                            {o.payment_method === 'Debt' ? 'Trừ nợ' : 'Hoàn tiền'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                                                            o.payment_method === 'Cash' ? "bg-emerald-100 text-emerald-600" :
                                                                                (o.amount_paid >= o.total_amount ? "bg-blue-100 text-blue-600" : "bg-rose-100 text-rose-600")
                                                                        )}>
                                                                            {o.payment_method === 'Cash' ? 'Tiền mặt' : (o.amount_paid >= o.total_amount ? 'Tất toán' : 'Công nợ')}
                                                                        </span>
                                                                    )
                                                                ) : (
                                                                    <span className="text-xs italic text-gray-500 truncate max-w-[200px] block" title={o.note}>{o.note || 'Không ghi chú'}</span>
                                                                )}
                                                            </td>
                                                            <td className={cn("p-4 text-right font-black text-base",
                                                                isCashOrder ? "text-gray-400 decoration-slice" :
                                                                    o.type === 'Receipt' ? "text-emerald-600" :
                                                                        o.type === 'Purchase' ? "text-amber-600" :
                                                                            "text-gray-800 dark:text-gray-200"
                                                            )}>
                                                                {isCashOrder ? (
                                                                    <span className="flex items-center justify-end gap-2">
                                                                        <span className="line-through opacity-50">{formatNumber(o.total_amount)}</span>
                                                                        <span className="text-[10px] bg-gray-100 dark:bg-slate-700 px-1 py-0.5 rounded">Đã TT</span>
                                                                    </span>
                                                                ) : (
                                                                    <>
                                                                        {isNegative ? '-' : '+'}{formatNumber(Math.abs(signedAmount))}
                                                                    </>
                                                                )}
                                                            </td>
                                                            <td className="p-4 text-right space-x-1 rounded-r-2xl">
                                                                {o.category === 'Order' && (
                                                                    <button
                                                                        onClick={() => setEditingOrder(o)}
                                                                        className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl transition-all"
                                                                        title="Xem/Sửa"
                                                                    >
                                                                        <Edit size={18} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </m.tr>
                                                    );
                                                })}
                                                {/* Total row */}
                                                <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-black text-emerald-800 dark:text-emerald-300">
                                                    <td colSpan="4" className="p-4 text-right uppercase tracking-[0.2em] text-xs rounded-l-2xl">Tổng cộng (trên trang này):</td>
                                                    <td className="p-4 text-right text-lg">{formatNumber(totalAmount)}</td>
                                                    <td className="p-4 rounded-r-2xl"></td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer / Pagination */}
                            <div className="p-4 bg-gray-50 dark:bg-slate-800 border-t dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hiển thị <span className="text-emerald-600">{(page - 1) * limit + 1} - {Math.min(page * limit, totalItems)}</span> / <span className="text-emerald-600">{totalItems}</span> đơn</div>
                                <div className="flex items-center gap-1.5">
                                    <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-4 py-2 border-2 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white dark:hover:bg-slate-700 transition-all dark:text-emerald-400">Trước</button>
                                    {[...Array(totalPages)].map((_, i) => {
                                        const pNum = i + 1;
                                        if (pNum === 1 || pNum === totalPages || (pNum >= page - 2 && pNum <= page + 2)) {
                                            return <button key={pNum} onClick={() => setPage(pNum)} className={cn("w-8 h-8 rounded-xl text-[10px] font-black transition-all", page === pNum ? "bg-emerald-600 text-white shadow-lg" : "hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-600 dark:text-gray-400 border-2 dark:border-slate-700")}>{pNum}</button>;
                                        }
                                        if (pNum === page - 3 || pNum === page + 3) return <span key={pNum} className="px-1 text-emerald-300">...</span>;
                                        return null;
                                    })}
                                    <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-4 py-2 border-2 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-white dark:hover:bg-slate-700 transition-all dark:text-emerald-400">Sau</button>
                                </div>
                            </div>
                        </m.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Hidden Print Section */}
            < div style={{ display: 'none' }
            }>
                <PrintTemplate
                    ref={printRef}
                    data={{
                        partner: partner,
                        details: useMemo(() => {
                            let data = printDataRef.current || orders;
                            if (excludeSettled) {
                                // Identify settled orders (amount_paid >= total_amount)
                                const settledOrderIds = new Set(data.filter(o => o.category === 'Order' && o.amount_paid >= Math.abs(o.total_amount)).map(o => o.id));

                                // Filter out settled orders AND vouchers linked to them IF both are in the list
                                data = data.filter(o => {
                                    if (o.category === 'Order' && settledOrderIds.has(o.id)) return false;
                                    if (o.category === 'Voucher' && o.order_id && settledOrderIds.has(o.order_id)) return false;
                                    return true;
                                });
                            }
                            return data.map(o => ({ ...o, total_amount: getSignedAmount(o) }));
                        }, [orders, excludeSettled, page, limit, activeTab, dateFilter, ptttFilter, selectedCycle]),
                        total_amount: useMemo(() => {
                            let data = printDataRef.current || orders;
                            if (excludeSettled) {
                                const settledOrderIds = new Set(data.filter(o => o.category === 'Order' && o.amount_paid >= Math.abs(o.total_amount)).map(o => o.id));
                                data = data.filter(o => {
                                    if (o.category === 'Order' && settledOrderIds.has(o.id)) return false;
                                    if (o.category === 'Voucher' && o.order_id && settledOrderIds.has(o.order_id)) return false;
                                    return true;
                                });
                            }
                            return data.reduce((acc, curr) => acc + getSignedAmount(curr), 0);
                        }, [orders, excludeSettled, page, limit, activeTab, dateFilter, ptttFilter, selectedCycle]),
                        type: 'Report'
                    }}
                    settings={printSettings}
                    type="Report"
                />
            </div >

            {/* Order Edit Popup */}
            <Portal>
                <AnimatePresence>
                    {editingOrder && (
                        <OrderEditPopup
                            order={editingOrder}
                            partner={partner}
                            onClose={() => setEditingOrder(null)}
                            onSave={() => {
                                fetchOrders();
                                fetchDebtCycles();
                                setEditingOrder(null);
                            }}
                        />
                    )}
                </AnimatePresence>
            </Portal>

            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>

            {confirm && (
                <ConfirmModal
                    isOpen={!!confirm}
                    title={confirm.title}
                    message={confirm.message}
                    onConfirm={confirm.onConfirm}
                    onCancel={() => setConfirm(null)}
                    type={confirm.type}
                />
            )}
        </Portal>
    );
}
