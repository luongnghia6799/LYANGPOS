import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { User, Lock, ArrowRight, Sparkles, UserPlus, LogIn, Leaf, Sprout, Sun, Wheat } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Welcome() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: localStorage.getItem('saved_username') || '',
        password: '',
        display_name: ''
    });
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Set theme to agri by default on this page


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                const res = await axios.post('/api/login', {
                    username: formData.username,
                    password: formData.password
                });
                const userData = JSON.stringify(res.data.user);
                sessionStorage.setItem('user', userData);

                if (rememberMe) {
                    localStorage.setItem('saved_username', formData.username);
                } else {
                    localStorage.removeItem('saved_username');
                }
                navigate('/');
            } else {
                const res = await axios.post('/api/register', {
                    username: formData.username,
                    password: formData.password,
                    display_name: formData.display_name
                });
                sessionStorage.setItem('user', JSON.stringify(res.data.user));
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Thông tin đăng nhập không chính xác');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#faf8f3] dark:bg-[#06150a] overflow-hidden relative">
            {/* Organic Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <m.div
                    animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#2d5016]/5 rounded-full blur-[100px]"
                />
                <m.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, -5, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#d4a574]/10 rounded-full blur-[100px]"
                />

                {/* Floating Icons for Agri Vibe */}
                <m.div
                    animate={{ y: [0, -20, 0], rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity }}
                    className="absolute top-[20%] right-[15%] text-[#2d5016]/10"
                >
                    <Leaf size={120} />
                </m.div>
                <m.div
                    animate={{ y: [0, 20, 0], rotate: -45 }}
                    transition={{ duration: 12, repeat: Infinity }}
                    className="absolute bottom-[20%] left-[10%] text-[#d4a574]/10"
                >
                    <Wheat size={160} />
                </m.div>
            </div>

            <m.div
                initial={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(20px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-md relative z-10 p-6"
            >

                {/* Brand / Logo Section */}
                <div className="text-center mb-6">
                    <m.div
                        initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={{
                            delay: 0.4,
                            type: "spring",
                            stiffness: 150,
                            damping: 20
                        }}
                        className="inline-flex items-center justify-center w-40 h-40 mb-4 group"
                    >
                        <img
                            src={logo}
                            alt="Logo"
                            className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(45,80,22,0.3)] group-hover:scale-110 transition-transform duration-700 ease-out"
                        />
                    </m.div>

                    <m.div
                        initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <h1 className="text-5xl font-black text-primary dark:text-emerald-400 tracking-tighter mb-2 italic">
                            Lyang<span className="text-[#d4a574] not-italic text-glow">POS</span>
                        </h1>
                        <p className="text-[#8b6f47] dark:text-emerald-400/60 font-bold uppercase tracking-[0.2em] text-[10px]">
                            Quản lý vụ mùa thông minh • {new Date().getFullYear()}
                        </p>
                    </m.div>

                </div>

                {/* Form Context Card */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] border-2 border-[#d4a574]/20 p-8 shadow-2xl relative overflow-hidden group">
                    {/* Decorative Wheat on Card */}
                    <div className="absolute -right-6 -bottom-6 opacity-[0.05] -rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
                        <Wheat size={120} />
                    </div>

                    {/* Login/Register Toggle */}
                    <div className="flex bg-[#faf8f3] dark:bg-slate-950/50 p-1.5 rounded-[1.8rem] mb-8 relative border border-[#d4a574]/10">
                        <m.div
                            className="absolute inset-y-1.5 rounded-[1.4rem] bg-gradient-to-r from-[#2d5016] to-[#4a7c59] shadow-lg shadow-[#2d5016]/20"
                            initial={false}
                            animate={{
                                left: isLogin ? '6px' : '50%',
                                width: 'calc(50% - 6px)'
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                        <button
                            onClick={() => { setIsLogin(true); setError(''); }}
                            className={`flex-1 relative z-10 py-3.5 text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${isLogin ? 'text-white' : 'text-[#8b6f47] hover:text-[#2d5016]'}`}
                        >
                            <LogIn size={16} /> Đăng nhập
                        </button>
                        <button
                            onClick={() => { setIsLogin(false); setError(''); }}
                            className={`flex-1 relative z-10 py-3.5 text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${!isLogin ? 'text-white' : 'text-[#8b6f47] hover:text-[#2d5016]'}`}
                        >
                            <UserPlus size={16} /> Đăng ký
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <AnimatePresence mode="wait">
                            {!isLogin && (
                                <m.div
                                    key="displayName"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-1.5"
                                >
                                    <label className="text-[10px] font-black text-[#8b6f47] uppercase ml-4">Tên hiển thị</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#d4a574] group-focus-within:text-[#2d5016] transition-colors">
                                            <Sparkles size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full bg-[#faf8f3] dark:bg-slate-950/50 border-2 border-transparent focus:border-[#d4a574]/30 focus:bg-white rounded-2xl py-4 pl-14 pr-4 text-[#2d5016] placeholder-[#8b6f47]/40 outline-none transition-all font-bold shadow-inner"
                                            placeholder="Họ tên của bạn..."
                                            value={formData.display_name}
                                            onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                                            required={!isLogin}
                                        />
                                    </div>
                                </m.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[#8b6f47] uppercase ml-4">Tên đăng nhập</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#d4a574] group-focus-within:text-[#2d5016] transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    className="w-full bg-[#faf8f3] dark:bg-slate-950/50 border-2 border-transparent focus:border-[#d4a574]/30 focus:bg-white rounded-2xl py-4 pl-14 pr-4 text-[#2d5016] placeholder-[#8b6f47]/40 outline-none transition-all font-bold shadow-inner"
                                    placeholder="Username"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[#8b6f47] uppercase ml-4">Mật khẩu</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#d4a574] group-focus-within:text-[#2d5016] transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    className="w-full bg-[#faf8f3] dark:bg-slate-950/50 border-2 border-transparent focus:border-[#d4a574]/30 focus:bg-white rounded-2xl py-4 pl-14 pr-4 text-[#2d5016] placeholder-[#8b6f47]/40 outline-none transition-all font-bold shadow-inner"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {isLogin && (
                            <div className="flex items-center gap-2 ml-2">
                                <label className="flex items-center gap-3 cursor-pointer group/check">
                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-[#2d5016] border-[#2d5016]' : 'bg-transparent border-[#d4a574]/40 group-hover/check:border-[#2d5016]'}`}>
                                        {rememberMe && <m.div initial={{ scale: 0 }} animate={{ scale: 1 }}><ArrowRight size={12} className="text-white -rotate-45" /></m.div>}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={rememberMe}
                                        onChange={e => setRememberMe(e.target.checked)}
                                    />
                                    <span className={`text-[11px] font-black transition-colors uppercase tracking-wider ${rememberMe ? 'text-[#2d5016]' : 'text-[#8b6f47] group-hover/check:text-[#2d5016]'}`}>
                                        Ghi nhớ tài khoản
                                    </span>
                                </label>
                            </div>
                        )}

                        {error && (
                            <m.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 bg-red-50 dark:bg-red-950/20 border-2 border-red-200/50 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-[11px] font-black text-center uppercase tracking-wider"
                            >
                                {error}
                            </m.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-[#2d5016]/20 hover:shadow-[#2d5016]/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 group disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Đang chuẩn bị...</span>
                                </div>
                            ) : (
                                <>
                                    <span>{isLogin ? 'Vào cửa hàng' : 'Bắt đầu ngay'}</span>
                                    <m.div
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        <ArrowRight size={20} />
                                    </m.div>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Credits */}
                <div className="text-center mt-10">
                    <p className="text-[#8b6f47]/40 dark:text-emerald-900 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                        <Leaf size={12} /> LyangPOS Sustainable Agri System • 2024
                    </p>
                </div>
            </m.div>
        </div>
    );
}
