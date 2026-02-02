import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { m, AnimatePresence } from 'framer-motion';
import { Search, Eye, TrendingUp, TrendingDown, Calendar, X, FileText, Trash2, Edit, ChevronUp, ChevronDown, ArrowUpDown, Wheat, Droplets, Leaf, Sprout, Coins, User, History as HistoryIcon } from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_SETTINGS } from '../lib/settings';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import Portal from '../components/Portal';

export default function History() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Sale'); // Sale, Purchase
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [day, setDay] = useState(new Date().getDate());

    // Input states
    const [searchPartner, setSearchPartner] = useState('');
    const [searchId, setSearchId] = useState('');
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    // Query states
    const [searchPartnerQuery, setSearchPartnerQuery] = useState('');
    const [searchIdQuery, setSearchIdQuery] = useState('');
    const [minPriceQuery, setMinPriceQuery] = useState("");
    const [maxPriceQuery, setMaxPriceQuery] = useState("");
    const [paymentMethod, setPaymentMethod] = useState(""); // "", "Cash", "Debt", "Pending"

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [limit, setLimit] = useState(30);
    const [scale, setScale] = useState(1);
    const navigate = useNavigate();
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null); // { title, message, onConfirm, type }

    // Sorting state
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    const years = [];
    for (let i = 2023; i <= new Date().getFullYear() + 1; i++) years.push(i);

    useEffect(() => {
        fetchOrders();
    }, [page, activeTab, year, month, day, limit, searchPartnerQuery, searchIdQuery, minPriceQuery, maxPriceQuery, sortBy, sortOrder, paymentMethod]);

    useEffect(() => {
        fetchSettings();
    }, [activeTab]);

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`/api/print-templates?module=${activeTab}`);
            const data = res.data;
            if (data && data.length > 0) {
                const defaultTemplate = data.find(t => t.is_default) || data[0];
                if (defaultTemplate) {
                    try {
                        const config = JSON.parse(defaultTemplate.config);
                        setSettings(prev => ({ ...prev, ...config }));
                    } catch (e) { console.error(e); }
                }
            } else {
                const oldRes = await axios.get('/api/settings');
                if (Object.keys(oldRes.data).length > 0) setSettings(prev => ({ ...prev, ...oldRes.data }));
            }
        } catch (err) { console.error(err); }
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/orders`, {
                params: {
                    type: activeTab,
                    year, month, day,
                    search_partner: searchPartnerQuery,
                    search_id: searchIdQuery,
                    minPrice: minPriceQuery,
                    maxPrice: maxPriceQuery,
                    page, limit,
                    sort_by: sortBy,
                    sort_order: sortOrder,
                    payment_method: paymentMethod || undefined
                }
            });
            if (res.data.items) {
                setOrders(res.data.items);
                setTotalPages(res.data.pages);
                setTotalItems(res.data.total);
            } else {
                setOrders(res.data);
                setTotalPages(1);
                setTotalItems(res.data.length);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setSelectedOrder(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        if (selectedOrder) {
            document.body.style.overflow = 'hidden';
            const mainContent = document.getElementById('main-content');
            if (mainContent) mainContent.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            const mainContent = document.getElementById('main-content');
            if (mainContent) mainContent.style.overflow = 'auto';
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            const mainContent = document.getElementById('main-content');
            if (mainContent) mainContent.style.overflow = 'auto';
        };
    }, [selectedOrder]);

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
        setSearchPartnerQuery(searchPartner);
        setSearchIdQuery(searchId);
        setMinPriceQuery(minPrice);
        setMaxPriceQuery(maxPrice);
        setPage(1);
    };

    const handleClearSearch = () => {
        setSearchPartner('');
        setSearchId('');
        setMinPrice('');
        setMaxPrice('');
        setSearchPartnerQuery('');
        setSearchIdQuery('');
        setMinPriceQuery('');
        setMaxPriceQuery('');
        setPaymentMethod('');
        setPage(1);
    };

    const handleDelete = (id) => {
        setConfirm({
            title: "Xác nhận xóa",
            message: "Bạn có chắc chắn muốn XÓA đơn hàng này? Thao tác này sẽ cập nhật lại kho và công nợ.",
            onConfirm: async () => {
                try {
                    await axios.delete(`/api/orders/${id}`);
                    setToast({ message: "Đã xóa đơn hàng thành công", type: "success" });
                    fetchOrders();
                } catch (err) {
                    setToast({ message: err.response?.data?.error || "Lỗi khi xóa đơn hàng", type: "error" });
                }
                setConfirm(null);
            },
            type: "danger"
        });
    };

    return (
        <div className="p-4 md:p-8 pb-20 w-full max-w-[98%] mx-auto transition-colors">
            <div className="no-print space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 px-4 md:px-0">
                    <div>
                        <h1 className="text-4xl font-black text-[#2d5016] dark:text-[#d4a574] uppercase tracking-tighter flex items-center gap-3">
                            <HistoryIcon size={36} className="text-[#4a7c59]" />
                            Nhật Ký Vụ Mùa
                        </h1>
                        <p className="text-[#8b6f47] dark:text-[#d4a574]/60 font-medium tracking-tight">Tra cứu lịch sử bán hàng và nhập hàng</p>
                    </div>
                    <div className="flex p-1.5 bg-gradient-to-r from-[#faf8f3] to-[#f5f1e8] dark:from-slate-900 dark:to-slate-800 rounded-2xl border-2 border-[#d4a574]/30 shadow-sm relative">
                        <button
                            onClick={() => { setActiveTab('Sale'); setPage(1); }}
                            className={cn(
                                "relative z-10 px-8 py-2.5 rounded-xl text-sm font-black uppercase transition-all flex items-center gap-2",
                                activeTab === 'Sale' ? "text-white" : "text-[#8b6f47] hover:text-[#2d5016] dark:text-[#d4a574]/60 dark:hover:text-[#d4a574]"
                            )}
                        >
                            <Wheat size={18} /> BÁN HÀNG
                            {activeTab === 'Sale' && (
                                <m.div
                                    layoutId="activeTabIndicator"
                                    className="absolute inset-0 bg-gradient-to-r from-[#2d5016] to-[#4a7c59] rounded-xl -z-10 shadow-lg shadow-[#2d5016]/20"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveTab('Purchase'); setPage(1); }}
                            className={cn(
                                "relative z-10 px-8 py-2.5 rounded-xl text-sm font-black uppercase transition-all flex items-center gap-2",
                                activeTab === 'Purchase' ? "text-white" : "text-[#8b6f47] hover:text-[#2d5016] dark:text-[#d4a574]/60 dark:hover:text-[#d4a574]"
                            )}
                        >
                            <Sprout size={18} /> NHẬP HÀNG
                            {activeTab === 'Purchase' && (
                                <m.div
                                    layoutId="activeTabIndicator"
                                    className="absolute inset-0 bg-gradient-to-r from-[#2d5016] to-[#4a7c59] rounded-xl -z-10 shadow-lg shadow-[#2d5016]/20"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </button>
                    </div>
                </div>

                <div className="border-2 border-[#d4a574]/30 bg-gradient-to-br from-[#faf8f3]/95 to-[#f5f1e8]/95 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-xl p-6 rounded-[2rem] space-y-6 shadow-xl relative overflow-hidden">
                    {/* Subtle wheat grain pattern overlay */}
                    <div className="absolute inset-0 opacity-[0.01] pointer-events-none" style={{
                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(139, 111, 71, 0.05) 20px, rgba(139, 111, 71, 0.05) 40px)`,
                        backgroundSize: '80px 80px'
                    }}></div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
                        <div className="md:col-span-9 flex items-center gap-3 bg-white/80 dark:bg-slate-900/80 border-2 border-[#d4a574]/20 p-3 rounded-2xl transition-all hover:shadow-lg backdrop-blur-md">
                            <Calendar size={20} className="ml-2 text-[#4a7c59]" />
                            <select value={day} onChange={(e) => { setDay(e.target.value); setPage(1); }} className="bg-transparent border-none outline-none font-black text-sm text-[#2d5016] dark:text-white cursor-pointer hover:text-[#4a7c59] transition-colors uppercase">
                                <option value="">Ngày: Tất cả</option>
                                {[...Array(31)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                            </select>
                            <div className="w-px h-6 bg-[#d4a574]/30 mx-1"></div>
                            <select value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} className="bg-transparent border-none outline-none font-black text-sm text-[#2d5016] dark:text-white cursor-pointer hover:text-[#4a7c59] transition-colors uppercase">
                                <option value="">Tháng: Tất cả</option>
                                {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                            </select>
                            <div className="w-px h-6 bg-[#d4a574]/30 mx-1"></div>
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-black text-[#8b6f47] uppercase">Năm:</span>
                                <select value={year} onChange={(e) => { setYear(parseInt(e.target.value)); setPage(1); }} className="bg-transparent border-none outline-none font-black text-sm text-[#2d5016] dark:text-white cursor-pointer hover:text-[#4a7c59] transition-colors pr-4 uppercase">
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="md:col-span-3">
                            <button onClick={handleSearchTrigger} className="w-full h-full bg-gradient-to-r from-[#f4c430] to-[#d4a574] text-white p-3 rounded-2xl font-black uppercase text-xs hover:shadow-xl hover:shadow-[#f4c430]/30 transition-all flex items-center justify-center gap-2">
                                <Search size={18} /> Lọc kết quả
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-2 border-t-2 border-[#d4a574]/20 relative z-10">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-[#8b6f47]">Số tiền ($):</span>
                            <div className="flex items-center gap-1">
                                <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-24 px-3 py-2 bg-white/80 dark:bg-slate-900/80 border-2 border-[#d4a574]/20 focus:border-[#2d5016] rounded-xl outline-none font-bold text-xs dark:text-white transition-all" />
                                <span className="text-[#d4a574]">→</span>
                                <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-24 px-3 py-2 bg-white/80 dark:bg-slate-900/80 border-2 border-[#d4a574]/20 focus:border-[#2d5016] rounded-xl outline-none font-bold text-xs dark:text-white transition-all" />
                            </div>
                        </div>

                        <div className="relative flex-1 min-w-[180px]">
                            <User className="absolute left-3 top-2.5 text-[#4a7c59]/50" size={16} />
                            <input
                                type="text"
                                placeholder="Tìm khách hàng..."
                                value={searchPartner}
                                onChange={e => setSearchPartner(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearchTrigger()}
                                className="w-full pl-9 pr-4 py-2 bg-white/80 dark:bg-slate-900/80 border-2 border-[#d4a574]/20 focus:border-[#2d5016] rounded-xl focus:outline-none font-bold transition-all text-xs dark:text-white"
                            />
                        </div>

                        <div className="relative flex-1 min-w-[140px]">
                            <FileText className="absolute left-3 top-2.5 text-[#4a7c59]/50" size={16} />
                            <input
                                type="text"
                                placeholder="Mã đơn..."
                                value={searchId}
                                onChange={e => setSearchId(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearchTrigger()}
                                className="w-full pl-9 pr-4 py-2 bg-white/80 dark:bg-slate-900/80 border-2 border-[#d4a574]/20 focus:border-[#2d5016] rounded-xl focus:outline-none font-bold transition-all text-xs dark:text-white"
                            />
                        </div>

                        <div className="flex bg-[#2d5016]/10 dark:bg-[#4a7c59]/20 p-1.5 rounded-xl border border-[#d4a574]/30">
                            {['', 'Cash', 'Debt', 'Pending'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => { setPaymentMethod(m); setPage(1); }}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[9px] font-black transition-all whitespace-nowrap",
                                        paymentMethod === m ? "bg-[#2d5016] text-white shadow-md scale-105" : "text-[#8b6f47]/60 hover:text-[#2d5016] uppercase"
                                    )}
                                >
                                    {m === '' ? 'TẤT CẢ' : m === 'Cash' ? 'TIỀN MẶT' : m === 'Pending' ? 'CHỜ T/T' : 'CÔNG NỢ'}
                                </button>
                            ))}
                        </div>

                        {(searchPartnerQuery || searchIdQuery || minPriceQuery || maxPriceQuery) && (
                            <button onClick={handleClearSearch} className="px-3 py-2 text-rose-500 hover:text-rose-600 font-black text-[10px] uppercase transition-colors flex items-center gap-1 group">
                                <X size={14} className="group-hover:rotate-90 transition-transform" />
                                <span>Xóa lọc</span>
                            </button>
                        )}

                        <div className="flex items-center gap-3 ml-auto">
                            <span className="text-[10px] font-black uppercase text-[#8b6f47]">Dòng:</span>
                            <select value={limit} onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }} className="bg-white/80 dark:bg-slate-950/80 border-2 border-[#d4a574]/30 rounded-xl px-3 py-1 text-[10px] font-black outline-none dark:text-white uppercase cursor-pointer hover:bg-[#d4a574]/10 transition-colors shadow-sm focus:ring-4 focus:ring-[#2d5016]/10">
                                <option value={10}>10 dòng</option>
                                <option value={20}>20 dòng</option>
                                <option value={30}>30 dòng</option>
                                <option value={50}>50 dòng</option>
                                <option value={100}>100 dòng</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border-2 border-[#d4a574]/30 bg-gradient-to-br from-[#faf8f3]/95 to-[#f5f1e8]/95 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-xl rounded-[2rem] shadow-xl overflow-hidden min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <m.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="p-20 text-center flex flex-col items-center gap-4"
                            >
                                <div className="w-12 h-12 border-4 border-[#2d5016]/20 border-t-[#2d5016] rounded-full animate-spin"></div>
                                <div className="text-[#8b6f47] font-black uppercase text-xs tracking-[0.2em]">Đang tải dữ liệu...</div>
                            </m.div>
                        ) : (
                            <m.div
                                key={activeTab + page}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.3 }}
                                className="w-full"
                            >
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gradient-to-r from-[#2d5016]/10 via-[#4a7c59]/8 to-[#2d5016]/10 border-b-2 border-[#d4a574]/40 transition-colors uppercase text-[10px] font-black tracking-widest text-[#2d5016] dark:text-[#d4a574]">
                                        <tr>
                                            <th onClick={() => handleSort('display_id')} className="p-4 cursor-pointer hover:text-[#4a7c59] transition-colors group">
                                                <div className="flex items-center gap-1">MÃ <SortIcon field="display_id" /></div>
                                            </th>
                                            <th onClick={() => handleSort('date')} className="p-4 cursor-pointer hover:text-[#4a7c59] transition-colors group">
                                                <div className="flex items-center gap-1">NGÀY GIỜ <SortIcon field="date" /></div>
                                            </th>
                                            <th className="p-4">ĐỐI TÁC</th>
                                            <th onClick={() => handleSort('total_amount')} className="p-4 text-right cursor-pointer hover:text-[#4a7c59] transition-colors group">
                                                <div className="flex items-center justify-end gap-1">TỔNG TIỀN <SortIcon field="total_amount" /></div>
                                            </th>
                                            <th className="p-4 text-right text-[#4a7c59]">Số lượng</th>
                                            <th className="p-4 text-right text-rose-600 dark:text-rose-400">PTTT</th>
                                            <th className="p-4 text-center">THAO TÁC</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#d4a574]/10">
                                        <AnimatePresence>
                                            {orders.map((o, idx) => (
                                                <m.tr
                                                    key={o.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: idx * 0.02, duration: 0.3 }}
                                                    className="hover:bg-[#d4a574]/5 dark:hover:bg-slate-800/50 group transition-colors"
                                                >
                                                    <td className="p-4 font-bold text-[#8b6f47]">#{o.display_id || o.id}</td>
                                                    <td className="p-4 text-[#8b6f47] dark:text-gray-400 text-sm whitespace-nowrap">{formatDate(o.date)}</td>
                                                    <td className="p-4 font-black text-[#2d5016] dark:text-gray-100 uppercase text-xs tracking-tight">{o.partner_name}</td>
                                                    <td className={cn("p-4 text-right font-black text-lg", o.total_amount < 0 ? "text-amber-500" : "text-[#2d5016] dark:text-[#4a7c59]")}>
                                                        {formatNumber(o.total_amount)}
                                                        {o.total_amount < 0 && <div className="text-[9px] uppercase font-black text-amber-500/60 mt-0.5 tracking-wider">Khách trả hàng</div>}
                                                    </td>
                                                    <td className="p-4 text-right text-[#8b6f47] font-bold text-xs">{o.details?.length || 0} sản phẩm</td>
                                                    <td className="p-4 text-right">
                                                        {o.total_amount < 0 ? (
                                                            <span className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                                                o.payment_method === 'Debt' ? "bg-orange-100 text-orange-600" :
                                                                    o.payment_method === 'Cash' ? "bg-purple-100 text-purple-600" :
                                                                        "bg-gray-100 text-gray-500"
                                                            )}>
                                                                {o.payment_method === 'Debt' ? 'TRỪ CÔNG NỢ' : o.payment_method === 'Cash' ? 'HOÀN TIỀN' : 'CHỜ XỬ LÝ'}
                                                            </span>
                                                        ) : (
                                                            <span className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                                                o.payment_method === 'Cash' ? "bg-[#2d5016]/10 text-[#2d5016]" :
                                                                    o.payment_method === 'Pending' ? "bg-[#f4c430]/20 text-[#8b6f47]" :
                                                                        (o.amount_paid >= o.total_amount ? "bg-blue-100 text-blue-600" : "bg-rose-100 text-rose-600")
                                                            )}>
                                                                {o.payment_method === 'Cash' ? 'TIỀN MẶT' : o.payment_method === 'Pending' ? 'CHỜ T/T' : (o.amount_paid >= o.total_amount ? 'TẤT TOÁN' : 'CÔNG NỢ')}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                                                        <button onClick={() => setSelectedOrder(o)} className="p-2 text-gray-400 hover:text-[#4a7c59] transition-colors" title="Xem chi tiết"><Eye size={18} /></button>
                                                        <button onClick={() => navigate(activeTab === 'Sale' ? '/pos' : '/purchase', { state: { editOrder: o } })} className="p-2 text-[#f4c430] hover:bg-[#f4c430]/10 rounded-lg transition-colors" title="Chỉnh sửa"><Edit size={18} /></button>
                                                        <button onClick={() => handleDelete(o.id)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors" title="Xóa"><Trash2 size={18} /></button>
                                                    </td>
                                                </m.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                                {orders.length === 0 && <div className="p-20 text-center text-[#8b6f47] font-bold uppercase tracking-widest text-sm">Không tìm thấy giao dịch nào.</div>}

                                <div className="p-4 bg-gradient-to-r from-[#faf8f3]/50 to-[#f5f1e8]/50 dark:bg-[#2d5016]/5 border-t-2 border-[#d4a574]/20 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="text-[10px] font-black text-[#8b6f47] uppercase tracking-widest">Hiển thị <span className="text-[#2d5016] dark:text-[#4a7c59]">{(page - 1) * limit + 1} - {Math.min(page * limit, totalItems)}</span> trên tổng số <span className="text-[#2d5016] dark:text-[#4a7c59]">{totalItems}</span> đơn</div>
                                    <div className="flex items-center gap-1.5">
                                        <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-5 py-2.5 border-2 border-[#d4a574]/30 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-[#d4a574]/10 transition-all text-[#2d5016] dark:text-[#d4a574]">Trước</button>
                                        {[...Array(totalPages)].map((_, i) => {
                                            const pNum = i + 1;
                                            if (pNum === 1 || pNum === totalPages || (pNum >= page - 2 && pNum <= page + 2)) {
                                                return <button key={pNum} onClick={() => setPage(pNum)} className={cn("w-10 h-10 rounded-2xl text-[10px] font-black transition-all", page === pNum ? "bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white shadow-lg shadow-[#2d5016]/30 border-0" : "hover:bg-[#d4a574]/10 text-[#8b6f47] dark:text-[#d4a574]/60 border-2 border-[#d4a574]/30")}>{pNum}</button>;
                                            }
                                            if (pNum === page - 3 || pNum === page + 3) return <span key={pNum} className="px-1 text-[#d4a574]">...</span>;
                                            return null;
                                        })}
                                        <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-5 py-2.5 border-2 border-[#d4a574]/30 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-[#d4a574]/10 transition-all text-[#2d5016] dark:text-[#d4a574]">Sau</button>
                                    </div>
                                </div>
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Modal Chi tiết đơn hàng */}
            <AnimatePresence>
                {selectedOrder && (
                    <Portal>
                        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
                            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                            <m.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl border-2 border-[#d4a574]/30 flex flex-col">
                                <div className="flex justify-between items-center p-6 border-b-2 border-[#d4a574]/20 bg-gradient-to-r from-[#faf8f3] to-[#f5f1e8] dark:from-slate-800 dark:to-slate-700 transition-colors">
                                    <div className="flex flex-col">
                                        <h3 className="text-xl font-black text-[#2d5016] dark:text-[#d4a574] uppercase tracking-tighter">Chi tiết giao dịch</h3>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[10px] font-black text-[#8b6f47] uppercase tracking-widest">Phóng to:</span>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="1.5"
                                                step="0.1"
                                                value={scale}
                                                onChange={(e) => setScale(parseFloat(e.target.value))}
                                                className="w-32 h-1.5 bg-[#d4a574]/20 rounded-lg appearance-none cursor-pointer accent-[#2d5016]"
                                            />
                                            <span className="text-[10px] font-black text-[#4a7c59]">{Math.round(scale * 100)}%</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-gray-400 hover:text-rose-500 rounded-xl transition-all"><X size={24} /></button>
                                </div>
                                <div className="flex-1 overflow-auto p-8 bg-gradient-to-br from-[#faf8f3]/50 to-[#f5f1e8]/50 dark:bg-slate-900 no-scrollbar transition-colors">
                                    <div className="flex justify-center transition-transform duration-300 origin-top" style={{ transform: `scale(${scale})` }}>
                                        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl w-full max-w-2xl shadow-sm border-2 border-[#d4a574]/20">
                                            <h4 className="text-lg font-black uppercase mb-4 text-[#2d5016] dark:text-[#d4a574]">Chi tiết sản phẩm</h4>
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="border-b-2 border-[#d4a574]/30 text-left text-xs uppercase text-[#8b6f47]">
                                                        <th className="py-2">Sản phẩm</th>
                                                        <th className="py-2 text-right">SL</th>
                                                        <th className="py-2 text-right">Giá</th>
                                                        <th className="py-2 text-right">T.Tiền</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedOrder.details.map((d, i) => (
                                                        <tr key={i} className="border-b border-[#d4a574]/10 text-sm">
                                                            <td className="py-2 font-bold text-[#2d5016] dark:text-white">{d.product_name}</td>
                                                            <td className="py-2 text-right text-[#8b6f47]">{d.quantity}</td>
                                                            <td className="py-2 text-right text-[#8b6f47]">{formatNumber(d.price)}</td>
                                                            <td className="py-2 text-right font-bold text-[#2d5016] dark:text-[#4a7c59]">{formatNumber(d.quantity * d.price)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <div className="mt-6 flex justify-between items-center pt-4 border-t-2 border-[#d4a574]/40">
                                                <span className="font-black uppercase text-sm text-[#2d5016] dark:text-[#d4a574]">Tổng cộng:</span>
                                                <span className="font-black text-2xl text-[#2d5016] dark:text-[#4a7c59]">{formatNumber(selectedOrder.total_amount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 border-t-2 border-[#d4a574]/20 bg-gradient-to-r from-[#faf8f3] to-[#f5f1e8] dark:from-slate-800 dark:to-slate-700 flex justify-end gap-3 transition-colors">
                                    <button onClick={() => {
                                        navigate(activeTab === 'Sale' ? '/pos' : '/purchase', { state: { editOrder: selectedOrder } });
                                    }} className="px-6 py-2.5 rounded-xl font-black text-[#f4c430] hover:bg-[#f4c430]/10 uppercase text-xs transition-all border-2 border-[#f4c430]/30">
                                        CHỈNH SỬA
                                    </button>
                                    <button onClick={() => setSelectedOrder(null)} className="px-6 py-2.5 rounded-xl font-black text-[#8b6f47] uppercase text-xs hover:bg-[#d4a574]/10 transition-all border-2 border-[#d4a574]/20">Đóng</button>
                                </div>
                            </m.div>
                        </div>
                    </Portal>
                )}
            </AnimatePresence>



            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                {confirm && (
                    <ConfirmModal
                        isOpen={!!confirm}
                        title={confirm.title}
                        message={confirm.message}
                        confirmText="XÓA"
                        cancelText="HỦY"
                        type={confirm.type}
                        onConfirm={confirm.onConfirm}
                        onCancel={() => setConfirm(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
