import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FileText, Users, Package, Search, Calendar, Filter,
    ArrowUp, ArrowDown, DollarSign, RefreshCw, Printer, AlertCircle, CreditCard,
    Droplets, Wheat, Coins, Leaf, Sprout
} from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import OrderEditPopup from '../components/OrderEditPopup';
import Toast from '../components/Toast';
import Portal from '../components/Portal';

const TabButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={cn(
            "relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 overflow-hidden",
            active
                ? 'text-white'
                : 'text-[#8b6f47] dark:text-[#d4a574]/60 hover:text-[#2d5016] dark:hover:text-[#d4a574] hover:bg-white/30 dark:hover:bg-slate-700/30'
        )}
    >
        {active && (
            <m.div
                layoutId="summaryTabIndicator"
                className="absolute inset-0 bg-gradient-to-r from-[#2d5016] to-[#4a7c59] shadow-lg shadow-[#2d5016]/30"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
        )}
        <span className="relative z-10 flex items-center gap-2">
            {icon}
            {label}
        </span>
    </button>
);

const KPICard = ({ title, value, isMoney = true, gradient = 'bg-primary', icon }) => (
    <m.div
        whileHover={{ y: -8, scale: 1.02 }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
            "relative group overflow-hidden rounded-3xl p-6 shadow-xl border border-white/10 text-white transition-all duration-500",
            gradient
        )}
    >
        {/* Decorative circle */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700 blur-2xl" />

        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner">
                    {icon}
                </div>
            </div>
            <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">{title}</h3>
                <div className="text-2xl font-black tracking-tight flex items-baseline gap-1">
                    {isMoney ? (Number(value) || 0).toLocaleString() : value}
                    {isMoney && <span className="text-xs font-bold opacity-60">₫</span>}
                </div>
            </div>
        </div>

        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
    </m.div>
);


const Summary = () => {
    const [activeTab, setActiveTab] = useState('transactions');
    const [editingOrder, setEditingOrder] = useState(null);
    const [toast, setToast] = useState(null);

    const handleEditOrder = async (item) => {
        if (!item) return;
        const idToCheck = item.display_id || item.ref_id || '';
        const isVoucher = item.isVoucher || item.category === 'Voucher' || (idToCheck.startsWith('PT-')) || (idToCheck.startsWith('PC-'));

        if (isVoucher) {
            setToast({ message: `Đây là phiếu thu/chi (${idToCheck}). Vui lòng xem chi tiết tại tab Sổ Quỹ.`, type: 'info' });
            return;
        }

        let orderToEdit = item;
        const displayId = idToCheck;

        if ((!item.details || !Array.isArray(item.details)) && displayId) {
            try {
                const searchId = displayId.replace('#', '');
                const res = await axios.get(`/api/orders`, { params: { search_id: searchId } });
                const found = Array.isArray(res.data) ? res.data.find(o => o.display_id === displayId) : (res.data.items || []).find(o => o.display_id === displayId);
                if (found) orderToEdit = found;
            } catch (err) {
                console.error("Error fetching order details:", err);
            }
        }
        if (orderToEdit) setEditingOrder(orderToEdit);
    };

    return (
        <div className="flex h-screen flex-col font-sans transition-colors duration-300 overflow-hidden relative">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary opacity-[0.05] blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500 opacity-[0.05] blur-[100px] pointer-events-none"></div>

            <div className="bg-transparent px-6 py-4 flex items-center justify-between z-30 sticky top-0">
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3 drop-shadow-md py-1">
                        <Calendar className="w-8 h-8 text-primary" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-600 uppercase leading-relaxed">SỔ GIAO DỊCH & ĐỐI SOÁT</span>
                    </h1>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest ml-11 opacity-70">Theo dõi dòng tiền, công nợ đối tác và nhật ký kho hàng</p>
                </div>
                <div className="flex space-x-1.5 p-1.5 rounded-2xl glass-panel border-2 border-primary/20 backdrop-blur-md shadow-lg">
                    <TabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<FileText className="w-4 h-4" />} label="Nhật Ký Giao Dịch" />
                    <TabButton active={activeTab === 'partner'} onClick={() => setActiveTab('partner')} icon={<Sprout className="w-4 h-4" />} label="Sổ Công Nợ Đối Tác" />
                    <TabButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Wheat className="w-4 h-4" />} label="Nhật Ký Kho Hàng" />
                </div>
            </div>


            <div className="flex-1 overflow-hidden relative z-20 p-4">
                <AnimatePresence mode="wait">
                    <m.div
                        key={activeTab}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'linear' }}
                        className="h-full"
                    >
                        {activeTab === 'transactions' && <TransactionJournal onEditOrder={handleEditOrder} />}
                        {activeTab === 'partner' && <PartnerLedger onEditOrder={handleEditOrder} />}
                        {activeTab === 'inventory' && <InventoryJournal onEditOrder={handleEditOrder} />}
                    </m.div>
                </AnimatePresence>
            </div>

            <Portal>
                <AnimatePresence>
                    {editingOrder && (
                        <OrderEditPopup order={editingOrder} onClose={() => setEditingOrder(null)} onSave={() => setEditingOrder(null)} />
                    )}
                </AnimatePresence>
            </Portal>
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </AnimatePresence>
        </div>
    );
};

// --- Sub-components ---

const TransactionJournal = ({ onEditOrder }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState({ revenue: 0, expense: 0, count: 0, customerDebt: 0, supplierDebt: 0 });
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [type, setType] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [partnerTerm, setPartnerTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const fetchData = async () => {
        setLoading(true);
        try {
            const orderParams = { start_date: startDate, end_date: endDate, type: type === 'All' ? null : type, search_id: searchTerm, search_partner: partnerTerm };
            const voucherParams = { start_date: startDate, end_date: endDate, search_partner: partnerTerm, search_id: searchTerm };

            const [resOrders, resVouchers, resStats] = await Promise.all([
                axios.get('/api/orders', { params: orderParams }),
                axios.get('/api/cash-vouchers', { params: voucherParams }),
                axios.get('/api/dashboard-stats')
            ]);

            const orders = Array.isArray(resOrders.data) ? resOrders.data : (resOrders.data.items || []);
            const vouchers = Array.isArray(resVouchers.data) ? resVouchers.data : (resVouchers.data.items || []);

            const combined = [
                ...orders.map(o => ({ ...o, isVoucher: false })),
                ...vouchers.map(v => ({
                    ...v,
                    isVoucher: true,
                    display_id: v.type === 'Receipt' ? `PT-${v.id}` : `PC-${v.id}`,
                    total_amount: v.amount,
                    partner_name: v.partner_name || 'Hệ thống'
                }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            // Client-side fallback filter if backend doesn't support it for some reason or for manual vouchers with no clear partner object (though backend filter is preferred)
            const filtered = partnerTerm
                ? combined.filter(t => (t.partner_name || '').toLowerCase().includes(partnerTerm.toLowerCase()))
                : combined;

            setTransactions(filtered);
            let rev = 0, exp = 0;
            combined.forEach(item => {
                if (item.isVoucher) {
                    if (item.type === 'Receipt') rev += item.total_amount;
                    else exp += item.total_amount;
                } else {
                    if (item.type === 'Sale') rev += item.amount_paid;
                    if (item.type === 'Purchase') exp += item.amount_paid;
                }
            });
            setKpis({
                revenue: rev,
                expense: exp,
                count: combined.length,
                customerDebt: resStats.data.customer_debt || 0,
                supplierDebt: resStats.data.supplier_debt || 0
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { setPage(1); fetchData(); }, [startDate, endDate, type, searchTerm, partnerTerm]);

    const totalPages = Math.ceil(transactions.length / pageSize);
    const pagedTransactions = transactions.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <KPICard title="Tổng Thu Tiền" value={kpis.revenue} gradient="bg-gradient-to-br from-primary to-emerald-600" icon={<ArrowUp size={20} strokeWidth={3} />} />
                <KPICard title="Tổng Chi Tiền" value={kpis.expense} gradient="bg-gradient-to-br from-rose-500 to-rose-700" icon={<ArrowDown size={20} strokeWidth={3} />} />
                <KPICard title="Giao Dịch" value={kpis.count} isMoney={false} gradient="bg-gradient-to-br from-[#d4a574] to-[#f4c430]" icon={<FileText size={20} strokeWidth={3} />} />
                <KPICard title="Tổng Phải Thu" value={kpis.customerDebt} gradient="bg-gradient-to-br from-[#4a7c59] to-[#87ceeb]" icon={<Coins size={20} strokeWidth={3} />} />
                <KPICard title="Tổng Phải Trả" value={kpis.supplierDebt} gradient="bg-gradient-to-br from-[#8b6f47] to-[#6b4423]" icon={<CreditCard size={20} strokeWidth={3} />} />
            </div>

            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-lg p-4 rounded-2xl shadow-lg border-2 border-[#d4a574]/30 mb-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-[#4a7c59]" />
                    <input type="date" className="bg-transparent border-b-2 border-[#d4a574]/20 outline-none text-sm font-bold text-[#2d5016]" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
                    <span className="text-gray-400">→</span>
                    <input type="date" className="bg-transparent border-b-2 border-[#d4a574]/20 outline-none text-sm font-bold text-[#2d5016]" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
                </div>
                <select className="bg-transparent border-b-2 border-[#d4a574]/20 outline-none text-sm font-bold text-[#2d5016]" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
                    <option value="All">Tất cả loại</option>
                    <option value="Sale">Chỉ Bán Hàng</option>
                    <option value="Purchase">Chỉ Nhập Hàng</option>
                </select>
                <div className="flex-1 min-w-[180px] relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6f47]" />
                    <input type="text" placeholder="Mã chứng từ..." className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-slate-900/50 border-2 border-[#d4a574]/20 rounded-xl text-sm outline-none focus:ring-2 ring-[#2d5016]/20 font-medium" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
                </div>
                <div className="flex-1 min-w-[180px] relative">
                    <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6f47]" />
                    <input type="text" placeholder="Tên khách hàng..." className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-slate-900/50 border-2 border-[#d4a574]/20 rounded-xl text-sm outline-none focus:ring-2 ring-[#2d5016]/20 font-medium" value={partnerTerm} onChange={e => { setPartnerTerm(e.target.value); setPage(1); }} />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#8b6f47] uppercase">Hiển thị:</span>
                    <select
                        value={pageSize}
                        onChange={e => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                        className="bg-transparent border-b-2 border-[#d4a574]/20 outline-none text-sm font-bold text-[#2d5016]"
                    >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
                <button onClick={fetchData} className="p-2 hover:bg-white/50 rounded-xl text-[#4a7c59] transition-colors border-2 border-transparent hover:border-[#d4a574]/30">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-xl border-2 border-[#d4a574]/30 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#2d5016]/10 sticky top-0 z-10 border-b-2 border-[#d4a574]/40 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-4 font-bold text-[#2d5016]">Ngày giờ</th>
                                <th className="px-6 py-4 font-bold text-[#2d5016]">Chứng Từ</th>
                                <th className="px-6 py-4 font-bold text-[#2d5016]">Loại</th>
                                <th className="px-6 py-4 font-bold text-[#2d5016]">Đối Tác</th>
                                <th className="px-6 py-4 font-bold text-[#2d5016] text-right">Giá Trị</th>
                                <th className="px-6 py-4 font-bold text-[#2d5016]">Ghi Chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#d4a574]/10">
                            {loading ? (
                                <tr className="animate-shimmer-fast"><td colSpan="6" className="text-center py-10 font-black opacity-50">Đang tải dữ liệu, vui lòng chờ...</td></tr>
                            ) : transactions.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-10">Không có dữ liệu</td></tr>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {pagedTransactions.map((item, idx) => (
                                        <m.tr
                                            key={`${item.isVoucher ? 'v' : 'o'}-${item.id}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                                            className="hover:bg-[#d4a574]/5 transition-colors border-b border-[#d4a574]/10"
                                        >
                                            <td className="px-6 py-3 text-xs">{new Date(item.date).toLocaleString('vi-VN')}</td>
                                            <td className="px-6 py-3 font-bold text-[#2d5016] cursor-pointer hover:underline" onClick={() => onEditOrder(item)}>
                                                {item.display_id}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-md text-[10px] font-black uppercase whitespace-nowrap shadow-sm border",
                                                    item.type === 'Sale' && item.payment_method !== 'Debt' && "bg-emerald-100 text-emerald-700 border-emerald-200",
                                                    item.type === 'Sale' && item.payment_method === 'Debt' && "bg-purple-100 text-purple-700 border-purple-200",
                                                    item.type === 'Purchase' && item.payment_method !== 'Debt' && "bg-amber-100 text-amber-700 border-amber-200",
                                                    item.type === 'Purchase' && item.payment_method === 'Debt' && "bg-orange-100 text-orange-700 border-orange-200",
                                                    item.type === 'Receipt' && "bg-blue-100 text-blue-700 border-blue-200",
                                                    item.type === 'Payment' && "bg-rose-100 text-rose-700 border-rose-200"
                                                )}>
                                                    {item.isVoucher
                                                        ? (item.type === 'Receipt' ? 'Phiếu thu' : 'Phiếu chi')
                                                        : `${item.type === 'Sale' ? 'Bán hàng' : 'Nhập hàng'} • ${item.payment_method === 'Debt' ? 'Ghi nợ' : (item.payment_method || 'Tiền mặt')}`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 font-medium">{item.partner_name}</td>
                                            <td className="px-6 py-3 text-right font-black">{(item.total_amount || 0).toLocaleString()} ₫</td>
                                            <td className="px-6 py-3 text-xs italic opacity-60 truncate max-w-xs">{item.note}</td>
                                        </m.tr>
                                    ))}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>

                {transactions.length > 0 && (
                    <div className="px-6 py-4 bg-[#2d5016]/5 border-t-2 border-[#d4a574]/20 flex justify-between items-center bg-[#faf8f3]/30 backdrop-blur-md">
                        <div className="text-xs font-bold text-[#8b6f47]">
                            Hiển thị <span className="text-[#2d5016]">{(page - 1) * pageSize + 1} - {Math.min(page * pageSize, transactions.length)}</span> trên tổng số <span className="text-[#2d5016]">{transactions.length}</span> giao dịch
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-4 py-2 border-2 border-[#d4a574]/30 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-[#d4a574]/10 transition-all text-[#2d5016]"
                            >
                                Trước
                            </button>
                            {[...Array(totalPages)].map((_, i) => {
                                const pNum = i + 1;
                                if (pNum === 1 || pNum === totalPages || (pNum >= page - 2 && pNum <= page + 2)) {
                                    return (
                                        <button
                                            key={pNum}
                                            onClick={() => setPage(pNum)}
                                            className={cn(
                                                "w-9 h-9 rounded-xl text-xs font-black transition-all",
                                                page === pNum
                                                    ? "bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white shadow-lg shadow-[#2d5016]/30 border-0"
                                                    : "hover:bg-[#d4a574]/10 text-[#8b6f47] border-2 border-[#d4a574]/30"
                                            )}
                                        >
                                            {pNum}
                                        </button>
                                    );
                                }
                                if (pNum === page - 3 || pNum === page + 3) return <span key={pNum} className="px-1 text-[#d4a574]">...</span>;
                                return null;
                            })}
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className="px-4 py-2 border-2 border-[#d4a574]/30 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-[#d4a574]/10 transition-all text-[#2d5016]"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const PartnerLedger = ({ onEditOrder }) => {
    const [partners, setPartners] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState({ customerDebt: 0, supplierDebt: 0 });

    useEffect(() => {
        axios.get('/api/dashboard-stats')
            .then(res => setStats({
                customerDebt: res.data.customer_debt || 0,
                supplierDebt: res.data.supplier_debt || 0
            }))
            .catch(console.error);
    }, []);

    useEffect(() => {
        axios.get('/api/partners', { params: { search, limit: 100 } })
            .then(res => setPartners(Array.isArray(res.data) ? res.data : (res.data.items || [])))
            .catch(console.error);
    }, [search]);

    const selectPartner = async (p) => {
        setSelectedPartner(p);
        setLoading(true);
        try {
            const res = await axios.get(`/api/partners/${p.id}/ledger`);
            setLedger(res.data.ledger || []);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <KPICard title="Tổng Phải Thu" value={stats.customerDebt} gradient="bg-gradient-to-br from-[#4a7c59] to-[#87ceeb]" icon={<Coins size={20} strokeWidth={3} />} />
                <KPICard title="Tổng Phải Trả" value={stats.supplierDebt} gradient="bg-gradient-to-br from-[#8b6f47] to-[#6b4423]" icon={<CreditCard size={20} strokeWidth={3} />} />
            </div>
            <div className="flex-1 flex gap-4 overflow-hidden">
                <div className="w-80 bg-white/60 dark:bg-slate-800/60 rounded-2xl border-2 border-[#d4a574]/30 flex flex-col overflow-hidden">
                    <div className="p-4 border-b-2 border-[#d4a574]/20">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6f47]" />
                            <input type="text" placeholder="Tìm đối tác..." className="w-full pl-9 pr-4 py-2 border-2 border-[#d4a574]/20 rounded-xl text-sm outline-none" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {partners.map(p => (
                            <div key={p.id} onClick={() => selectPartner(p)} className={`p-3 rounded-xl cursor-pointer mb-1 transition-all ${selectedPartner?.id === p.id ? 'bg-[#2d5016] text-white shadow-lg' : 'hover:bg-[#d4a574]/10'}`}>
                                <div className="font-bold text-sm">{p.name}</div>
                                <div className={`text-[10px] font-black ${selectedPartner?.id === p.id ? 'text-white/70' : 'text-[#8b6f47]'}`}>
                                    NỢ: {p.debt_balance.toLocaleString()} ₫
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-1 bg-white/60 dark:bg-slate-800/60 rounded-2xl border-2 border-[#d4a574]/30 overflow-hidden flex flex-col">
                    {selectedPartner ? (
                        <div className="flex flex-col h-full overflow-hidden">
                            <div className="p-6 bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white">
                                <h2 className="text-xl font-black uppercase tracking-tight">{selectedPartner.name}</h2>
                                <p className="text-xs opacity-80 mt-1">DƯ NỢ HIỆN TẠI: {selectedPartner.debt_balance.toLocaleString()} ₫</p>
                            </div>
                            <div className="flex-1 overflow-auto p-4">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-[10px] uppercase text-gray-400 font-black tracking-widest border-b">
                                        <tr><th className="p-3">Ngày</th><th className="p-3">Chứng từ</th><th className="p-3">Diễn giải</th><th className="p-3 text-right">Phát sinh</th><th className="p-3 text-right">Dư nợ</th></tr>
                                    </thead>
                                    <tbody>
                                        {loading ? <tr><td colSpan="5" className="text-center p-10">Đang tải...</td></tr> : ledger.map((row, i) => (
                                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                                <td className="p-3 text-xs">{new Date(row.date).toLocaleDateString('vi-VN')}</td>
                                                <td className="p-3 font-bold text-[#2d5016] cursor-pointer" onClick={() => onEditOrder(row.obj)}>{row.ref_id}</td>
                                                <td className="p-3 text-xs">{row.desc}</td>
                                                <td className={`p-3 text-right font-bold ${row.type === 'Order' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {row.type === 'Order' ? `+${row.obj.total_amount.toLocaleString()}` : `-${row.obj.amount.toLocaleString()}`}
                                                </td>
                                                <td className="p-3 text-right font-black">{row.running_balance.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                            <Users size={64} className="opacity-20" />
                            <p className="font-bold uppercase tracking-widest text-xs">Chọn đối tác để xem sổ phụ</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const InventoryJournal = ({ onEditOrder }) => {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            axios.get('/api/products', { params: { search, limit: 100 } })
                .then(res => setProducts(Array.isArray(res.data) ? res.data : (res.data.items || [])))
                .catch(console.error);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const selectProduct = async (p) => {
        setSelectedProduct(p);
        setLoading(true);
        try {
            const res = await axios.get(`/api/products/${p.id}/history`);
            setHistory(res.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    return (
        <div className="h-full flex gap-4 overflow-hidden">
            <div className="w-80 bg-white/60 dark:bg-slate-800/60 rounded-2xl border-2 border-[#d4a574]/30 flex flex-col overflow-hidden">
                <div className="p-4 border-b-2 border-[#d4a574]/20">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6f47]" />
                        <input type="text" placeholder="Tìm sản phẩm..." className="w-full pl-9 pr-4 py-2 border-2 border-[#d4a574]/20 rounded-xl text-sm outline-none" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 text-xs">
                    {products.map(p => (
                        <div key={p.id} onClick={() => selectProduct(p)} className={`p-3 rounded-xl cursor-pointer mb-1 transition-all ${selectedProduct?.id === p.id ? 'bg-[#2d5016] text-white' : 'hover:bg-[#d4a574]/10'}`}>
                            <div className="font-bold">{p.name}</div>
                            <div className="opacity-70">TỒN KHO: {p.stock} {p.unit}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 bg-white/60 dark:bg-slate-800/60 rounded-2xl border-2 border-[#d4a574]/30 overflow-hidden flex flex-col">
                {selectedProduct ? (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="p-6 bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white">
                            <h2 className="text-xl font-black uppercase">{selectedProduct.name}</h2>
                            <p className="text-xs opacity-80 mt-1">CHI TIẾT NHẬP XUẤT KHO</p>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase text-gray-400 font-black tracking-widest border-b">
                                    <tr><th className="p-3">Ngày</th><th className="p-3">Chứng từ</th><th className="p-3">Loại</th><th className="p-3 text-right">Thay đổi</th></tr>
                                </thead>
                                <tbody>
                                    {loading ? <tr><td colSpan="4" className="text-center p-10">Đang tải...</td></tr> : history.map((item, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="p-3 text-xs">{new Date(item.date).toLocaleDateString('vi-VN')}</td>
                                            <td className="p-3 font-bold text-[#2d5016] cursor-pointer" onClick={() => onEditOrder(item)}>{item.display_id}</td>
                                            <td className="p-3 text-xs font-bold uppercase">{item.type}</td>
                                            <td className={`p-3 text-right font-black ${item.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {item.quantity_change > 0 ? `+${item.quantity_change}` : item.quantity_change}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                        <Package size={64} className="opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-xs">Chọn sản phẩm để xem nhật ký kho</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Summary;
