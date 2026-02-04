
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { ArrowLeft, Printer, Lock, Globe, Store, Moon, Sun, ChevronRight, Monitor, Menu } from 'lucide-react';
import MobileMenu from '../components/MobileMenu';
import { cn } from '../lib/utils';

export default function MobileSettings() {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [theme, setTheme] = useState('light'); // Mock theme state

    const SettingItem = ({ icon: Icon, label, value, onClick, color = 'text-gray-600' }) => (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 active:bg-gray-50 last:border-0"
        >
            <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center", color)}>
                    <Icon size={18} />
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-200">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{value}</span>
                <ChevronRight size={16} className="text-gray-400" />
            </div>
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20">
            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            {/* Header */}
            <div className="bg-white dark:bg-slate-800 p-4 flex items-center gap-4 shadow-sm sticky top-0 z-20">
                <button onClick={() => setIsMenuOpen(true)} className="text-gray-600 dark:text-gray-300">
                    <Menu size={24} />
                </button>
                <h1 className="font-bold text-lg flex-1">Cài Đặt</h1>
            </div>

            <div className="p-4 space-y-6">

                {/* Store Info */}
                <div>
                    <div className="text-xs font-bold text-gray-400 uppercase mb-2 pl-2">Cửa hàng</div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <SettingItem icon={Store} label="Thông tin cửa hàng" value="Lyang Store" color="text-blue-500" />
                        <SettingItem icon={Globe} label="Ngôn ngữ" value="Tiếng Việt" color="text-indigo-500" />
                    </div>
                </div>

                {/* Device & Printer */}
                <div>
                    <div className="text-xs font-bold text-gray-400 uppercase mb-2 pl-2">Thiết bị</div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <SettingItem icon={Printer} label="Máy in hóa đơn" value="Chưa kết nối" color="text-orange-500" />
                        <SettingItem icon={Moon} label="Giao diện" value="Sáng" color="text-purple-500" />
                    </div>
                </div>

                {/* Account */}
                <div>
                    <div className="text-xs font-bold text-gray-400 uppercase mb-2 pl-2">Tài khoản</div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <SettingItem icon={Lock} label="Đổi mật khẩu" color="text-red-500" />
                    </div>
                </div>

                {/* Desktop Mode CTA */}
                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-gradient-to-r from-gray-800 to-gray-700 text-white p-4 rounded-xl flex items-center justify-center gap-3 font-bold shadow-lg shadow-gray-400/20 active:scale-95 transition-transform"
                >
                    <Monitor size={20} />
                    Chuyển sang giao diện Máy tính
                </button>

                <div className="text-center text-xs text-gray-400 pt-4">
                    Phiên bản Mobile v1.0.2
                </div>
            </div>
        </div>
    );
}
