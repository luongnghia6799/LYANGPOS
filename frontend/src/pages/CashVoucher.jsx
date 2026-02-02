import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { m, AnimatePresence } from 'framer-motion';
import { Search, Plus, Wallet, History, FileText, Trash2, ArrowUpRight, ArrowDownLeft, X, Sprout, Wheat, Droplets, Leaf, Coins, Calendar, User, RefreshCcw, CheckCircle } from 'lucide-react';
import { formatCurrency, formatNumber, formatDate, formatDebt } from '../lib/utils';
import { cn } from '../lib/utils';
import { DEFAULT_SETTINGS } from '../lib/settings';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import Portal from '../components/Portal';

export default function CashVoucher() {
    const [partners, setPartners] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [lastVoucher, setLastVoucher] = useState(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        partner_id: '',
        amount: 0,
        note: '',
        type: 'Receipt' // Default to 'Receipt' (Phiếu Thu)
    });

    const [partnerSearch, setPartnerSearch] = useState('');
    const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null); // { title, message, onConfirm, type }
    const [dateFilter, setDateFilter] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: new Date().getDate(), quarter: '' });
    const [activeMainTab, setActiveMainTab] = useState('fund'); // 'fund' or 'pending'
    const [pendingOrders, setPendingOrders] = useState([]);
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [settleOrder, setSettleOrder] = useState(null);
    const [settleAmount, setSettleAmount] = useState(0);
    const [settleNote, setSettleNote] = useState('');

    useEffect(() => {
        fetchPartners();
        fetchSettings();
    }, []);

    useEffect(() => {
        if (activeMainTab === 'fund') {
            fetchVouchers('manual');
        } else if (activeMainTab === 'settlement_history') {
            fetchVouchers('settlement');
        } else {
            fetchPendingOrders();
        }
    }, [dateFilter, activeMainTab]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsPartnerDropdownOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/print-templates?module=CashVoucher');
            const data = res.data;
            if (data && data.length > 0) {
                const defaultTemplate = data.find(t => t.is_default) || data[0];
                if (defaultTemplate) {
                    try {
                        const config = JSON.parse(defaultTemplate.config);
                        setSettings(prev => ({ ...prev, ...config }));
                    } catch (e) {
                        console.error("Error parsing template config", e);
                    }
                }
            } else {
                const oldRes = await axios.get('/api/settings');
                if (Object.keys(oldRes.data).length > 0) {
                    setSettings(prev => ({ ...prev, ...oldRes.data }));
                }
            }
        } catch (err) { console.error(err); }
    };

    const fetchPartners = async () => {
        try {
            const res = await axios.get('/api/partners');
            setPartners(res.data);
        } catch (err) { console.error("Fetch partners error:", err); }
    };

    const fetchVouchers = async (source = 'manual') => {
        setLoading(true);
        try {
            const params = {
                year: dateFilter.year || undefined,
                month: dateFilter.month || undefined,
                day: dateFilter.day || undefined,
                quarter: dateFilter.quarter || undefined,
                source: source
            };
            const voucherRes = await axios.get('/api/vouchers', { params });
            if (voucherRes.data && Array.isArray(voucherRes.data)) {
                const sorted = voucherRes.data.sort((a, b) => new Date(b.date) - new Date(a.date));
                setVouchers(sorted);
            } else {
                setVouchers([]);
            }
        } catch (err) {
            console.error("Fetch vouchers error:", err);
            setVouchers([]);
            setToast({ message: "Lỗi khi tải dữ liệu quỹ", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/orders', { params: { payment_method: 'Pending' } });
            // API returns {items: [], pages: 1, total: 0} or []
            const items = res.data.items || res.data;
            setPendingOrders(Array.isArray(items) ? items : []);
        } catch (err) {
            console.error("Fetch pending orders error:", err);
            setPendingOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSettleOrder = async () => {
        if (!settleOrder) return;
        setLoading(true);
        try {
            // 1. Update Order Payment Method to 'Cash' (if fully paid) or 'Debt' (if partial/unpaid)
            // But usually we just move it to 'Debt' and then record the payment.
            // If the user pays the FULL amount, it's effectively 'Cash'.
            // If they pay 0, it's 'Debt'.
            // If they pay partial, it's 'Debt' with a voucher.

            // We ALWAYS convert 'Pending' to 'Debt' during settlement.
            // Why? Because this ensures the order (+Total) and Voucher (-Paid) 
            // both appear in the partner's Debt History for clear tracing.
            // If we used 'Cash', the order record would be hidden from debt views.
            const newPaymentMethod = 'Debt';

            const updatedOrder = {
                ...settleOrder,
                payment_method: newPaymentMethod,
                amount_paid: settleAmount,
                note: settleOrder.note + (settleNote ? ` | QT: ${settleNote}` : '')
            };

            // Backend PUT /api/orders/<id> updates inventory and debt.
            // If we move from Pending -> Debt, it adds total_amount to partner.debt_balance.
            // If we move from Pending -> Cash, it adds 0 to partner.debt_balance.
            await axios.put(`/api/orders/${settleOrder.id}`, updatedOrder);

            // 2. Create CashVoucher if amount > 0
            if (settleAmount > 0) {
                const voucherData = {
                    partner_id: settleOrder.partner_id,
                    amount: settleAmount,
                    type: settleOrder.type === 'Sale' ? 'Receipt' : 'Payment',
                    note: `Thanh toán cho đơn ${settleOrder.display_id}${settleNote ? ': ' + settleNote : ''}`,
                    source: 'settlement',
                    order_id: settleOrder.id
                };
                await axios.post('/api/vouchers', voucherData);
            }

            setShowSettleModal(false);
            setSettleOrder(null);
            fetchPendingOrders();
            fetchPartners();
            setToast({ message: "Quyết toán đơn hàng thành công!", type: "success" });
        } catch (err) {
            console.error("Settle order error:", err);
            setToast({ message: "Lỗi khi quyết toán đơn hàng", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.amount || formData.amount <= 0) {
            setToast({ message: "Vui lòng nhập số tiền hợp lệ", type: "error" });
            return;
        }
        setLoading(true);
        try {
            await axios.post('/api/vouchers', formData);
            fetchVouchers();
            fetchPartners();
            resetForm();
            setToast({ message: "Đã lưu phiếu thành công!", type: "success" });
        } catch (err) {
            setToast({ message: "Lỗi khi tạo phiếu", type: "error" });
        } finally {
            setLoading(false);
        }
    };
    const resetForm = () => {
        setFormData({ ...formData, partner_id: '', amount: 0, note: '' });
        setPartnerSearch('');
        setLastVoucher(null);
    };

    const handleDeleteVoucher = (id, source) => {
        if (source === 'auto') return;
        setConfirm({
            title: "Xác nhận xóa phiếu",
            message: "Xóa phiếu này sẽ hoàn tác thay đổi công nợ của đối tác. Bạn có chắc chắn muốn thực hiện?",
            onConfirm: async () => {
                try {
                    await axios.delete(`/api/vouchers/${id}`);
                    if (activeMainTab === 'fund') fetchVouchers('manual');
                    else fetchVouchers('settlement');
                    fetchPartners();
                    setToast({ message: "Đã xóa phiếu thành công", type: "success" });
                } catch (err) {
                    setToast({ message: "Lỗi khi xóa phiếu: " + (err.response?.data?.error || err.message), type: "error" });
                }
                setConfirm(null);
            },
            type: "danger"
        });
    };

    const selectedPartner = partners.find(p => p.id === parseInt(formData.partner_id));
    const isReceipt = formData.type === 'Receipt';
    const isPendingTab = activeMainTab === 'pending';

    return (
        <div className="p-4 pb-20 w-full transition-colors">
            <div className="flex-1 flex flex-col overflow-hidden no-print">
                {/* Top Bar / Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-[#2d5016] dark:text-[#4a7c59] uppercase tracking-tight flex items-center gap-3 py-1">
                            <Wallet size={36} className="text-[#4a7c59]" />
                            {activeMainTab === 'pending' ? "ĐƠN CHỜ THANH TOÁN" : activeMainTab === 'settlement_history' ? "NHẬT KÝ QUYẾT TOÁN" : "QUẢN LÝ QUỸ TIỀN"}
                        </h1>
                        <p className="text-[#8b6f47] dark:text-[#d4a574]/60 font-medium tracking-tight">
                            {activeMainTab === 'pending' ? "Đối soát và quyết toán các đơn hàng sỉ đã giao" : activeMainTab === 'settlement_history' ? "Xem lại lịch sử các đợt quyết toán công nợ" : "Thu hoạch và phân bổ ngân sách vụ mùa"}
                        </p>
                    </div>

                    <div className="flex bg-[#d4a574]/10 dark:bg-slate-800/40 p-1.5 rounded-[2rem] border-2 border-[#d4a574]/20 backdrop-blur-md shadow-lg">
                        <button
                            onClick={() => setActiveMainTab('fund')}
                            className={cn("px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black tracking-widest uppercase transition-all duration-300", activeMainTab === 'fund' ? "bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white shadow-xl" : "text-[#8b6f47] hover:bg-[#d4a574]/10")}
                        >
                            SỔ QUỸ
                        </button>
                        <button
                            onClick={() => setActiveMainTab('pending')}
                            className={cn("px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black tracking-widest uppercase transition-all duration-300", activeMainTab === 'pending' ? "bg-gradient-to-r from-[#f4c430] to-[#d4a574] text-white shadow-xl" : "text-[#8b6f47] hover:bg-[#d4a574]/10")}
                        >
                            ĐƠN CHỜ T/T
                        </button>
                        <button
                            onClick={() => setActiveMainTab('settlement_history')}
                            className={cn("px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black tracking-widest uppercase transition-all duration-300", activeMainTab === 'settlement_history' ? "bg-gradient-to-r from-[#4a7c59] to-[#8b6f47] text-white shadow-xl" : "text-[#8b6f47] hover:bg-[#d4a574]/10")}
                        >
                            NHẬT KÝ QT
                        </button>
                    </div>
                </div>

                {activeMainTab === 'fund' && (
                    <div className="flex justify-center mb-8">
                        <div className="flex p-1.5 bg-[#faf8f3]/80 dark:bg-slate-800/60 rounded-[2rem] border-2 border-[#d4a574]/30 backdrop-blur-md shadow-xl overflow-hidden ring-4 ring-[#d4a574]/5">
                            <button
                                onClick={() => setFormData({ ...formData, type: 'Receipt' })}
                                className={cn(
                                    "px-10 py-4 rounded-[1.5rem] font-black text-xs transition-all flex items-center gap-2 uppercase tracking-widest duration-500",
                                    isReceipt ? "bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white shadow-xl scale-[1.02]" : "text-[#8b6f47] hover:bg-[#d4a574]/10"
                                )}
                            >
                                <ArrowDownLeft size={20} className={isReceipt ? "animate-bounce" : ""} /> PHIẾU THU VỤ MÙA
                            </button>
                            <button
                                onClick={() => setFormData({ ...formData, type: 'Payment' })}
                                className={cn(
                                    "px-10 py-4 rounded-[1.5rem] font-black text-xs transition-all flex items-center gap-2 uppercase tracking-widest duration-500",
                                    !isReceipt ? "bg-gradient-to-r from-[#8b6f47] to-[#d4a574] text-white shadow-xl scale-[1.02]" : "text-[#8b6f47] hover:bg-[#d4a574]/10"
                                )}
                            >
                                <ArrowUpRight size={20} className={!isReceipt ? "animate-bounce" : ""} /> PHIẾU CHI VỤ MÙA
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Date Filter */}
            <div className="flex justify-center mb-10">
                <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-3 rounded-[2rem] shadow-xl border-2 border-[#d4a574]/30 ring-8 ring-[#d4a574]/5">
                    <div className="flex items-center px-5 py-2.5 bg-gradient-to-r from-[#2d5016]/10 to-[#4a7c59]/10 rounded-2xl border border-[#d4a574]/20">
                        <Calendar size={18} className="text-[#2d5016] dark:text-[#4a7c59] mr-2.5" />
                        <span className="text-[10px] font-black text-[#2d5016] dark:text-[#d4a574] uppercase tracking-[0.2em]">Kỳ thu hoạch</span>
                    </div>

                    <div className="flex items-center gap-2.5 px-4 h-10">
                        <select
                            value={dateFilter.day}
                            onChange={e => setDateFilter({ ...dateFilter, day: e.target.value })}
                            className="bg-transparent border-none outline-none font-black text-xs uppercase cursor-pointer text-[#8b6f47] dark:text-[#d4a574] appearance-none hover:text-[#2d5016] transition-colors"
                        >
                            <option value="">Ngày</option>
                            {[...Array(31)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                        </select>
                        <span className="text-[#d4a574]/40 font-bold">/</span>
                        <select
                            value={dateFilter.month}
                            onChange={e => setDateFilter({ ...dateFilter, month: e.target.value })}
                            className="bg-transparent border-none outline-none font-black text-xs uppercase cursor-pointer text-[#8b6f47] dark:text-[#d4a574] appearance-none hover:text-[#2d5016] transition-colors"
                        >
                            <option value="">Tháng</option>
                            {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                        </select>
                        <span className="text-[#d4a574]/40 font-bold">/</span>
                        <select
                            value={dateFilter.quarter}
                            onChange={e => setDateFilter({ ...dateFilter, quarter: e.target.value })}
                            className="bg-transparent border-none outline-none font-black text-xs uppercase cursor-pointer text-[#8b6f47] dark:text-[#d4a574] appearance-none hover:text-[#2d5016] transition-colors"
                        >
                            <option value="">Quý</option>
                            <option value="1">Q1</option>
                            <option value="2">Q2</option>
                            <option value="3">Q3</option>
                            <option value="4">Q4</option>
                        </select>
                        <span className="text-[#d4a574]/40 font-bold">/</span>
                        <select
                            value={dateFilter.year}
                            onChange={e => setDateFilter({ ...dateFilter, year: e.target.value })}
                            className="bg-transparent border-none outline-none font-black text-xs uppercase cursor-pointer text-[#8b6f47] dark:text-[#d4a574] appearance-none hover:text-[#2d5016] transition-colors"
                        >
                            <option value="">Năm</option>
                            {[...Array(5)].map((_, i) => {
                                const y = new Date().getFullYear() - i;
                                return <option key={y} value={y}>{y}</option>
                            })}
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            const today = new Date();
                            setDateFilter({
                                year: today.getFullYear().toString(),
                                month: (today.getMonth() + 1).toString(),
                                day: today.getDate().toString(),
                                quarter: ''
                            });
                        }}
                        className="px-5 py-2.5 bg-[#2d5016] text-white text-[10px] font-black uppercase rounded-2xl hover:bg-[#4a7c59] transition-all shadow-lg shadow-[#2d5016]/20 tracking-widest"
                    >
                        Hôm nay
                    </button>
                    <button
                        onClick={() => setDateFilter({ year: '', month: '', day: '', quarter: '' })}
                        className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-2xl transition-all"
                        title="Xóa lọc"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-8 flex flex-col items-center text-emerald-950 dark:text-emerald-50">
                {activeMainTab === 'fund' && (
                    <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Fund Tab UI (existing) */}
                        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-2 border-[#d4a574]/30 p-10 rounded-[3rem] space-y-8 relative overflow-hidden group shadow-2xl">
                            <div className="absolute -top-10 -right-10 opacity-10 group-hover:opacity-20 transition-all duration-700 transform group-hover:rotate-12 group-hover:scale-110">
                                {isReceipt ? <Wheat size={240} className="text-[#4a7c59]" /> : <Droplets size={240} className="text-[#8b6f47]" />}
                            </div>

                            <h2 className="text-3xl font-black text-[#2d5016] dark:text-[#4a7c59] flex items-center gap-4 uppercase tracking-tighter relative z-10">
                                <div className={cn("p-1.5 rounded-xl text-white shadow-lg shadow-black/5", isReceipt ? "bg-[#2d5016]" : "bg-[#8b6f47]")}>
                                    <Plus size={24} />
                                </div>
                                Tạo {isReceipt ? 'Phiếu Thu' : 'Phiếu Chi'} Mới
                            </h2>

                            <div className="space-y-6 relative z-10">
                                <div className="space-y-2" onBlur={() => setTimeout(() => setIsPartnerDropdownOpen(false), 200)}>
                                    <label className="text-[10px] font-black text-emerald-600/50 dark:text-emerald-400/50 uppercase tracking-[0.2em] ml-1">Đối tác vụ mùa</label>
                                    <div className="relative">
                                        <User className="absolute left-5 top-5 text-emerald-500/50" size={24} />
                                        <input
                                            type="text"
                                            className="input-premium w-full p-5 font-black text-lg"
                                            style={{ paddingLeft: '3.5rem' }}
                                            placeholder="Gõ để tìm tên đối tác..."
                                            value={selectedPartner ? selectedPartner.name : partnerSearch}
                                            onChange={(e) => {
                                                setPartnerSearch(e.target.value);
                                                if (formData.partner_id) setFormData({ ...formData, partner_id: '' });
                                                setIsPartnerDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsPartnerDropdownOpen(true)}
                                        />
                                        {selectedPartner && (
                                            <button
                                                onClick={() => { setFormData({ ...formData, partner_id: '' }); setPartnerSearch(''); }}
                                                className="absolute right-5 top-5 text-rose-400 hover:text-rose-600 z-[20]"
                                            >
                                                <X size={24} />
                                            </button>
                                        )}

                                        <AnimatePresence>
                                            {isPartnerDropdownOpen && !selectedPartner && (
                                                <m.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                    className="dropdown-premium max-h-80 overflow-y-auto no-scrollbar"
                                                >
                                                    <AnimatePresence mode="popLayout">
                                                        {partners
                                                            .filter(p => (p.name || "").toLowerCase().includes(partnerSearch.toLowerCase()) || p.phone?.includes(partnerSearch))
                                                            .sort((a, b) => (a.name || "").localeCompare(b.name || "", 'vi', { sensitivity: 'base' }))
                                                            .map((p, idx) => (
                                                                <m.div
                                                                    key={p.id}
                                                                    initial={{ opacity: 0, x: -10 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                                    transition={{ delay: idx * 0.02, duration: 0.15 }}
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, partner_id: p.id.toString() });
                                                                        setIsPartnerDropdownOpen(false);
                                                                    }}
                                                                    className="dropdown-item p-5"
                                                                >
                                                                    <div className="font-black text-gray-800 dark:text-emerald-50 uppercase tracking-tight flex justify-between items-center transition-colors">
                                                                        <span>{p.name}</span>
                                                                        <div className="flex gap-1">
                                                                            {p.is_customer && <span className="text-[9px] px-2.5 py-1 rounded-lg bg-emerald-100/50 text-emerald-600 font-black tracking-widest uppercase">Khách</span>}
                                                                            {p.is_supplier && <span className="text-[9px] px-2.5 py-1 rounded-lg bg-amber-100/50 text-amber-600 font-black tracking-widest uppercase">NCC</span>}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-[10px] font-black text-gray-400 mt-2 uppercase flex gap-4 transition-colors">
                                                                        <span>{p.phone || 'Không sđt'}</span>
                                                                        <span className="text-amber-500">{formatDebt(p.debt_balance)}</span>
                                                                    </div>
                                                                </m.div>
                                                            ))}
                                                    </AnimatePresence>
                                                </m.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-emerald-600/50 dark:text-emerald-400/50 uppercase tracking-[0.2em] ml-1">Số tiền kết quả (VNĐ)</label>
                                    <div className="relative">
                                        <Coins className={cn("absolute left-5 top-6 z-10", isReceipt ? "text-emerald-400" : "text-rose-400")} size={28} />
                                        <input
                                            type="text"
                                            className={cn(
                                                "input-premium w-full pl-16 p-6 font-black text-5xl text-right",
                                                isReceipt
                                                    ? "text-emerald-600 dark:text-emerald-400 focus:border-emerald-500"
                                                    : "text-rose-600 dark:text-rose-400 focus:border-rose-500 shadow-rose-500/10 focus:shadow-rose-500/20"
                                            )}
                                            placeholder="0"
                                            value={formatNumber(formData.amount)}
                                            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value.replace(/,/g, '')) || 0 })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#8b6f47] dark:text-[#d4a574]/60 uppercase tracking-[0.3em] ml-2">Ghi chú vụ mùa</label>
                                    <div className="relative group">
                                        <FileText className="absolute left-6 top-6 text-[#d4a574]/40 group-focus-within:text-[#4a7c59] transition-colors" size={24} />
                                        <textarea
                                            className="w-full bg-white/40 dark:bg-slate-800/40 border-2 border-[#d4a574]/20 focus:border-[#4a7c59] dark:focus:border-[#4a7c59] rounded-[2rem] p-6 pl-16 font-bold h-32 resize-none placeholder:text-[#d4a574]/30 dark:placeholder:text-[#d4a574]/20 outline-none transition-all shadow-sm focus:shadow-xl dark:text-white"
                                            placeholder={isReceipt ? "Mô tả nội dung thu hoạch..." : "Mô tả mục đích phân bổ..."}
                                            value={formData.note}
                                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <button
                                    disabled={loading}
                                    onClick={handleSave}
                                    className={cn(
                                        "w-full bg-gradient-to-r text-white py-6 rounded-[2.5rem] font-black text-xl flex flex-col items-center justify-center transition-all shadow-2xl active:scale-95 disabled:opacity-50 uppercase tracking-[0.2em] relative overflow-hidden group/btn",
                                        isReceipt
                                            ? "from-[#2d5016] to-[#4a7c59] shadow-[#2d5016]/20"
                                            : "from-[#8b6f47] to-[#d4a574] shadow-[#8b6f47]/20"
                                    )}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                                    <div className="relative z-10 flex items-center gap-4">
                                        {loading ? <RefreshCcw className="animate-spin" size={24} /> : <CheckCircle size={24} />}
                                        {loading ? 'ĐANG XỬ LÝ...' : `XÁC NHẬN PHIẾU ${isReceipt ? 'THU' : 'CHI'}`}
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Quick Info & History */}
                        <div className="space-y-8">
                            {selectedPartner && (
                                <m.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "text-white p-10 rounded-[3.5rem] shadow-2xl transition-all duration-700 flex flex-col justify-between relative overflow-hidden",
                                        isReceipt ? "bg-gradient-to-br from-emerald-500 to-[#065f46]" : "bg-gradient-to-br from-rose-500 to-rose-900"
                                    )}
                                >
                                    <div className="absolute -bottom-10 -right-10 opacity-10">
                                        <Wallet size={240} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="text-[10px] font-black opacity-60 uppercase tracking-[0.5em] mb-3">Số dư công nợ hiện tại</div>
                                        <div className="text-4xl font-black tracking-tighter mb-8 font-mono">{formatDebt(selectedPartner.debt_balance)}</div>
                                        <div className="pt-8 border-t border-white/20 flex flex-col gap-2">
                                            <div className="font-black text-xl uppercase tracking-tighter">{selectedPartner.name}</div>
                                            <div className="text-sm font-bold opacity-60 tracking-widest">{selectedPartner.phone || 'CHƯA CẬP NHẬT SỐ ĐIỆN THOẠI'}</div>
                                        </div>
                                    </div>
                                </m.div>
                            )}

                            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-2 border-[#d4a574]/30 p-8 rounded-[3rem] flex-1 overflow-hidden transition-colors flex flex-col max-h-[600px] shadow-2xl">
                                <h3 className="text-[10px] font-black text-[#8b6f47] dark:text-[#d4a574]/60 uppercase mb-8 flex items-center gap-2 tracking-[0.4em] ml-2">
                                    <History size={16} className="text-[#4a7c59]" /> LỊCH SỬ GIAO DỊCH QUỸ
                                </h3>
                                <div className="space-y-4 overflow-y-auto pr-2 no-scrollbar">
                                    {(Array.isArray(vouchers) ? vouchers : [])
                                        .map((v, idx) => (
                                            <m.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                key={v.id}
                                                className={cn(
                                                    "p-5 rounded-3xl border flex justify-between items-center group transition-all",
                                                    v.source === 'auto'
                                                        ? "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                                                        : "bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-50 dark:border-emerald-900/30 hover:bg-white dark:hover:bg-slate-800"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg relative",
                                                        v.type === 'Receipt' ? "bg-emerald-500" : "bg-rose-500"
                                                    )}>
                                                        {v.type === 'Receipt' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                                        {v.source === 'auto' && (
                                                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
                                                                <span className="text-[6px] font-bold">A</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-black text-gray-800 dark:text-emerald-50 text-sm uppercase tracking-tight">{v.partner_name}</div>
                                                            {v.source === 'auto' && (
                                                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-100/50 text-blue-600 font-bold uppercase tracking-wide">
                                                                    {v.order_display_id ? `Từ đơn hàng #${v.order_display_id}` : 'Từ đơn hàng'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{formatDate(v.date)}</div>
                                                        <div className="text-[10px] text-emerald-600/60 dark:text-emerald-400/40 mt-1 font-bold italic line-clamp-1">{v.note || 'Không có ghi chú'}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-4">
                                                    <div className={cn(
                                                        "font-black text-lg tracking-tighter",
                                                        v.type === 'Receipt' ? "text-emerald-600" : "text-rose-600"
                                                    )}>
                                                        {v.type === 'Receipt' ? '+' : '-'}{formatNumber(v.amount)}
                                                    </div>
                                                    {v.source !== 'auto' && (
                                                        <button
                                                            onClick={() => handleDeleteVoucher(v.id, v.source)}
                                                            className="p-2.5 text-gray-200 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                            title="Xóa phiếu"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </m.div>
                                        ))}
                                    {(!vouchers || vouchers.length === 0) && (
                                        <div className="p-20 text-center text-emerald-600/20 font-black uppercase text-xs tracking-widest">Chưa có giao dịch quỹ</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeMainTab === 'pending' && (
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-6xl"
                    >
                        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-2 border-[#d4a574]/30 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                            <h2 className="text-3xl font-black text-amber-600 uppercase mb-10 flex items-center gap-4">
                                <div className="p-2 bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-500/20">
                                    <History size={28} />
                                </div>
                                Danh sách đơn chờ quyết toán
                            </h2>
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {pendingOrders.map((o, idx) => (
                                    <m.div
                                        key={o.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-8 rounded-[2.5rem] border-2 border-amber-100 dark:border-amber-900/10 bg-white/40 dark:bg-slate-800/40 hover:border-amber-400/50 transition-all flex flex-col md:flex-row justify-between items-center group gap-6"
                                    >
                                        <div className="flex items-center gap-8 w-full md:w-auto">
                                            <div className="w-16 h-16 bg-amber-100/50 dark:bg-amber-900/40 rounded-3xl flex items-center justify-center text-amber-600 shadow-inner shrink-0">
                                                <FileText size={32} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-gray-400 text-xs tracking-widest">#{o.display_id}</span>
                                                    <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-sm", o.type === 'Sale' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                                                        {o.type === 'Sale' ? 'BÁN HÀNG' : 'NHẬP HÀNG'}
                                                    </span>
                                                </div>
                                                <div className="font-black text-gray-900 dark:text-emerald-50 text-2xl uppercase mt-1 tracking-tight transition-colors">{o.partner_name}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                                    <Calendar size={12} /> {formatDate(o.date)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end">
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tổng tiền đơn</div>
                                                <div className="font-black text-3xl text-amber-600 tracking-tighter">{formatNumber(o.total_amount)}</div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setSettleOrder(o);
                                                    setSettleAmount(o.total_amount);
                                                    setSettleNote('');
                                                    setShowSettleModal(true);
                                                }}
                                                className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/20"
                                            >
                                                QUYẾT TOÁN
                                            </button>
                                        </div>
                                    </m.div>
                                ))}
                                {pendingOrders.length === 0 && (
                                    <div className="p-32 text-center flex flex-col items-center gap-6 text-gray-300">
                                        <History size={80} className="opacity-10" />
                                        <div className="font-black uppercase tracking-[0.4em] text-sm">Không có đơn hàng chờ quyết toán</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </m.div>
                )}

                {activeMainTab === 'settlement_history' && (
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-6xl"
                    >
                        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-2 border-[#d4a574]/30 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                                <h2 className="text-3xl font-black text-[#4a7c59] uppercase flex items-center gap-4">
                                    <div className="p-2 bg-[#4a7c59] rounded-2xl text-white shadow-lg shadow-[#4a7c59]/20">
                                        <History size={28} />
                                    </div>
                                    Nhật ký quyết toán công nợ
                                </h2>
                                <div className="px-6 py-3 bg-[#4a7c59]/10 rounded-2xl border border-[#4a7c59]/20">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Tổng nhật ký:</span>
                                    <span className="text-2xl font-black text-[#4a7c59] tracking-tighter">{vouchers.length}</span>
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {vouchers.map((v, idx) => (
                                    <m.div
                                        key={v.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-8 rounded-[2.5rem] bg-white/40 dark:bg-slate-800/40 border-2 border-[#d4a574]/10 hover:border-[#4a7c59]/50 transition-all flex flex-col md:flex-row justify-between items-center group gap-6"
                                    >
                                        <div className="flex items-center gap-8 w-full md:w-auto">
                                            <div className={cn(
                                                "w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform",
                                                v.type === 'Receipt' ? "bg-gradient-to-br from-emerald-500 to-[#065f46] text-white" : "bg-gradient-to-br from-rose-500 to-rose-900 text-white"
                                            )}>
                                                {v.type === 'Receipt' ? <ArrowDownLeft size={32} /> : <ArrowUpRight size={32} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-2xl uppercase tracking-tighter text-gray-900 dark:text-emerald-50">{v.partner_name}</span>
                                                    <span className="text-[9px] bg-blue-100/50 text-blue-600 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                                                        ĐƠN #{v.order_display_id || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                                                    <Calendar size={12} /> {formatDate(v.date)}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-2 italic line-clamp-1">{v.note}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end">
                                            <div className={cn(
                                                "text-3xl font-black tracking-tighter",
                                                v.type === 'Receipt' ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                                {v.type === 'Receipt' ? '+' : '-'}{formatNumber(v.amount)}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteVoucher(v.id, v.source)}
                                                className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-300 hover:text-rose-500 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                                                title="Xóa quyết toán"
                                            >
                                                <Trash2 size={24} />
                                            </button>
                                        </div>
                                    </m.div>
                                ))}
                                {vouchers.length === 0 && (
                                    <div className="p-32 text-center flex flex-col items-center gap-6 text-gray-300">
                                        <History size={80} />
                                        <div className="font-black uppercase tracking-[0.4em] text-sm">Chưa có dữ liệu quyết toán</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </m.div>
                )}
            </div>

            {/* Settle Modal */}
            <AnimatePresence>
                {showSettleModal && settleOrder && (
                    <Portal>
                        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <m.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] overflow-hidden border-2 border-[#f4c430]/30"
                            >
                                <div className="p-10 border-b-2 border-[#f4c430]/10 bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 flex justify-between items-center relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                                        <Coins size={120} className="text-amber-500" />
                                    </div>
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black text-amber-600 uppercase tracking-tighter flex items-center gap-4">
                                            <div className="p-2 bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-500/30">
                                                <Coins size={28} />
                                            </div>
                                            QUYẾT TOÁN VỤ MÙA
                                        </h2>
                                        <div className="text-[10px] font-black text-amber-500/60 uppercase tracking-[0.3em] mt-3">Đơn #{settleOrder.display_id} • {settleOrder.partner_name}</div>
                                    </div>
                                    <button onClick={() => setShowSettleModal(false)} className="p-4 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-3xl transition-all relative z-10 text-amber-600"><X size={32} /></button>
                                </div>
                                <div className="p-10 space-y-10">
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2 font-mono">Số tiền thực {settleOrder.type === 'Sale' ? 'nhận' : 'trả'}</label>
                                        <div className="relative">
                                            <Coins className="absolute left-6 top-8 text-amber-500/40" size={32} />
                                            <input
                                                type="text"
                                                className="w-full pl-16 p-8 bg-amber-50/30 dark:bg-slate-800/50 border-2 border-transparent focus:border-amber-500 rounded-[2.5rem] outline-none font-black text-5xl text-right transition-all shadow-inner dark:text-white"
                                                value={formatNumber(settleAmount)}
                                                onChange={(e) => setSettleAmount(parseFloat(e.target.value.replace(/,/g, '')) || 0)}
                                                onFocus={(e) => e.target.select()}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center p-6 bg-amber-50/50 dark:bg-amber-950/20 rounded-3xl border-2 border-amber-100/50 dark:border-amber-900/30">
                                            <div className="text-center">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">TỔNG ĐƠN</div>
                                                <div className="font-black text-xl text-gray-700 dark:text-gray-200">{formatNumber(settleOrder.total_amount)}</div>
                                            </div>
                                            <div className="w-px h-10 bg-amber-200 dark:bg-amber-800"></div>
                                            <div className="text-center">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">CÒN LẠI (NỢ)</div>
                                                <div className={cn("font-black text-2xl tracking-tighter", settleAmount < settleOrder.total_amount ? "text-rose-500" : "text-emerald-500")}>
                                                    {formatNumber(Math.max(0, settleOrder.total_amount - settleAmount))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2 font-mono">Ghi chú bút lục</label>
                                        <div className="relative">
                                            <FileText className="absolute left-6 top-6 text-amber-500/40" size={24} />
                                            <textarea
                                                className="w-full pl-16 p-6 bg-amber-50/30 dark:bg-slate-800/50 border-2 border-transparent focus:border-amber-500 rounded-[2.5rem] outline-none font-bold h-32 resize-none transition-all shadow-inner dark:text-white"
                                                placeholder="Ghi chú thêm nếu có..."
                                                value={settleNote}
                                                onChange={(e) => setSettleNote(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-6 items-center">
                                        <button
                                            onClick={() => setShowSettleModal(false)}
                                            className="flex-1 px-8 py-6 rounded-[2rem] font-black text-gray-400 uppercase text-xs tracking-widest hover:bg-gray-100 transition-all"
                                        >
                                            Hủy bỏ
                                        </button>
                                        <button
                                            onClick={handleSettleOrder}
                                            disabled={loading}
                                            className="flex-[2] bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 py-6 rounded-[2rem] font-black uppercase text-sm tracking-widest hover:shadow-2xl shadow-amber-500/40 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {loading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN KẾT TOÁN'}
                                        </button>
                                    </div>
                                </div>
                            </m.div>
                        </div>
                    </Portal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
        </div>
    );
}
