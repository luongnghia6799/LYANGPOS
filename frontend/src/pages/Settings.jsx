import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { Save, Building, Cloud, Download, RefreshCcw, Info, Settings as SettingsIcon, Database, Keyboard, Monitor, Layout, Tractor, Wheat, Droplets, Leaf, Bot, Sparkles, Trash2, CreditCard, ArrowRight, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

import PasswordConfirmModal from '../components/PasswordConfirmModal';

export default function Settings() {
    const [settings, setSettings] = useState({
        shop_name: 'Lyang Nghĩa',
        shop_address: '',
        shop_phone: '',
        invoice_font_size: '13',
        invoice_font_family: 'sans-serif',
        invoice_footer: 'Cảm ơn Quý Khách!',
        paper_size: 'A4',
        shop_bank: '',
        shop_bank_account: '',
        shop_bank_user: '',
        ui_show_doraemon: localStorage.getItem('ui_show_doraemon') || 'true',
        ui_show_dashboard_mascot: localStorage.getItem('ui_show_dashboard_mascot') || 'true',
        ui_show_rainbow_border: localStorage.getItem('ui_show_rainbow_border') || 'true'
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [dbStats, setDbStats] = useState(null);
    const [optimizing, setOptimizing] = useState(false);
    const [isReseting, setIsReseting] = useState(false);
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null); // { title, message, onConfirm, type }
    const [passwordPrompt, setPasswordPrompt] = useState(null);


    useEffect(() => {
        fetchSettings();
        fetchDbStats();
    }, []);

    const fetchDbStats = async () => {
        try {
            const res = await axios.get('/api/db-stats');
            setDbStats(res.data);
        } catch (err) {
            console.error('Lỗi khi tải thống kê DB:', err);
        }
    };

    const handleOptimize = async () => {
        setConfirm({
            title: "Tối ưu hóa DB",
            message: "Tối ưu hóa sẽ sắp xếp lại dữ liệu và nén dung lượng file. App có thể tạm thời không phản hồi trong vài giây. Bạn muốn tiếp tục?",
            onConfirm: async () => {
                setOptimizing(true);
                setConfirm(null);
                try {
                    const res = await axios.post('/api/optimize-db');
                    setToast({ message: res.data.message, type: 'success' });
                    fetchDbStats();
                } catch (err) {
                    setToast({ message: 'Lỗi khi tối ưu hóa DB', type: 'error' });
                } finally {
                    setOptimizing(false);
                }
            },
            type: "info"
        });
    };


    const handleResetData = () => {
        setConfirm({
            title: "CẢNH BÁO NGUY HIỂM",
            message: "HÀNH ĐỘNG NÀY SẼ XOÁ TOÀN BỘ DỮ LIỆU (Sản phẩm, Khách hàng, Hoá đơn...). Dữ liệu sau khi xoá KHÔNG THỂ khôi phục. Bạn có chắc chắn muốn tiếp tục?",
            onConfirm: () => {
                setConfirm(null);
                setPasswordPrompt({
                    title: "Xác thực quyền quản trị",
                    message: "Vui lòng nhập mật khẩu xác nhận để tiến hành xoá dữ liệu.",
                    onConfirm: async (password) => {
                        setPasswordPrompt(null);
                        setIsReseting(true);
                        try {
                            const res = await axios.post('/api/reset-database', { password });
                            setToast({ message: res.data.message, type: 'success' });
                            setTimeout(() => window.location.reload(), 2000);
                        } catch (err) {
                            setToast({ message: err.response?.data?.error || 'Lỗi khi reset dữ liệu', type: 'error' });
                            setIsReseting(false);
                        }
                    }
                });
            },
            type: "danger"
        });
    };

    const handleRestore = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setConfirm({
            title: "Khôi phục dữ liệu",
            message: "DỮ LIỆU HIỆN TẠI SẼ BỊ XOÁ SẠCH và thay thế bằng file sao lưu này. Bạn có chắc chắn?",
            onConfirm: async () => {
                const fd = new FormData();
                fd.append('file', file);
                setLoading(true);
                setConfirm(null);
                try {
                    const res = await axios.post('/api/restore', fd);
                    setToast({ message: res.data.message + ". Hệ thống sẽ khởi động lại...", type: "success" });
                    setTimeout(() => window.location.reload(), 2000);
                } catch (err) {
                    setToast({ message: "Lỗi khôi phục: " + (err.response?.data?.error || "Lỗi server"), type: "error" });
                } finally {
                    setLoading(false);
                }
            },
            type: "danger"
        });
        e.target.value = '';
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            if (Object.keys(res.data).length > 0) {
                const localMode = localStorage.getItem('pos_input_mode');
                setSettings(prev => ({
                    ...prev,
                    ...res.data
                }));
            }
        } catch (err) {
            console.error('Lỗi khi tải cài đặt:', err);
        }
    };

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };



    const handleSave = async () => {
        setLoading(true);
        setMessage('');
        try {
            await axios.post('/api/settings', settings);
            setToast({ message: 'Đã lưu cấu hình thành công!', type: 'success' });
        } catch (err) {
            setToast({ message: 'Lỗi khi lưu cài đặt', type: 'error' });
        } finally {
            setLoading(false);
        }
    };


    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="p-10 pb-32 max-w-6xl mx-auto transition-colors relative">
            <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none -mr-20 -mt-20">
                <Tractor size={400} className="text-[#4a7c59]" />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16 relative z-10">
                <div>
                    <h1 className="text-5xl font-black text-[#2d5016] dark:text-[#4a7c59] uppercase tracking-tighter flex items-center gap-4 py-2">
                        <div className="p-3 bg-gradient-to-br from-[#2d5016] to-[#4a7c59] rounded-3xl text-white shadow-2xl shadow-[#4a7c59]/30">
                            <SettingsIcon size={36} />
                        </div>
                        CẤU HÌNH VỤ MÙA
                    </h1>
                    <p className="text-[#8b6f47] dark:text-[#d4a574]/60 font-black uppercase tracking-[0.3em] mt-3 ml-2 flex items-center gap-2">
                        <Wheat size={16} className="text-[#d4a574]" /> Quản trị & Vận hành hệ thống
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:to-amber-700 text-white px-10 py-5 rounded-[2rem] font-black shadow-[0_20px_50px_-10px_rgba(245,158,11,0.4)] active:scale-95 disabled:opacity-50 transition-all uppercase text-sm tracking-[0.2em] border-2 border-white/20"
                >
                    <Save size={24} />
                    {loading ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}
                </button>
            </div>

            {message && (
                <div className="mb-12 p-8 bg-emerald-50/80 dark:bg-emerald-950/20 backdrop-blur-md text-emerald-700 dark:text-emerald-400 rounded-[2.5rem] font-black border-2 border-emerald-100 dark:border-emerald-800/40 animate-in fade-in slide-in-from-top-6 flex items-center gap-4 shadow-xl">
                    <div className="p-3 bg-emerald-500 rounded-2xl text-white">
                        <Wheat size={24} />
                    </div>
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                {/* Store Info */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-2 border-[#d4a574]/10 p-10 rounded-[3.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.05)] relative overflow-hidden group transition-all hover:shadow-[0_40px_140px_-20px_rgba(0,0,0,0.1)]">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                        <Building size={160} className="text-[#2d5016]" />
                    </div>

                    <div className="flex items-center gap-5 mb-10">
                        <div className="p-4 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-[1.5rem] text-[#2d5016] dark:text-emerald-400 shadow-inner">
                            <Building size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 dark:text-emerald-50 uppercase tracking-tight">Thông tin Trang trại</h2>
                            <div className="h-1 w-12 bg-[#4a7c59] rounded-full mt-1" />
                        </div>
                    </div>

                    <div className="space-y-8 relative z-10">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-[#8b6f47] dark:text-[#d4a574]/60 uppercase tracking-[0.3em] ml-2">Tên định danh</label>
                            <input
                                name="shop_name"
                                value={settings.shop_name}
                                onChange={handleChange}
                                placeholder="Nhập tên trang trại..."
                                className="w-full p-5 bg-[#fdfcfb] dark:bg-slate-800/50 border-2 border-[#d4a574]/10 dark:border-slate-700 rounded-3xl font-black text-gray-800 dark:text-emerald-50 focus:border-[#4a7c59] outline-none shadow-inner transition-all"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-[#8b6f47] dark:text-[#d4a574]/60 uppercase tracking-[0.3em] ml-2">Đường dây nóng (Hotline)</label>
                            <input
                                name="shop_phone"
                                value={settings.shop_phone}
                                onChange={handleChange}
                                placeholder="0xxx.xxx.xxx"
                                className="w-full p-5 bg-[#fdfcfb] dark:bg-slate-800/50 border-2 border-[#d4a574]/10 dark:border-slate-700 rounded-3xl font-black text-gray-800 dark:text-emerald-50 font-mono focus:border-[#4a7c59] outline-none shadow-inner transition-all"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-[#8b6f47] dark:text-[#d4a574]/60 uppercase tracking-[0.3em] ml-2">Địa chỉ canh tác</label>
                            <textarea
                                name="shop_address"
                                value={settings.shop_address}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Địa chỉ chi tiết..."
                                className="w-full p-5 bg-[#fdfcfb] dark:bg-slate-800/50 border-2 border-[#d4a574]/10 dark:border-slate-700 rounded-3xl font-bold text-gray-800 dark:text-emerald-50 resize-none focus:border-[#4a7c59] outline-none shadow-inner transition-all"
                            />
                        </div>

                        <div className="pt-8 border-t-2 border-[#d4a574]/10 space-y-6">
                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-[0.4em] ml-2 flex items-center gap-2">
                                <CreditCard size={14} /> Hồ sơ Ngân quỹ
                            </label>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Tên ngân hàng</label>
                                <input
                                    name="shop_bank"
                                    value={settings.shop_bank}
                                    onChange={handleChange}
                                    placeholder="Ví dụ: MB Bank, Vietcombank..."
                                    className="w-full p-5 bg-[#fdfcfb] dark:bg-slate-800/50 border-2 border-[#d4a574]/10 dark:border-slate-700 rounded-3xl font-black text-gray-800 dark:text-emerald-50 focus:border-amber-500 outline-none shadow-inner transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Số tài khoản</label>
                                    <input
                                        name="shop_bank_account"
                                        value={settings.shop_bank_account}
                                        onChange={handleChange}
                                        className="w-full p-5 bg-[#fdfcfb] dark:bg-slate-800/50 border-2 border-[#d4a574]/10 dark:border-slate-700 rounded-3xl font-black text-gray-800 dark:text-emerald-50 font-mono focus:border-amber-500 outline-none shadow-inner transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Chủ tài khoản</label>
                                    <input
                                        name="shop_bank_user"
                                        value={settings.shop_bank_user}
                                        onChange={handleChange}
                                        className="w-full p-5 bg-[#fdfcfb] dark:bg-slate-800/50 border-2 border-[#d4a574]/10 dark:border-slate-700 rounded-3xl font-black text-gray-800 dark:text-emerald-50 uppercase focus:border-amber-500 outline-none shadow-inner transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-10">
                    {/* Data Security */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-2 border-amber-500/10 p-10 rounded-[3.5rem] shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                            <Database size={160} className="text-amber-500" />
                        </div>

                        <div className="flex items-center gap-5 mb-10">
                            <div className="p-4 bg-amber-100/50 dark:bg-amber-900/30 rounded-[1.5rem] text-amber-600 shadow-inner">
                                <Database size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-800 dark:text-emerald-50 uppercase tracking-tight">Kho lưu trữ & Bảo mật</h2>
                                <div className="h-1 w-12 bg-amber-500 rounded-full mt-1" />
                            </div>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div className="p-8 bg-amber-50/50 dark:bg-amber-950/10 rounded-[2.5rem] border-2 border-amber-100 dark:border-amber-900/30 shadow-inner">
                                <p className="text-[11px] font-black text-amber-800/60 dark:text-amber-400/60 mb-6 leading-relaxed uppercase tracking-widest">Sao lưu nhật ký mùa lúa để đề phòng thất thoát dữ liệu.</p>
                                <button
                                    onClick={() => window.open('/api/backup', '_blank')}
                                    className="w-full flex items-center justify-center gap-4 p-5 bg-white dark:bg-slate-900 text-amber-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] border-2 border-amber-100 dark:border-amber-900/30 hover:bg-amber-500 hover:text-white transition-all shadow-md active:scale-95"
                                >
                                    <Download size={20} /> TẢI FILE SAO LƯU (.db)
                                </button>
                            </div>

                            <div className="flex gap-4">
                                <input type="file" id="restoreFile" accept=".db" className="hidden" onChange={handleRestore} />
                                <button
                                    onClick={() => document.getElementById('restoreFile').click()}
                                    className="flex-1 flex items-center justify-center gap-3 p-5 bg-white dark:bg-slate-900 text-rose-500 border-2 border-rose-100 dark:border-rose-900/30 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95"
                                >
                                    <RefreshCcw size={18} /> Phục hồi
                                </button>
                                <button
                                    onClick={handleResetData}
                                    disabled={isReseting}
                                    className="flex-1 flex items-center justify-center gap-3 p-5 bg-rose-500 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 active:scale-95"
                                >
                                    <Trash2 size={18} /> Xoá trắng
                                </button>
                            </div>


                        </div>
                    </div>

                    {/* Performance Optimization */}
                    <div className="bg-[#2d5016] p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                            <RefreshCcw size={160} className="text-white" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-5 mb-8">
                                <div className="p-4 bg-white/10 rounded-[1.5rem] text-white backdrop-blur-md">
                                    <Sparkles size={28} />
                                </div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Tối ưu máy chủ</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Dung lượng DB</p>
                                    <p className="text-3xl font-black text-white tracking-tighter">{dbStats?.db_size_mb || 0} <span className="text-xs">MB</span></p>
                                </div>
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Tổng Giao dịch</p>
                                    <p className="text-3xl font-black text-white tracking-tighter">{dbStats?.orders || 0}</p>
                                </div>
                            </div>

                            <button
                                onClick={handleOptimize}
                                disabled={optimizing}
                                className="w-full flex items-center justify-center gap-4 p-6 bg-white text-[#2d5016] rounded-3xl font-black tracking-[0.2em] text-xs uppercase shadow-2xl hover:bg-emerald-50 transition-all active:scale-95"
                            >
                                <RefreshCcw size={22} className={optimizing ? "animate-spin" : ""} />
                                {optimizing ? "ĐANG DỌN DẸP..." : "TỐI ƯU HÓA HỆ THỐNG"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* UI Settings */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-2 border-[#4a7c59]/10 p-10 rounded-[3.5rem] shadow-xl relative overflow-hidden group">
                    <div className="flex items-center gap-5 mb-10">
                        <div className="p-4 bg-[#4a7c59]/10 rounded-[1.5rem] text-[#4a7c59] shadow-inner">
                            <Monitor size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 dark:text-emerald-50 uppercase tracking-tight">Cá nhân hóa</h2>
                            <div className="h-1 w-12 bg-[#4a7c59] rounded-full mt-1" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-6 bg-[#fdfcfb] dark:bg-slate-800/50 rounded-3xl border-2 border-[#d4a574]/10 group transition-all hover:border-[#4a7c59]/30">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-[#8b6f47] shadow-sm group-hover:text-amber-500 transition-colors">
                                    <Bot size={28} />
                                </div>
                                <div>
                                    <div className="text-lg font-black text-gray-800 dark:text-slate-100">Hỗ trợ viên (Mascots)</div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Hiền thị Doraemon ở mọi trang</div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const newVal = settings.ui_show_doraemon === 'true' ? 'false' : 'true';
                                    updateSetting('ui_show_doraemon', newVal);
                                    localStorage.setItem('ui_show_doraemon', newVal);
                                    window.dispatchEvent(new Event('storage'));
                                }}
                                className={cn(
                                    "relative w-14 h-7 rounded-full transition-all duration-300 outline-none",
                                    settings.ui_show_doraemon === 'true' ? "bg-gradient-to-r from-[#2d5016] to-[#4a7c59]" : "bg-slate-300 dark:bg-slate-700"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-xl",
                                    settings.ui_show_doraemon === 'true' ? "translate-x-7" : "translate-x-0"
                                )} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-[#fdfcfb] dark:bg-slate-800/50 rounded-3xl border-2 border-[#d4a574]/10 group transition-all hover:border-[#4a7c59]/30">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-[#8b6f47] shadow-sm group-hover:text-indigo-500 transition-colors">
                                    <Sparkles size={28} />
                                </div>
                                <div>
                                    <div className="text-lg font-black text-gray-800 dark:text-slate-100">Bản tin Vụ mùa</div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Mascot chào mừng tại Dashboard</div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const newVal = settings.ui_show_dashboard_mascot === 'true' ? 'false' : 'true';
                                    updateSetting('ui_show_dashboard_mascot', newVal);
                                    localStorage.setItem('ui_show_dashboard_mascot', newVal);
                                    window.dispatchEvent(new Event('storage'));
                                }}
                                className={cn(
                                    "relative w-14 h-7 rounded-full transition-all duration-300 outline-none",
                                    settings.ui_show_dashboard_mascot === 'true' ? "bg-gradient-to-r from-[#2d5016] to-[#4a7c59]" : "bg-slate-300 dark:bg-slate-700"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-xl",
                                    settings.ui_show_dashboard_mascot === 'true' ? "translate-x-7" : "translate-x-0"
                                )} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-[#fdfcfb] dark:bg-slate-800/50 rounded-3xl border-2 border-[#d4a574]/10 group transition-all hover:border-[#4a7c59]/30">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-[#8b6f47] shadow-sm group-hover:text-amber-500 transition-colors">
                                    <Sparkles size={28} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-lg font-black text-gray-800 dark:text-slate-100 flex items-center gap-2">
                                        Viền Cầu Vồng
                                        <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase">Premium</span>
                                    </div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Hiệu ứng viền Neon động quanh giỏ hàng</div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const newVal = settings.ui_show_rainbow_border === 'true' ? 'false' : 'true';
                                    updateSetting('ui_show_rainbow_border', newVal);
                                    localStorage.setItem('ui_show_rainbow_border', newVal);
                                    window.dispatchEvent(new Event('storage'));
                                }}
                                className={cn(
                                    "relative w-14 h-7 rounded-full transition-all duration-300 outline-none",
                                    settings.ui_show_rainbow_border === 'true' ? "bg-gradient-to-r from-amber-500 to-[#e91e63]" : "bg-slate-300 dark:bg-slate-700"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-xl",
                                    settings.ui_show_rainbow_border === 'true' ? "translate-x-7" : "translate-x-0"
                                )} />
                            </button>
                        </div>
                    </div>
                </div>


                {/* Keyboard Shortcuts */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-2 border-[#d4a574]/10 p-10 rounded-[3.5rem] shadow-xl">
                    <div className="flex items-center gap-5 mb-10">
                        <div className="p-4 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-[1.5rem] text-indigo-600 shadow-inner">
                            <Keyboard size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 dark:text-emerald-50 uppercase tracking-tight">Kỹ thuật Thu hoạch</h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Phím tắt thao tác nhanh</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#8b6f47] uppercase tracking-[0.2em] ml-2">Tìm Sản phẩm</label>
                            <input name="kb_search" value={settings.kb_search || 'F2'} onChange={handleChange} className="w-full p-5 bg-[#fdfcfb] dark:bg-slate-800/50 border-2 border-[#d4a574]/10 rounded-3xl font-black text-center text-2xl text-[#2d5016] focus:border-[#4a7c59] outline-none shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] ml-2">Kết toán</label>
                            <input name="kb_pay" value={settings.kb_pay || 'F9'} onChange={handleChange} className="w-full p-5 bg-[#fdfcfb] dark:bg-slate-800/50 border-2 border-[#d4a574]/10 rounded-3xl font-black text-center text-2xl text-amber-500 focus:border-amber-500 outline-none shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#8b6f47] uppercase tracking-[0.2em] ml-2">Tạo Đơn mới</label>
                            <input name="kb_new" value={settings.kb_new || 'F4'} onChange={handleChange} className="w-full p-5 bg-[#fdfcfb] dark:bg-slate-800/50 border-2 border-[#d4a574]/10 rounded-3xl font-black text-center text-2xl text-[#2d5016] focus:border-[#4a7c59] outline-none shadow-inner" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] ml-2">Lưu Phôi (Treo)</label>
                            <input name="kb_hold" value={settings.kb_hold || 'F8'} onChange={handleChange} className="w-full p-5 bg-[#fdfcfb] dark:bg-slate-800/50 border-2 border-[#d4a574]/10 rounded-3xl font-black text-center text-2xl text-blue-500 focus:border-blue-500 outline-none shadow-inner" />
                        </div>
                    </div>
                </div>

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

                {passwordPrompt && (
                    <PasswordConfirmModal
                        isOpen={!!passwordPrompt}
                        title={passwordPrompt.title}
                        message={passwordPrompt.message}
                        onConfirm={passwordPrompt.onConfirm}
                        onCancel={() => setPasswordPrompt(null)}
                    />
                )}


            </div>
        </div>
    );
}
