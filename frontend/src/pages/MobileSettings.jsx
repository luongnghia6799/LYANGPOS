import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { Printer, Lock, Globe, Store, Moon, ChevronRight, Monitor, Menu, Github } from 'lucide-react';
import MobileMenu from '../components/MobileMenu';
import { cn } from '../lib/utils';

export default function MobileSettings() {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const SettingItem = ({ icon: Icon, label, value, onClick, colorClass = "bg-gray-100 text-gray-500" }) => (
        <m.button
            whileTap={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-gray-50 dark:border-slate-800 last:border-0 transition-colors"
        >
            <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm", colorClass)}>
                    <Icon size={20} />
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-black text-xs uppercase tracking-wider text-gray-700 dark:text-gray-200">{label}</span>
                    {value && <span className="text-[10px] font-bold text-gray-400 mt-0.5">{value}</span>}
                </div>
            </div>
            <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
        </m.button>
    );

    return (
        <div className="h-[100dvh] bg-gray-50 dark:bg-slate-950 flex flex-col overflow-hidden font-sans">
            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            {/* Header */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 p-4 flex items-center justify-between z-20">
                <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 text-gray-400">
                    <Menu size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="font-black text-sm uppercase tracking-[0.2em] text-gray-800 dark:text-gray-100">CÀI ĐẶT</h1>
                    <div className="text-[10px] font-bold text-gray-400 mt-0.5 tracking-tighter">Cấu hình hệ thống</div>
                </div>
                <div className="w-8"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">

                {/* Profile Section */}
                <div className="flex flex-col items-center py-6 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-green-300 p-1 mb-4">
                        <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-primary font-black text-2xl">
                            LY
                        </div>
                    </div>
                    <span className="font-black text-lg text-gray-800 dark:text-gray-100 italic">Lyang Store</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Admin Account</span>
                </div>

                {/* Groups */}
                <div className="space-y-6">
                    <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2 pl-2">Vận hành</div>
                        <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-slate-800">
                            <SettingItem icon={Store} label="Thông tin cửa hàng" value="Sửa tên, địa chỉ, logo" colorClass="bg-blue-50 text-blue-500" />
                            <SettingItem icon={Printer} label="Máy in" value="Cài đặt khổ giấy K80/K57" colorClass="bg-orange-50 text-orange-500" />
                            <SettingItem icon={Globe} label="Khu vực & Ngôn ngữ" value="Tiếng Việt / VNĐ" colorClass="bg-indigo-50 text-indigo-500" />
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2 pl-2">Bảo mật & Giao diện</div>
                        <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-slate-800">
                            <SettingItem icon={Moon} label="Giao diện (Dark Mode)" value="Tự động theo hệ thống" colorClass="bg-purple-50 text-purple-500" />
                            <SettingItem icon={Lock} label="Mật khẩu" value="Thay đổi mã PIN truy cập" colorClass="bg-red-50 text-red-500" />
                        </div>
                    </div>
                </div>

                {/* Hero Action */}
                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-5 rounded-3xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs shadow-xl active:scale-[0.98] transition-all"
                >
                    <Monitor size={18} />
                    Chuyển sang Máy tính
                </button>

                <div className="flex flex-col items-center gap-1 opacity-20 py-4">
                    <Github size={16} />
                    <span className="text-[10px] font-bold">Lyang POS v1.1.0 • Stable Build</span>
                </div>
            </div>
        </div>
    );
}
