import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { m, AnimatePresence } from 'framer-motion';
import {
    BarChart3, Calendar, Filter, Download, ChevronDown,
    TrendingUp, TrendingDown, DollarSign, Package, Users,
    CreditCard, ArrowRight, ArrowLeft, Search, RefreshCcw,
    Layers, PieChart, Activity, Truck, Coins, Leaf, SprayCan, Sprout, Wheat
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../lib/utils';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler
);

// Initial Date Helper - Default to current month
// Initial Date Helper - Default to current month
const getInitialRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Helper to format YYYY-MM-DD in local time
    const formatLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return {
        startDate: formatLocal(firstDay),
        endDate: formatLocal(lastDay)
    };
};

export default function ReportsBoard() {
    const [dateRange, setDateRange] = useState(getInitialRange());
    const [activeTab, setActiveTab] = useState('sales'); // sales, customers, purchases, inventory, brands
    const [loading, setLoading] = useState(false);

    // Data States
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [partners, setPartners] = useState([]);
    const [brands, setBrands] = useState([]);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('All');
    const [selectedPartnerType, setSelectedPartnerType] = useState('All');

    // 1. Fetch Basic Data
    useEffect(() => {
        fetchInitialData();
    }, []);

    // 2. Fetch Report Data when Date/Tab changes
    useEffect(() => {
        fetchReportData();
    }, [dateRange, activeTab]);

    const fetchInitialData = async () => {
        try {
            const [prodRes, partRes] = await Promise.all([
                axios.get('/api/products'),
                axios.get('/api/partners')
            ]);
            setProducts(prodRes.data);
            setPartners(partRes.data);

            // Extract brands unique
            const uniqueBrands = [...new Set(prodRes.data.map(p => p.brand).filter(Boolean))].sort();
            setBrands(uniqueBrands);

        } catch (err) {
            console.error("Error fetching init data", err);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/orders', {
                params: {
                    start_date: dateRange.startDate,
                    end_date: dateRange.endDate,
                    limit: 10000 // Get all for calculation
                }
            });
            setOrders(res.data.items || res.data); // Store raw orders
        } catch (err) {
            console.error("Error fetching report data", err);
        } finally {
            setLoading(false);
        }
    };

    // --- REPORT PROCESSING LOGIC ---

    // 1. SALES REPORT (Bán hàng)
    const salesReport = useMemo(() => {
        if (activeTab !== 'sales') return [];

        let report = {}; // { productId: { ... } }

        orders.forEach(order => {
            if (order.type !== 'Sale') return;
            if (order.display_id === 'NODAU' || order.display_id === '#NODAU') return;

            order.details.forEach(detail => {
                const prod = products.find(p => p.id === detail.product_id);
                // Filters
                if (selectedBrand !== 'All' && prod?.brand !== selectedBrand) return;
                if (searchTerm && !detail.product_name.toLowerCase().includes(searchTerm.toLowerCase())) return;

                if (!report[detail.product_id]) {
                    report[detail.product_id] = {
                        id: detail.product_id,
                        code: prod?.code || '',
                        name: detail.product_name,
                        unit: detail.product_unit,
                        qty: 0,
                        revenue: 0,
                        capital: 0,
                        profit: 0
                    };
                }
                const qty = detail.quantity;
                const revenue = detail.price * qty;
                const capital = (detail.cost_price || 0) * qty;

                report[detail.product_id].qty += qty;
                report[detail.product_id].revenue += revenue;
                report[detail.product_id].capital += capital;
                report[detail.product_id].profit += (revenue - capital);
            });
        });

        return Object.values(report).sort((a, b) => b.revenue - a.revenue);
    }, [orders, products, activeTab, selectedBrand, searchTerm]);

    // 1b. SALES CHART DATA
    const salesChartData = useMemo(() => {
        if (activeTab !== 'sales') return null;

        const dailyData = {};
        orders.forEach(order => {
            if (order.type !== 'Sale') return;
            if (order.display_id === 'NODAU' || order.display_id === '#NODAU') return;
            // Date format YYYY-MM-DD
            const date = order.date.split('T')[0];
            if (!dailyData[date]) dailyData[date] = { revenue: 0, profit: 0 };

            dailyData[date].revenue += order.total_amount;

            // Calculate Profit per order approx (if needed more accurate need to sum order details)
            let orderCost = 0;
            order.details.forEach(d => orderCost += (d.cost_price || 0) * d.quantity);
            dailyData[date].profit += (order.total_amount - orderCost);
        });

        const sortedDates = Object.keys(dailyData).sort();

        return {
            labels: sortedDates.map(d => d.split('-').slice(1).join('/')), // MM/DD
            datasets: [
                {
                    label: 'Doanh Thu',
                    data: sortedDates.map(d => dailyData[d].revenue),
                    borderColor: '#2d5016',
                    backgroundColor: 'rgba(45, 80, 22, 0.1)',
                    yAxisID: 'y',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#2d5016',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Lợi Nhuận',
                    data: sortedDates.map(d => dailyData[d].profit),
                    borderColor: '#4a7c59',
                    backgroundColor: 'rgba(74, 124, 89, 0.1)',
                    yAxisID: 'y',
                    fill: true,
                    tension: 0.4,
                    borderDash: [5, 5],
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#4a7c59',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }
            ]
        };
    }, [orders, activeTab]);


    // 2. PARTNER SALES REPORT (Khách hàng)
    const partnerReport = useMemo(() => {
        if (activeTab !== 'customers') return [];

        let report = {}; // { partnerId: { ... } }

        orders.forEach(order => {
            if (order.type !== 'Sale') return;
            if (order.display_id === 'NODAU' || order.display_id === '#NODAU') return;
            if (!order.partner_id) return; // Skip walk-in

            const partner = partners.find(p => p.id === order.partner_id);
            if (searchTerm && !partner?.name.toLowerCase().includes(searchTerm.toLowerCase())) return;

            if (!report[order.partner_id]) {
                report[order.partner_id] = {
                    id: order.partner_id,
                    name: partner?.name || 'Khách lẻ',
                    phone: partner?.phone,
                    orderCount: 0,
                    totalRevenue: 0,
                    debtIncrease: 0
                };
            }
            report[order.partner_id].orderCount += 1;
            report[order.partner_id].totalRevenue += order.total_amount;
            if (order.payment_method === 'Debt') {
                report[order.partner_id].debtIncrease += (order.total_amount - (order.amount_paid || 0));
            }
        });

        return Object.values(report).sort((a, b) => b.totalRevenue - a.totalRevenue);
    }, [orders, partners, activeTab, searchTerm]);

    // 3. PURCHASES REPORT (Nhập hàng - NEW)
    const purchaseReport = useMemo(() => {
        if (activeTab !== 'purchases') return [];

        let report = {}; // { partnerId: { name, phone, importCount, totalImport } }

        orders.forEach(order => {
            if (order.type !== 'Purchase') return;
            if (order.display_id === 'NODAU' || order.display_id === '#NODAU') return;

            const partner = partners.find(p => p.id === order.partner_id);
            if (searchTerm && !partner?.name.toLowerCase().includes(searchTerm.toLowerCase())) return;

            if (!report[order.partner_id]) {
                report[order.partner_id] = {
                    id: order.partner_id,
                    name: partner?.name || 'Nhà cung cấp lạ',
                    phone: partner?.phone,
                    importCount: 0,
                    totalImport: 0
                };
            }
            report[order.partner_id].importCount += 1;
            report[order.partner_id].totalImport += order.total_amount;
        });

        return Object.values(report).sort((a, b) => b.totalImport - a.totalImport);
    }, [orders, partners, activeTab, searchTerm]);


    // 4. INVENTORY REPORT & SLOW MOVING (UPDATED)
    const inventoryReport = useMemo(() => {
        if (activeTab !== 'inventory') return [];

        let report = products.map(p => {
            if (selectedBrand !== 'All' && p.brand !== selectedBrand) return null;
            if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return null;

            return {
                id: p.id,
                code: p.code,
                name: p.name,
                unit: p.unit,
                currentStock: p.stock,
                importQty: 0,
                exportQty: 0,
                importVal: 0,
                exportVal: 0
            };
        }).filter(Boolean);

        const reportMap = new Map(report.map(i => [i.id, i]));

        orders.forEach(order => {
            if (order.display_id === 'NODAU' || order.display_id === '#NODAU') return;
            order.details.forEach(d => {
                const item = reportMap.get(d.product_id);
                if (!item) return;

                if (order.type === 'Purchase') {
                    item.importQty += d.quantity;
                    item.importVal += (d.price * d.quantity);
                } else if (order.type === 'Sale') {
                    item.exportQty += d.quantity;
                    item.exportVal += (d.price * d.quantity);
                }
            });
        });

        report.forEach(item => {
            item.openingStock = item.currentStock - item.importQty + item.exportQty;
        });

        return report.sort((a, b) => b.exportQty - a.exportQty);
    }, [orders, products, activeTab, selectedBrand, searchTerm]);

    const slowMovingReport = useMemo(() => {
        if (activeTab !== 'inventory') return [];

        // Find products sold in this period
        const soldProductIds = new Set();
        orders.forEach(order => {
            if (order.type === 'Sale') {
                if (order.display_id === 'NODAU' || order.display_id === '#NODAU') return;
                order.details.forEach(d => soldProductIds.add(d.product_id));
            }
        });

        // Filter products: Stock > 0 AND NOT in soldProductIds
        return products.filter(p => {
            if (selectedBrand !== 'All' && p.brand !== selectedBrand) return false;
            if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return p.stock > 0 && !soldProductIds.has(p.id);
        }).map(p => ({
            ...p,
            value: p.stock * p.cost_price // Inventory Value
        })).sort((a, b) => b.value - a.value); // Show high value dead stock first

    }, [orders, products, activeTab, selectedBrand, searchTerm]);


    // 5. BRANDS REPORT
    const brandReport = useMemo(() => {
        if (activeTab !== 'brands') return [];

        let report = {}; // { brandName: { revenue, profit, qty } }

        orders.forEach(order => {
            if (order.type !== 'Sale') return;
            if (order.display_id === 'NODAU' || order.display_id === '#NODAU') return;
            order.details.forEach(detail => {
                const prod = products.find(p => p.id === detail.product_id);
                const brand = prod?.brand || 'Khác';

                // Filter
                if (searchTerm && !brand.toLowerCase().includes(searchTerm.toLowerCase())) return;

                if (!report[brand]) report[brand] = { name: brand, revenue: 0, profit: 0, qty: 0 };

                const qty = detail.quantity;
                const revenue = detail.price * qty;
                const capital = (detail.cost_price || 0) * qty;

                report[brand].revenue += revenue;
                report[brand].profit += (revenue - capital);
                report[brand].qty += qty;
            });
        });

        return Object.values(report).sort((a, b) => b.revenue - a.revenue);
    }, [orders, products, activeTab, searchTerm]);

    const brandChartData = useMemo(() => {
        if (activeTab !== 'brands') return null;

        const topBrands = brandReport.slice(0, 6); // Top 6
        const otherRevenue = brandReport.slice(6).reduce((sum, i) => sum + i.revenue, 0);

        const labels = topBrands.map(b => b.name);
        if (otherRevenue > 0) labels.push('Khác');

        const data = topBrands.map(b => b.revenue);
        if (otherRevenue > 0) data.push(otherRevenue);

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
                    '#8b5cf6', '#ec4899', '#94a3b8'
                ],
                borderWidth: 0
            }]
        }
    }, [brandReport, activeTab]);


    // --- EXPORT FUNCTION ---
    const handleExport = () => {
        let title = "";
        let data = [];

        if (activeTab === 'sales') {
            title = "BaoCao_BanHang";
            data = salesReport.map(i => ({
                "Mã SP": i.code, "Tên SP": i.name, "ĐVT": i.unit, "Số lượng": i.qty,
                "Doanh thu": i.revenue, "Giá vốn": i.capital, "Lợi nhuận": i.profit
            }));
        } else if (activeTab === 'customers') {
            title = "BaoCao_KhachHang";
            data = partnerReport.map(i => ({
                "Tên KH": i.name, "SĐT": i.phone, "Số đơn": i.orderCount,
                "Doanh số": i.totalRevenue, "Nợ tăng thêm": i.debtIncrease
            }));
        } else if (activeTab === 'purchases') {
            title = "BaoCao_NhapHang";
            data = purchaseReport.map(i => ({
                "Nhà CC": i.name, "SĐT": i.phone, "Số phiếu nhập": i.importCount, "Tổng tiền hàng": i.totalImport
            }));
        } else if (activeTab === 'inventory') {
            title = "BaoCao_XuatNhapTon";
            data = inventoryReport.map(i => ({
                "Mã SP": i.code, "Tên SP": i.name,
                "Tồn đầu": i.openingStock, "Nhập": i.importQty, "Xuất": i.exportQty, "Tồn cuối": i.currentStock
            }));
        } else if (activeTab === 'brands') {
            title = "BaoCao_NhanHang";
            data = brandReport.map(i => ({
                "Nhãn hàng": i.name, "Doanh số": i.revenue, "Lợi nhuận": i.profit, "Số lượng bán": i.qty
            }));
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${title}_${dateRange.startDate}_${dateRange.endDate}.xlsx`);
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-[#faf8f3] to-[#f5f1e8] dark:from-slate-900 dark:to-slate-800 overflow-hidden font-sans transition-colors duration-300 relative">
            {/* Background Decorations */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#2d5016] opacity-[0.03] blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#4a7c59] opacity-[0.03] blur-[120px] pointer-events-none"></div>

            {/* 1. Header & Filter Bar */}
            <div className="bg-transparent px-4 pt-4 pb-2 flex flex-col gap-4 z-30 sticky top-0 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-black text-[#2d5016] dark:text-[#4a7c59] uppercase flex items-center gap-3 drop-shadow-sm">
                        <BarChart3 className="text-[#4a7c59]" /> TRUNG TÂM BÁO CÁO
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExport}
                            className="bg-white/60 dark:bg-slate-800/60 text-[#2d5016] dark:text-[#4a7c59] hover:bg-white/80 dark:hover:bg-slate-800 border-2 border-[#d4a574]/30 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg backdrop-blur-md"
                        >
                            <Download size={18} /> Xuất Excel
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Range */}
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg border dark:border-slate-700">
                        <Calendar size={18} className="text-slate-400 ml-2" />
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="bg-transparent border-none outline-none text-sm font-bold w-32 dark:text-white"
                        />
                        <ArrowRight size={14} className="text-slate-400" />
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="bg-transparent border-none outline-none text-sm font-bold w-32 dark:text-white"
                        />
                    </div>

                    {/* Quick Select Buttons */}
                    <div className="flex gap-1">
                        <button onClick={() => setDateRange(getInitialRange())} className="px-3 py-1.5 text-xs font-bold bg-white text-slate-600 border rounded hover:bg-slate-50">Tháng này</button>
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-2"></div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm SP / Khách / Hãng..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none focus:border-emerald-500 w-64"
                        />
                    </div>

                    {/* Brand Filter (Only for Product related tabs) */}
                    {(activeTab === 'sales' || activeTab === 'inventory') && (
                        <select
                            className="pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                            value={selectedBrand}
                            onChange={(e) => setSelectedBrand(e.target.value)}
                        >
                            <option value="All">Tất cả hãng</option>
                            {brands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* 2. Main Content Area */}
            <div className="flex flex-1 overflow-hidden z-20 relative text-gray-800 dark:text-gray-100">
                {/* Sidebar Navigation */}
                <div className="w-64 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border-r-2 border-[#d4a574]/30 flex flex-col overflow-y-auto z-20 shadow-sm">
                    <div className="p-4 space-y-1">
                        <NavButton
                            active={activeTab === 'sales'}
                            onClick={() => setActiveTab('sales')}
                            icon={<TrendingUp size={18} />}
                            label="Hiệu Quả Bán Hàng"
                            desc="Biểu đồ doanh thu"
                        />
                        <NavButton
                            active={activeTab === 'customers'}
                            onClick={() => setActiveTab('customers')}
                            icon={<Users size={18} />}
                            label="Khách Hàng"
                            desc="Top mua, Công nợ"
                        />
                        <NavButton
                            active={activeTab === 'inventory'}
                            onClick={() => setActiveTab('inventory')}
                            icon={<Package size={18} />}
                            label="Xuất - Nhập - Tồn"
                            desc="Cân đối kho hàng"
                        />

                        <NavButton
                            active={activeTab === 'purchases'}
                            onClick={() => setActiveTab('purchases')}
                            icon={<Truck size={18} />}
                            label="Nhập Hàng (Mới)"
                            desc="Chi tiêu & Nhà CC"
                        />

                        <NavButton
                            active={activeTab === 'brands'}
                            onClick={() => setActiveTab('brands')}
                            icon={<PieChart size={18} />}
                            label="Phân Tích Nhãn Hàng"
                            desc="Thị phần, Tăng trưởng"
                        />
                    </div>
                </div>

                {/* Report Content View */}
                <div className="flex-1 overflow-auto bg-[var(--bg-color)] dark:bg-slate-900 p-6 relative">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <m.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center justify-center h-full"
                            >
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
                            </m.div>
                        ) : (
                            <m.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                className="max-w-6xl mx-auto space-y-6"
                            >

                                {/* KPI Cards (Dynamic based on Tab) */}
                                {activeTab === 'sales' && (
                                    <>
                                        <div className="grid grid-cols-4 gap-4">
                                            <KPICard title="Tổng Doanh Thu" value={salesReport.reduce((s, i) => s + i.revenue, 0)} icon={<Coins />} color="text-emerald-600" />
                                            <KPICard title="Tổng Lợi Nhuận" value={salesReport.reduce((s, i) => s + i.profit, 0)} icon={<TrendingUp />} color="text-blue-600" />
                                            <KPICard title="Tổng SL Bán" value={salesReport.reduce((s, i) => s + i.qty, 0)} isNumber icon={<Wheat />} color="text-purple-600" />
                                            <KPICard title="Số Mặt Hàng" value={salesReport.length} isNumber icon={<Leaf />} color="text-orange-600" />
                                        </div>

                                        {/* Chart Section */}
                                        <div className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-3xl border-2 border-[#d4a574]/30 shadow-lg backdrop-blur-md">
                                            <h3 className="text-lg font-bold mb-4 text-[#2d5016] dark:text-slate-200 flex items-center gap-2">
                                                <BarChart3 className="text-[#4a7c59]" size={20} />
                                                Biểu đồ Doanh Thu & Lợi Nhuận
                                            </h3>
                                            <div className="h-80 w-full">
                                                {salesChartData && <Line data={salesChartData} options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    interaction: { mode: 'index', intersect: false },
                                                    plugins: {
                                                        legend: {
                                                            labels: {
                                                                color: '#2d5016',
                                                                font: { weight: 'bold', size: 12 },
                                                                usePointStyle: true,
                                                                padding: 15
                                                            }
                                                        },
                                                        tooltip: {
                                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                            titleColor: '#2d5016',
                                                            bodyColor: '#2d5016',
                                                            borderColor: '#d4a574',
                                                            borderWidth: 2,
                                                            padding: 12,
                                                            displayColors: true,
                                                            callbacks: {
                                                                label: function (context) {
                                                                    return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                                                                }
                                                            }
                                                        }
                                                    },
                                                    scales: {
                                                        y: {
                                                            grid: { color: 'rgba(212, 165, 116, 0.1)' },
                                                            ticks: { color: '#8b6f47', font: { weight: 'bold' } }
                                                        },
                                                        x: {
                                                            grid: { color: 'rgba(212, 165, 116, 0.1)' },
                                                            ticks: { color: '#8b6f47', font: { weight: 'bold' } }
                                                        }
                                                    }
                                                }} />}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'brands' && (
                                    <>
                                        <div className="grid grid-cols-3 gap-6">
                                            {/* Chart */}
                                            {/* Chart */}
                                            <div className="col-span-1 bg-white/60 dark:bg-slate-800/60 p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-sm flex flex-col items-center justify-center backdrop-blur-md">
                                                <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200 self-start">Tỷ trọng Doanh Số</h3>
                                                <div className="h-64 w-full relative">
                                                    {brandChartData && <Doughnut data={brandChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />}
                                                </div>
                                            </div>

                                            {/* Top Brands KPIs */}
                                            <div className="col-span-2 grid grid-cols-2 gap-4 content-start">
                                                <KPICard title="Hãng Bán Chạy Nhất" value={brandReport[0]?.revenue || 0} icon={<TrendingUp />} color="emerald" />
                                                <KPICard title="Lợi Nhuận Cao Nhất" value={brandReport.sort((a, b) => b.profit - a.profit)[0]?.profit || 0} icon={<DollarSign />} color="blue" />
                                                <div className="col-span-2 bg-white/60 dark:bg-slate-800/60 p-4 rounded-3xl border border-white/20 dark:border-white/5 shadow-sm backdrop-blur-md">
                                                    <div className="text-slate-500 font-bold text-sm mb-2">Top 5 Nhãn Hàng Chủ Lực</div>
                                                    <div className="flex flex-col gap-2">
                                                        {brandReport.slice(0, 5).map((b, i) => (
                                                            <div key={b.name} className="flex justify-between items-center text-sm border-b border-dashed dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600">{i + 1}</span>
                                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{b.name}</span>
                                                                </div>
                                                                <span className="font-mono text-emerald-600">{formatCurrency(b.revenue)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* PURCHASES Views (NEW) */}
                                {activeTab === 'purchases' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <KPICard title="Tổng Chi Nhập Hàng" value={purchaseReport.reduce((s, i) => s + i.totalImport, 0)} icon={<CreditCard />} color="orange" />
                                            <KPICard title="Số Phiếu Nhập" value={purchaseReport.reduce((s, i) => s + i.importCount, 0)} isNumber icon={<SprayCan />} color="blue" />
                                        </div>
                                        <div className="bg-white/60 dark:bg-slate-800/60 rounded-3xl shadow-sm border border-white/20 dark:border-white/5 overflow-hidden mt-4 backdrop-blur-md">
                                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
                                                <h3 className="font-bold text-slate-800 dark:text-slate-200">Chi Tiết Nhập Hàng Theo Nhà Cung Cấp</h3>
                                            </div>
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold uppercase text-xs">
                                                    <tr>
                                                        <th className="p-4">Nhà Cung Cấp</th>
                                                        <th className="p-4 text-center">SĐT</th>
                                                        <th className="p-4 text-right">Số Phiếu</th>
                                                        <th className="p-4 text-right text-orange-600">Tổng Giá Trị</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                    {purchaseReport.map(row => (
                                                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                            <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{row.name}</td>
                                                            <td className="p-4 text-center text-slate-500">{row.phone}</td>
                                                            <td className="p-4 text-right">{row.importCount}</td>
                                                            <td className="p-4 text-right font-black text-orange-600">{formatNumber(row.totalImport)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}

                                {/* Data Table */}
                                {(activeTab !== 'purchases') && ( // Hide generic table for purchases as it has its own above or standard? Actually let's use standard table structure for consistency where possible, but here we customize.
                                    // ... WAIT, Purchase was handled above. Brand was handled above.
                                    // Sales, Customers, Inventory (Standard tables)
                                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-3xl shadow-sm border border-white/20 dark:border-white/5 overflow-hidden mt-6 backdrop-blur-md">
                                        {activeTab === 'inventory' && slowMovingReport.length > 0 && (
                                            <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                                                <div className="p-4 flex items-center gap-2 text-red-700 dark:text-red-400 font-bold">
                                                    <TrendingDown /> CẢNH BÁO: HÀNG TỒN KHO LÂU / KHÔNG BÁN ĐƯỢC TRONG KỲ
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-red-100/50 dark:bg-red-900/40 text-red-800 dark:text-red-300 font-bold uppercase text-xs">
                                                            <tr>
                                                                <th className="p-3">Sản Phẩm</th>
                                                                <th className="p-3 text-right">Tồn Kho</th>
                                                                <th className="p-3 text-right">Giá Vốn</th>
                                                                <th className="p-3 text-right">Giá Trị Tồn (Vốn Chết)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-red-100 dark:divide-red-800/50">
                                                            {slowMovingReport.slice(0, 5).map(row => (
                                                                <tr key={row.id} className="hover:bg-red-100/30">
                                                                    <td className="p-3 font-medium text-slate-700 dark:text-red-100">{row.name}</td>
                                                                    <td className="p-3 text-right font-bold">{formatNumber(row.stock)} {row.unit}</td>
                                                                    <td className="p-3 text-right text-slate-500">{formatNumber(row.cost_price)}</td>
                                                                    <td className="p-3 text-right font-black text-red-600">{formatNumber(row.value)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200">
                                                {activeTab === 'inventory' ? 'Chi Tiết Xuất - Nhập - Tồn' : 'Chi tiết dữ liệu'}
                                            </h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold uppercase text-xs">
                                                    <tr>
                                                        {activeTab === 'sales' && (
                                                            <>
                                                                <th className="p-4">Tên Sản Phẩm</th>
                                                                <th className="p-4 text-center">ĐVT</th>
                                                                <th className="p-4 text-right">Số Lượng</th>
                                                                <th className="p-4 text-right">Doanh Thu</th>
                                                                <th className="p-4 text-right text-emerald-600">Lợi Nhuận</th>
                                                            </>
                                                        )}
                                                        {activeTab === 'customers' && (
                                                            <>
                                                                <th className="p-4">Khách Hàng</th>
                                                                <th className="p-4 text-center">SĐT</th>
                                                                <th className="p-4 text-right">Số Đơn</th>
                                                                <th className="p-4 text-right">Tổng Mua</th>
                                                                <th className="p-4 text-right text-red-500">Nợ Phát Sinh</th>
                                                            </>
                                                        )}
                                                        {activeTab === 'inventory' && (
                                                            <>
                                                                <th className="p-4">Sản Phẩm</th>
                                                                <th className="p-4 text-center">Tồn Đầu (Ước tính)</th>
                                                                <th className="p-4 text-center text-blue-600">+ Nhập</th>
                                                                <th className="p-4 text-center text-orange-600">- Xuất</th>
                                                                <th className="p-4 text-center font-bold">BLOCK Tồn Cuối</th>
                                                            </>
                                                        )}
                                                        {activeTab === 'brands' && (
                                                            <>
                                                                <th className="p-4">Nhãn Hàng</th>
                                                                <th className="p-4 text-right">Số Lượng Bán</th>
                                                                <th className="p-4 text-right">Doanh Thu</th>
                                                                <th className="p-4 text-right text-emerald-600">Lợi Nhuận Gộp</th>
                                                                <th className="p-4 text-right text-slate-400">Tỷ suất LN</th>
                                                            </>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                    {activeTab === 'sales' && salesReport.map((row, idx) => (
                                                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                            <td className="p-4 font-medium text-slate-700 dark:text-slate-200">
                                                                <div>{row.name}</div>
                                                                <div className="text-xs text-slate-400">{row.code}</div>
                                                            </td>
                                                            <td className="p-4 text-center text-slate-500">{row.unit}</td>
                                                            <td className="p-4 text-right font-bold">{formatNumber(row.qty)}</td>
                                                            <td className="p-4 text-right font-bold text-slate-700 dark:text-slate-300">{formatNumber(row.revenue)}</td>
                                                            <td className="p-4 text-right font-bold text-emerald-600">{formatNumber(row.profit)}</td>
                                                        </tr>
                                                    ))}

                                                    {activeTab === 'customers' && partnerReport.map((row, idx) => (
                                                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                            <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{row.name}</td>
                                                            <td className="p-4 text-center text-slate-500">{row.phone}</td>
                                                            <td className="p-4 text-right">{row.orderCount}</td>
                                                            <td className="p-4 text-right font-black text-emerald-600">{formatNumber(row.totalRevenue)}</td>
                                                            <td className="p-4 text-right font-bold text-red-500">{formatNumber(row.debtIncrease)}</td>
                                                        </tr>
                                                    ))}

                                                    {activeTab === 'inventory' && inventoryReport.map((row, idx) => (
                                                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                            <td className="p-4 font-medium text-slate-700 dark:text-slate-200">{row.name}</td>
                                                            <td className="p-4 text-center text-slate-500">{formatNumber(row.openingStock)}</td>
                                                            <td className="p-4 text-center text-blue-600 font-bold">{row.importQty > 0 ? `+${row.importQty}` : '-'}</td>
                                                            <td className="p-4 text-center text-orange-600 font-bold">{row.exportQty > 0 ? `-${row.exportQty}` : '-'}</td>
                                                            <td className="p-4 text-center font-black bg-slate-50 dark:bg-slate-800">{formatNumber(row.currentStock)}</td>
                                                        </tr>
                                                    ))}

                                                    {activeTab === 'brands' && brandReport.map((row, idx) => (
                                                        <tr key={row.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                            <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{row.name}</td>
                                                            <td className="p-4 text-right font-bold text-slate-500">{formatNumber(row.qty)}</td>
                                                            <td className="p-4 text-right font-black text-slate-700 dark:text-slate-300">{formatNumber(row.revenue)}</td>
                                                            <td className="p-4 text-right font-bold text-emerald-600">{formatNumber(row.profit)}</td>
                                                            <td className="p-4 text-right text-xs text-slate-400">
                                                                {row.revenue > 0 ? Math.round((row.profit / row.revenue) * 100) : 0}%
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// UI Micro-Components
const NavButton = ({ active, onClick, icon, label, desc, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "w-full text-left p-3 rounded-2xl flex items-center gap-4 transition-all duration-300",
            active
                ? "bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white shadow-lg shadow-[#2d5016]/30 scale-[1.02]"
                : "bg-white/40 dark:bg-slate-800/40 text-[#8b6f47] hover:bg-[#d4a574]/10 dark:text-slate-400 dark:hover:bg-slate-700/50 border border-[#d4a574]/20",
            disabled && "opacity-50 cursor-not-allowed"
        )}
    >
        <div className={cn(
            "p-2.5 rounded-xl transition-colors",
            active ? "bg-white/20 text-white" : "bg-[#d4a574]/10 dark:bg-slate-800 text-[#8b6f47]"
        )}>
            {icon}
        </div>
        <div>
            <div className="font-bold text-sm">{label}</div>
            <div className={cn("text-xs opacity-80", active ? "text-white/80" : "text-[#8b6f47]/60")}>{desc}</div>
        </div>
    </button>
);


const KPICard = ({ title, value, icon, color, isNumber }) => {
    const colorMap = {
        'emerald': { bg: 'bg-[#2d5016]', text: 'text-[#2d5016]', glow: 'from-[#2d5016]/20' },
        'blue': { bg: 'bg-[#4a7c59]', text: 'text-[#4a7c59]', glow: 'from-[#4a7c59]/20' },
        'purple': { bg: 'bg-[#8b6f47]', text: 'text-[#8b6f47]', glow: 'from-[#8b6f47]/20' },
        'orange': { bg: 'bg-[#f4c430]', text: 'text-[#f4c430]', glow: 'from-[#f4c430]/20' }
    };
    const colors = colorMap[color] || colorMap['emerald'];

    return (
        <div className="relative group overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r ${colors.glow} to-transparent blur-xl`}></div>

            <div className={`relative h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border-2 border-[#d4a574]/30 shadow-sm flex flex-col items-center justify-center gap-4 z-10`}>
                {/* Icon on top */}
                <div className={`p-4 rounded-2xl ${colors.bg} shadow-lg`}>
                    <div className="text-white">{icon}</div>
                </div>

                {/* Content below */}
                <div className="text-center w-full">
                    <div className="text-[#8b6f47] dark:text-[#d4a574] text-xs font-bold uppercase tracking-wider mb-2">{title}</div>
                    <div className="text-xl font-black text-[#2d5016] dark:text-white drop-shadow-sm">
                        {isNumber ? (typeof value === 'string' ? value : formatNumber(value)) : formatCurrency(value)}
                    </div>
                </div>
            </div>
        </div>
    )
};
