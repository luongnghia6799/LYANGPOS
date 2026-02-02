import React, { useEffect, useState, memo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import {
    Leaf,
    Sun,
    Cloud,
    CloudRain,
    CloudLightning,
    CloudMoon,
    Moon,
    Wind,
    ThermometerSun,
    TrendingUp,
    TrendingDown,
    Calendar,
    AlertCircle,
    Users,
    Activity,
    Wallet,
    Sprout,
    Wheat,
    Droplets,
    Coins,
    MapPin,
    RefreshCw,
    Loader2,
    Truck,
    Package,
    ShoppingBag,
    DollarSign,
    PieChart,
    BarChart3,
    Clock,
    Zap,
    Award,
    Target,
    ArrowRight
} from 'lucide-react';
import { formatCurrency, formatNumber, formatDebt, cn } from '../lib/utils';
import Toast from '../components/Toast';
import LoadingOverlay from '../components/LoadingOverlay';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.02
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98, filter: 'blur(4px)' },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: {
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1]
        }
    }
};


// Premium Stat Card with Gradient Background
const StatCard = memo(({ title, value, icon: Icon, gradient, trend, subtitle, delay = 0 }) => {
    const shouldReduceMotion = useReducedMotion();
    return (
        <m.div
            layout="position"
            variants={itemVariants}
            whileHover={shouldReduceMotion ? {} : { y: -6, scale: 1.01, transition: { duration: 0.2 } }}
            className="relative overflow-hidden glass-panel p-6 rounded-[2rem] shadow-lg border-2 border-primary/20 group h-full transition-shadow duration-300 hover:shadow-2xl"
        >
            {/* Decorative gradient blob */}
            <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-700`} />

            {/* Icon Badge */}
            <div className="relative z-10 flex items-start justify-between mb-4">
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    <Icon size={28} strokeWidth={2.5} />
                </div>
                {trend && (
                    <m.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-black ${trend > 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                    >
                        {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {Math.abs(trend)}%
                    </m.div>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10">
                <p className="text-xs font-black text-[#8b6f47]/70 dark:text-gray-400 uppercase tracking-[0.15em] mb-2">
                    {title}
                </p>
                <h3 className="text-3xl font-black text-[#2d5016] dark:text-white tracking-tight mb-1 group-hover:translate-x-1 transition-transform origin-left">
                    {value}
                </h3>
                {subtitle && (
                    <p className="text-xs font-bold text-[#8b6f47]/50 dark:text-gray-500 mt-1">
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Hover shine effect */}
            {!shouldReduceMotion && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />}
        </m.div>
    );
});

// Mini Stat Card for Quick Metrics
const MiniStatCard = memo(({ icon: Icon, label, value, color = "emerald", onClick }) => (
    <m.div
        layout
        variants={itemVariants}
        whileHover={{ scale: 1.05 }}
        onClick={onClick}
        className={cn(
            "flex items-center gap-3 p-4 glass-panel rounded-2xl border border-primary/20 shadow-sm transition-all",
            onClick && "cursor-pointer hover:border-primary/50 hover:bg-white/50"
        )}
    >
        <div className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}>
            <Icon size={20} strokeWidth={2.5} />
        </div>
        <div className="flex-1">
            <p className="text-xs font-black text-[#8b6f47]/60 dark:text-gray-400 uppercase tracking-wider">
                {label}
            </p>
            <p className="text-lg font-black text-[#2d5016] dark:text-white">
                {value}
            </p>
        </div>
    </m.div>
));

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        revenue: 0, profit: 0, customer_debt: 0, supplier_debt: 0,
        customer_debt_list: [], supplier_debt_list: [],
        chart: { labels: [], data: [], profit_data: [] },
        expiry: { near: 0, expired: 0 },
        low_stock: 0
    });
    const [remoteInfo, setRemoteInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [filters, setFilters] = useState({
        year: new Date().getFullYear().toString(),
        month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
        day: new Date().getDate().toString().padStart(2, '0')
    });
    const [weather, setWeather] = useState({ temp: 28, desc: 'Nắng nhẹ', icon: Sun, city: 'Vụ mùa' });
    const [isWeatherLoading, setIsWeatherLoading] = useState(false);
    const [showMascot, setShowMascot] = useState(localStorage.getItem('ui_show_dashboard_mascot') !== 'false');
    const [mascotConfig, setMascotConfig] = useState({ x: 0, y: 0, scale: 1.5 });
    const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('user_avatar') || '');
    const [toast, setToast] = useState(null);
    const fileInputRef = useRef(null);

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('mascot_config');
        if (saved) {
            try {
                setMascotConfig(JSON.parse(saved));
            } catch (e) {
                console.error("Error loading mascot config", e);
            }
        }

        const handleStorageChange = () => {
            setShowMascot(localStorage.getItem('ui_show_dashboard_mascot') !== 'false');
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const saveMascotConfig = (updates) => {
        const newConfig = { ...mascotConfig, ...updates };
        setMascotConfig(newConfig);
        localStorage.setItem('mascot_config', JSON.stringify(newConfig));
    };

    const handleDragEnd = (event, info) => {
        saveMascotConfig({ x: mascotConfig.x + info.offset.x, y: mascotConfig.y + info.offset.y });
    };

    const fetchWeather = async (lat = null, lon = null, cityName = null) => {
        setIsWeatherLoading(true);
        try {
            let latitude = lat;
            let longitude = lon;
            let city = cityName;

            if (!latitude || !longitude) {
                const savedLoc = localStorage.getItem('weather_location');
                if (savedLoc) {
                    const parsed = JSON.parse(savedLoc);
                    latitude = parsed.latitude;
                    longitude = parsed.longitude;
                    city = parsed.city;
                } else {
                    try {
                        const geoRes = await axios.get('https://ipapi.co/json/');
                        latitude = geoRes.data.latitude;
                        longitude = geoRes.data.longitude;
                        city = geoRes.data.city;
                    } catch (err) {
                        latitude = 21.0285;
                        longitude = 105.8542;
                        city = 'Hà Nội';
                    }
                }
            }

            const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            const { temperature, weathercode } = weatherRes.data.current_weather;

            let desc = 'Nắng nhẹ';
            let Icon = Sun;

            if (weathercode === 0) { desc = 'Trời quang'; Icon = Sun; }
            else if (weathercode <= 3) { desc = 'Ít mây'; Icon = Cloud; }
            else if (weathercode <= 48) { desc = 'Sương mù'; Icon = Wind; }
            else if (weathercode <= 67) { desc = 'Mưa nhẹ'; Icon = CloudRain; }
            else if (weathercode <= 82) { desc = 'Mưa rào'; Icon = CloudRain; }
            else if (weathercode <= 99) { desc = 'Dông sét'; Icon = CloudLightning; }

            setWeather({
                temp: Math.round(temperature),
                desc: desc,
                city: city || 'Vụ mùa',
                icon: Icon
            });

            if (latitude && longitude) {
                localStorage.setItem('weather_location', JSON.stringify({ latitude, longitude, city }));
            }

        } catch (e) {
            console.error("Weather fetch failed", e);
        } finally {
            setIsWeatherLoading(false);
        }
    };

    const handleSyncGPS = () => {
        if (!navigator.geolocation) {
            setToast({ message: 'Trình duyệt của bạn không hỗ trợ GPS.', type: 'error' });
            return;
        }
        setIsWeatherLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await fetchWeather(latitude, longitude, "Vị trí của tôi");
            },
            (err) => {
                setToast({ message: "Không thể lấy vị trí. Vui lòng kiểm tra quyền truy cập vị trí.", type: 'error' });
                setIsWeatherLoading(false);
            },
            { enableHighAccuracy: true }
        );
    }

    useEffect(() => {
        fetchWeather();
        const interval = setInterval(() => fetchWeather(), 600000);
        return () => clearInterval(interval);
    }, []);

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 5) return { text: "Chúc ngủ ngon", icon: Moon, desc: "Nghỉ ngơi để ngày mai tràn đầy năng lượng" };
        if (hour < 11) return { text: "Chào buổi sáng", icon: ThermometerSun, desc: "Bắt đầu ngày mới với tinh thần phấn chấn" };
        if (hour < 14) return { text: "Chào buổi trưa", icon: Sun, desc: "Nghỉ ngơi để tiếp tục chinh phục mục tiêu" };
        if (hour < 18) return { text: "Chào buổi chiều", icon: Wind, desc: "Hoàn thiện công việc trong ngày hôm nay" };
        return { text: "Chào buổi tối", icon: CloudMoon, desc: "Tổng kết và chuẩn bị cho ngày mai" };
    };

    const greeting = getGreeting();

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post('/api/upload-logo', formData);
            const url = res.data.url;
            setAvatarUrl(url);
            localStorage.setItem('user_avatar', url);
        } catch (err) {
            console.error("Avatar upload failed", err);
        }
    };

    const fetchData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const params = new URLSearchParams(filters);
            const [statsRes, ipRes] = await Promise.all([
                axios.get(`/api/dashboard-stats?${params.toString()}`),
                axios.get('/api/ip')
            ]);
            setStats(statsRes.data);
            setRemoteInfo(ipRes.data);
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // Chart Data with Natural Gradients
    const chartData = {
        labels: stats.chart?.labels || [],
        datasets: [
            {
                label: 'Doanh thu',
                data: stats.chart?.data || [],
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, '#2d5016');
                    gradient.addColorStop(1, '#4a7c59');
                    return gradient;
                },
                borderRadius: 12,
                barThickness: 28,
                hoverBackgroundColor: '#d4a574',
            },
        ],
    };

    const profitChartData = {
        labels: stats.chart?.labels || [],
        datasets: [
            {
                label: 'Lợi nhuận',
                data: stats.chart?.profit_data || [],
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, '#d4a574');
                    gradient.addColorStop(1, '#f4c430');
                    return gradient;
                },
                borderRadius: 12,
                barThickness: 28,
                hoverBackgroundColor: '#8b6f47',
            },
        ],
    };

    // Doughnut Chart for Debt Distribution
    const debtChartData = {
        labels: ['Khách hàng nợ', 'Nợ nhà cung cấp'],
        datasets: [{
            data: [Math.abs(stats.customer_debt), Math.abs(stats.supplier_debt)],
            backgroundColor: [
                'rgba(74, 124, 89, 0.8)',
                'rgba(139, 111, 71, 0.8)'
            ],
            borderColor: [
                '#4a7c59',
                '#8b6f47'
            ],
            borderWidth: 2,
        }]
    };

    const chartOptions = (title) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: {
                display: true,
                text: title,
                font: { size: 14, weight: 'bold', family: "'Be Vietnam Pro', sans-serif" },
                color: '#8b6f47',
                padding: { bottom: 20 }
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(139, 111, 71, 0.08)', drawBorder: false },
                ticks: { font: { family: "'Be Vietnam Pro', sans-serif" }, color: '#8b6f47' }
            },
            x: {
                grid: { display: false },
                ticks: { font: { family: "'Be Vietnam Pro', sans-serif" }, color: '#8b6f47' }
            }
        },
        animation: {
            duration: 800,
            easing: 'easeOutQuart'
        }
    });

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    font: { family: "'Be Vietnam Pro', sans-serif", weight: 'bold' },
                    color: '#8b6f47',
                    padding: 15,
                    usePointStyle: true
                }
            }
        }
    };

    return (
        <m.div
            layout="position"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="p-5 space-y-5 min-h-screen relative"
        >
            {/* Header Section with Greeting & Time */}
            <m.div variants={itemVariants} className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative group">
                        <m.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => fileInputRef.current?.click()}
                            className="w-16 h-16 rounded-2xl border-3 border-primary/30 shadow-xl overflow-hidden cursor-pointer relative bg-gradient-to-br from-primary to-emerald-600"
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white">
                                    <Sprout size={28} strokeWidth={2.5} />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Leaf size={20} className="text-white" />
                            </div>
                        </m.div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarUpload}
                            className="hidden"
                            accept="image/*"
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-[#f4c430] to-[#d4a574] rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                            <Sun size={10} className="text-white" />
                        </div>
                    </div>

                    {/* Greeting */}
                    <div>
                        <h2 className="text-3xl font-black text-[#2d5016] dark:text-amber-400 tracking-tight mb-1 flex items-center gap-2">
                            <greeting.icon size={28} className="text-[#d4a574]" />
                            {greeting.text}
                        </h2>
                        <p className="text-sm text-[#8b6f47]/70 dark:text-amber-400/60 font-medium flex items-center gap-2">
                            <Wheat size={14} className="text-[#d4a574]" />
                            {greeting.desc}
                        </p>
                    </div>
                </div>

                {/* Time & Weather Widget */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Clock */}
                    <div className="flex bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-3 rounded-2xl border-2 border-[#d4a574]/20 shadow-sm">
                        <div className="flex items-center gap-2 px-3 text-[#2d5016] dark:text-amber-400 font-bold text-sm">
                            <Calendar size={16} />
                            {currentTime.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                        <div className="w-px h-5 bg-[#d4a574]/30 mx-2 self-center" />
                        <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white rounded-xl shadow-lg font-black text-base">
                            <Clock size={16} />
                            {currentTime.toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    {/* Weather */}
                    <div className="flex items-center gap-2 px-4 py-3 glass-panel border-2 border-primary/30 rounded-2xl shadow-sm">
                        <weather.icon size={18} className="text-primary" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-muted leading-tight">
                                {weather.city}
                            </span>
                            <span className="text-sm font-black text-primary">
                                {weather.temp}°C • {weather.desc}
                            </span>
                        </div>
                        <div className="h-5 w-px bg-[#d4a574]/30 mx-1" />
                        <button
                            onClick={handleSyncGPS}
                            disabled={isWeatherLoading}
                            className="p-1.5 rounded-lg hover:bg-amber-200/50 text-[#8b6f47] transition-colors disabled:opacity-50"
                        >
                            <MapPin size={14} />
                        </button>
                        <button
                            onClick={() => fetchWeather()}
                            disabled={isWeatherLoading}
                            className="p-1.5 rounded-lg hover:bg-amber-200/50 text-[#8b6f47] transition-colors disabled:opacity-50"
                        >
                            {isWeatherLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        </button>
                    </div>
                </div>
            </m.div>

            {/* Filter Bar */}
            <m.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl px-4 py-3 rounded-2xl border-2 border-[#d4a574]/20 shadow-sm">
                    <Calendar size={16} className="text-[#4a7c59]" />
                    <span className="text-xs font-black uppercase text-[#8b6f47] tracking-wider">Bộ lọc</span>
                    <div className="flex items-center gap-4 ml-2">
                        <select name="day" value={filters.day} onChange={handleFilterChange} className="bg-transparent text-xs font-bold focus:outline-none text-[#2d5016] dark:text-white cursor-pointer">
                            <option value="">Tất cả ngày</option>
                            {[...Array(31)].map((_, i) => (
                                <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>Ngày {i + 1}</option>
                            ))}
                        </select>
                        <div className="w-px h-4 bg-[#d4a574]/30" />
                        <select name="month" value={filters.month} onChange={handleFilterChange} className="bg-transparent text-xs font-bold focus:outline-none text-[#2d5016] dark:text-white cursor-pointer">
                            <option value="">Tất cả tháng</option>
                            {[...Array(12)].map((_, i) => (
                                <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>Tháng {i + 1}</option>
                            ))}
                        </select>
                        <div className="w-px h-4 bg-[#d4a574]/30" />
                        <select name="year" value={filters.year} onChange={handleFilterChange} className="bg-transparent text-xs font-bold focus:outline-none text-[#2d5016] dark:text-white cursor-pointer">
                            <option value="">Tất cả năm</option>
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y.toString()}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {remoteInfo && (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white px-4 py-3 rounded-2xl shadow-lg">
                        <Activity size={16} />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase opacity-80 leading-tight">Truy cập mạng</span>
                            <span className="text-xs font-black">http://{remoteInfo.ip}:{remoteInfo.port}</span>
                        </div>
                    </div>
                )}
            </m.div>

            {/* Quick Summary Cards - 4 Cards in Row */}
            <m.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <m.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="bg-gradient-to-br from-primary to-emerald-600 p-6 rounded-2xl shadow-lg border border-white/10 text-white relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Wheat size={20} strokeWidth={2.5} />
                            </div>
                            <TrendingUp size={16} className="opacity-60" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-wider opacity-80 mb-1">Doanh thu</p>
                        <h3 className="text-2xl font-black tracking-tight">{formatCurrency(stats.revenue)}</h3>
                    </div>
                </m.div>

                <m.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="bg-gradient-to-br from-[#d4a574] to-[#f4c430] p-6 rounded-2xl shadow-lg border border-white/10 text-white relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Coins size={20} strokeWidth={2.5} />
                            </div>
                            <Award size={16} className="opacity-60" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-wider opacity-80 mb-1">Lợi nhuận</p>
                        <h3 className="text-2xl font-black tracking-tight">{formatCurrency(stats.profit)}</h3>
                    </div>
                </m.div>

                <m.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="bg-gradient-to-br from-[#4a7c59] to-[#87ceeb] p-6 rounded-2xl shadow-lg border border-white/10 text-white relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Users size={20} strokeWidth={2.5} />
                            </div>
                            <DollarSign size={16} className="opacity-60" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-wider opacity-80 mb-1">Tổng phải thu</p>
                        <h3 className="text-2xl font-black tracking-tight">{formatCurrency(Math.abs(stats.customer_debt))}</h3>
                    </div>
                </m.div>

                <m.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="bg-gradient-to-br from-[#8b6f47] to-[#6b4423] p-6 rounded-2xl shadow-lg border border-white/10 text-white relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Truck size={20} strokeWidth={2.5} />
                            </div>
                            <Wallet size={16} className="opacity-60" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-wider opacity-80 mb-1">Tổng phải trả</p>
                        <h3 className="text-2xl font-black tracking-tight">{formatCurrency(Math.abs(stats.supplier_debt))}</h3>
                    </div>
                </m.div>
            </m.div>

            {/* Quick Metrics Row */}
            <m.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MiniStatCard
                    icon={Package}
                    label="Sắp hết hạn"
                    value={stats.expiry?.near || 0}
                    color="orange"
                    onClick={() => navigate('/products?filter=near_expiry')}
                />
                <MiniStatCard
                    icon={AlertCircle}
                    label="Đã hết hạn"
                    value={stats.expiry?.expired || 0}
                    color="red"
                    onClick={() => navigate('/products?filter=expired')}
                />
                <MiniStatCard
                    icon={ShoppingBag}
                    label="Cần nhập hàng"
                    value={stats.low_stock || 0}
                    color="amber"
                    onClick={() => navigate('/products?filter=warning')}
                />
                <MiniStatCard
                    icon={Target}
                    label="Tỷ suất LN"
                    value={stats.revenue > 0 ? `${((stats.profit / stats.revenue) * 100).toFixed(1)}%` : '0%'}
                    color="emerald"
                    onClick={() => navigate('/products?filter=loss')}
                />
            </m.div>

            {/* Charts & Lists Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Revenue Chart */}
                <m.div layout="position" variants={itemVariants} className="lg:col-span-2 glass-panel p-6 rounded-3xl shadow-lg border-2 border-primary/20">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-black text-[#2d5016] dark:text-white uppercase tracking-tight flex items-center gap-2">
                                <BarChart3 size={20} className="text-[#4a7c59]" />
                                Doanh thu 7 ngày
                            </h3>
                            <p className="text-xs text-[#8b6f47] font-medium mt-1">Biểu đồ tổng quan</p>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-[#2d5016] to-[#4a7c59] text-white rounded-xl">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <div className="h-[280px]">
                        <Bar options={chartOptions('Doanh thu (VNĐ)')} data={chartData} />
                    </div>
                </m.div>

                {/* Debt Distribution Pie */}
                <m.div layout variants={itemVariants} className="glass-panel p-6 rounded-3xl shadow-lg border-2 border-primary/20">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-black text-[#2d5016] dark:text-white uppercase tracking-tight flex items-center gap-2">
                                <PieChart size={20} className="text-[#8b6f47]" />
                                Phân bổ công nợ
                            </h3>
                            <p className="text-xs text-[#8b6f47] font-medium mt-1">Tỷ lệ nợ</p>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-[#8b6f47] to-[#6b4423] text-white rounded-xl">
                            <Wallet size={18} />
                        </div>
                    </div>
                    <div className="h-[280px] flex items-center justify-center">
                        <Doughnut options={doughnutOptions} data={debtChartData} />
                    </div>
                </m.div>
            </div>

            {/* Debt Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Customer Debt */}
                <m.div layout variants={itemVariants} className="glass-panel p-6 rounded-3xl shadow-lg border-2 border-primary/20">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-3 bg-gradient-to-br from-[#4a7c59] to-[#87ceeb] text-white rounded-xl">
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-[#2d5016] dark:text-white uppercase tracking-tight">
                                Khách hàng còn nợ
                            </h3>
                            <p className="text-xs text-[#8b6f47] font-medium">Top 10 nợ cao nhất</p>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                        {stats.customer_debt_list?.length > 0 ? (
                            stats.customer_debt_list.slice(0, 10).map((p, idx) => (
                                <m.div
                                    key={p.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="flex items-center justify-between p-3 bg-gradient-to-r from-[#faf8f3] to-[#f5f1e8] dark:bg-slate-800/30 rounded-xl border border-transparent hover:border-[#d4a574]/30 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#4a7c59]/10 flex items-center justify-center text-[#4a7c59] font-black text-xs">
                                            #{idx + 1}
                                        </div>
                                        <span className="font-bold text-[#2d5016] dark:text-gray-200 text-sm">{p.name}</span>
                                    </div>
                                    <span className="font-black text-[#4a7c59] dark:text-blue-400 text-xs">{formatDebt(p.balance)}</span>
                                </m.div>
                            ))
                        ) : (
                            <p className="text-center py-10 text-[#8b6f47]/50 font-bold italic text-sm">Không có công nợ</p>
                        )}
                    </div>
                    <Link to="/partners" className="block text-center text-xs font-black uppercase text-[#4a7c59] mt-4 hover:tracking-widest transition-all">
                        Xem tất cả →
                    </Link>
                </m.div>

                {/* Supplier Debt */}
                <m.div layout variants={itemVariants} className="glass-panel p-6 rounded-3xl shadow-lg border-2 border-primary/20">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-3 bg-gradient-to-br from-[#8b6f47] to-[#6b4423] text-white rounded-xl">
                            <Truck size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-[#2d5016] dark:text-white uppercase tracking-tight">
                                Nợ nhà cung cấp
                            </h3>
                            <p className="text-xs text-[#8b6f47] font-medium">Cần thanh toán</p>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                        {stats.supplier_debt_list?.length > 0 ? (
                            stats.supplier_debt_list.slice(0, 10).map((p, idx) => (
                                <m.div
                                    key={p.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="flex items-center justify-between p-3 bg-gradient-to-r from-[#faf8f3] to-[#f5f1e8] dark:bg-slate-800/30 rounded-xl border border-transparent hover:border-[#d4a574]/30 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#8b6f47]/10 flex items-center justify-center text-[#8b6f47] font-black text-xs">
                                            #{idx + 1}
                                        </div>
                                        <span className="font-bold text-[#2d5016] dark:text-gray-200 text-sm">{p.name}</span>
                                    </div>
                                    <span className="font-black text-[#8b6f47] dark:text-red-400 text-xs">{formatDebt(p.balance)}</span>
                                </m.div>
                            ))
                        ) : (
                            <p className="text-center py-10 text-[#8b6f47]/50 font-bold italic text-sm">Chưa có nợ</p>
                        )}
                    </div>
                    <Link to="/partners" className="block text-center text-xs font-black uppercase text-[#8b6f47] mt-4 hover:tracking-widest transition-all">
                        Quản lý công nợ →
                    </Link>
                </m.div>
            </div>

            {/* Profit Chart */}
            <m.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl shadow-lg border-2 border-[#d4a574]/20">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-black text-[#2d5016] dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <Zap size={20} className="text-[#d4a574]" />
                            Lợi nhuận 7 ngày
                        </h3>
                        <p className="text-xs text-[#8b6f47] font-medium mt-1">Xu hướng sinh lời</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-[#d4a574] to-[#f4c430] text-white rounded-xl">
                        <Award size={18} />
                    </div>
                </div>
                <div className="h-[280px]">
                    <Bar options={chartOptions('Lợi nhuận (VNĐ)')} data={profitChartData} />
                </div>
            </m.div>

            {/* Toast Notifications */}
            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>

            {/* Floating Mascot */}
            <AnimatePresence>
                {showMascot && (
                    <m.div
                        drag
                        dragMomentum={false}
                        onDragEnd={handleDragEnd}
                        animate={{
                            x: mascotConfig.x,
                            y: mascotConfig.y,
                        }}
                        whileDrag={{ cursor: 'grabbing', scale: mascotConfig.scale * 1.05 }}
                        className="fixed z-[9999] cursor-grab group"
                        style={{
                            top: '20%',
                            left: '80%',
                            width: `${12 * mascotConfig.scale}rem`,
                            height: `${12 * mascotConfig.scale}rem`
                        }}
                    >
                        <m.img
                            src="/assets/images/user_mascot.png"
                            alt="Mascot"
                            animate={{
                                y: [0, -15, 0],
                                rotate: [-1, 1, -1]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal drop-shadow-2xl select-none"
                            draggable="false"
                        />
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 shadow-xl border border-[#d4a574]/20">
                            <span className="text-[10px] font-black uppercase text-[#8b6f47]">Size</span>
                            <input
                                type="range"
                                min="0.5"
                                max="3"
                                step="0.1"
                                value={mascotConfig.scale}
                                onChange={(e) => saveMascotConfig({ scale: parseFloat(e.target.value) })}
                                className="w-20 h-1 bg-[#d4a574]/30 rounded-lg appearance-none cursor-pointer accent-[#2d5016]"
                            />
                        </div>
                    </m.div>
                )}
            </AnimatePresence>

            {/* Premium Loading Overlay */}
            <LoadingOverlay isVisible={loading && !stats.revenue} message="Đang thu hoạch dữ liệu..." />
        </m.div >
    );
}
