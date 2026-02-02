import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { m, AnimatePresence } from 'framer-motion';
import {
    Landmark, Search, Plus, ArrowUpRight, ArrowDownLeft,
    MoreHorizontal, Trash2, Edit3, History, CreditCard,
    DollarSign, Calendar, Filter, Download, ChevronRight,
    RefreshCcw, CheckCircle, X, Wallet, User, FileText
} from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';
import { cn } from '../lib/utils';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

import Portal from '../components/Portal';

export default function BankManager() {
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all', 'Deposit', 'Withdrawal'

    // Modals
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'

    // Forms
    const [accountForm, setAccountForm] = useState({
        bank_name: '',
        account_number: '',
        account_holder: '',
        balance: 0
    });

    const [transactionForm, setTransactionForm] = useState({
        account_id: '',
        amount: 0,
        type: 'Deposit', // 'Deposit', 'Withdrawal'
        note: ''
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        if (accounts.length > 0 && !selectedAccount) {
            setSelectedAccount(accounts[0]);
        }
    }, [accounts]);

    useEffect(() => {
        if (selectedAccount) {
            fetchTransactions(selectedAccount.id);
        }
    }, [selectedAccount]);

    const fetchAccounts = async () => {
        try {
            const res = await axios.get('/api/bank-accounts');
            setAccounts(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchTransactions = async (accountId) => {
        setLoading(true);
        try {
            const res = await axios.get('/api/bank-transactions', { params: { account_id: accountId } });
            setTransactions(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = React.useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = (t.note || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.partner_name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || t.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [transactions, searchTerm, filterType]);

    const handleSaveAccount = async () => {
        if (!accountForm.bank_name || !accountForm.account_number) {
            setToast({ message: "Vui lòng nhập tên ngân hàng và số tài khoản", type: "error" });
            return;
        }
        try {
            if (modalMode === 'add') {
                await axios.post('/api/bank-accounts', accountForm);
                setToast({ message: "Đã thêm tài khoản thành công!", type: "success" });
            } else {
                await axios.put(`/api/bank-accounts/${selectedAccount.id}`, accountForm);
                setToast({ message: "Đã cập nhật tài khoản!", type: "success" });
            }
            fetchAccounts();
            setShowAccountModal(false);
            setAccountForm({ bank_name: '', account_number: '', account_holder: '', balance: 0 });
        } catch (err) {
            setToast({ message: "Lỗi khi lưu tài khoản", type: "error" });
        }
    };

    const handleDeleteAccount = (id) => {
        setConfirm({
            title: "Xác nhận xóa tài khoản",
            message: "Xóa tài khoản này sẽ xóa toàn bộ lịch sử giao dịch liên quan. Bạn có chắc chắn muốn thực hiện?",
            onConfirm: async () => {
                try {
                    await axios.delete(`/api/bank-accounts/${id}`);
                    setAccounts(accounts.filter(a => a.id !== id));
                    if (selectedAccount?.id === id) setSelectedAccount(null);
                    setToast({ message: "Đã xóa tài khoản", type: "success" });
                } catch (err) {
                    setToast({ message: "Lỗi khi xóa tài khoản", type: "error" });
                }
                setConfirm(null);
            },
            type: "danger"
        });
    };

    const handleRecordTransaction = async () => {
        if (!transactionForm.amount || !transactionForm.account_id) {
            setToast({ message: "Vui lòng nhập số tiền và chọn tài khoản", type: "error" });
            return;
        }
        try {
            await axios.post('/api/bank-transactions', transactionForm);
            setToast({ message: "Đã ghi nhận giao dịch!", type: "success" });
            fetchAccounts();
            if (selectedAccount?.id === parseInt(transactionForm.account_id)) {
                fetchTransactions(selectedAccount.id);
            }
            setShowTransactionModal(false);
            setTransactionForm({ ...transactionForm, amount: 0, note: '' });
        } catch (err) {
            setToast({ message: "Lỗi khi thực hiện giao dịch", type: "error" });
        }
    };

    return (
        <div className="p-4 w-full space-y-10 min-h-screen">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-4xl font-black text-[#1e293b] dark:text-white uppercase tracking-tighter flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl text-white shadow-xl shadow-blue-500/20">
                            <Landmark size={32} />
                        </div>
                        TÀI KHOẢN NGÂN HÀNG
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase tracking-[0.1em] text-xs">
                        Quản lý dòng tiền và các tài khoản ngân hàng của bạn
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            setModalMode('add');
                            setAccountForm({ bank_name: '', account_number: '', account_holder: '', balance: 0 });
                            setShowAccountModal(true);
                        }}
                        className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 font-black rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all flex items-center gap-2 shadow-lg"
                    >
                        <Plus size={20} /> THÊM TÀI KHOẢN
                    </button>
                    <button
                        onClick={() => {
                            setTransactionForm({ ...transactionForm, account_id: selectedAccount?.id || accounts[0]?.id || '' });
                            setShowTransactionModal(true);
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                    >
                        <RefreshCcw size={20} /> LẬP GIAO DỊCH
                    </button>
                </div>
            </div>

            {/* Account Slider/Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {accounts.map((acc) => (
                        <m.div
                            key={acc.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={() => setSelectedAccount(acc)}
                            className={cn(
                                "relative p-8 rounded-[3rem] cursor-pointer transition-all duration-500 overflow-hidden group border-4",
                                selectedAccount?.id === acc.id
                                    ? "bg-gradient-to-br from-slate-900 to-slate-800 border-blue-500/50 shadow-2xl shadow-blue-500/20"
                                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 shadow-xl"
                            )}
                        >
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-10">
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                                        selectedAccount?.id === acc.id ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-blue-600"
                                    )}>
                                        <CreditCard size={28} />
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setModalMode('edit');
                                                setAccountForm({ ...acc });
                                                setShowAccountModal(true);
                                            }}
                                            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteAccount(acc.id);
                                            }}
                                            className="p-2 bg-rose-500/20 hover:bg-rose-500/40 rounded-xl text-rose-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className={cn(
                                        "text-xs font-black uppercase tracking-[0.2em]",
                                        selectedAccount?.id === acc.id ? "text-blue-400" : "text-slate-400"
                                    )}>{acc.bank_name}</h3>
                                    <p className={cn(
                                        "text-2xl font-black tracking-tight",
                                        selectedAccount?.id === acc.id ? "text-white" : "text-slate-800 dark:text-white"
                                    )}>{acc.account_number}</p>
                                    <p className={cn(
                                        "text-[10px] font-black uppercase opacity-60",
                                        selectedAccount?.id === acc.id ? "text-slate-300" : "text-slate-500"
                                    )}>{acc.account_holder || 'CHƯA CẬP NHẬT TÊN'}</p>
                                </div>

                                <div className="mt-10 pt-6 border-t border-slate-500/20">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Số dư khả dụng</div>
                                    <div className={cn(
                                        "text-4xl font-black tracking-tighter tabular-nums",
                                        selectedAccount?.id === acc.id ? "text-white" : "text-blue-600"
                                    )}>
                                        {formatNumber(acc.balance)} <span className="text-xl">đ</span>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative Elements */}
                            <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:rotate-12 duration-700">
                                <Landmark size={200} />
                            </div>
                        </m.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Transactions Section */}
            {selectedAccount && (
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-2 border-slate-100 dark:border-slate-800 p-10 rounded-[4rem] shadow-2xl"
                >
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600">
                                <History size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Lịch sử giao dịch</h2>
                                <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase">Bản liệt kê các thay đổi số dư gần đây</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <select
                                className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm transition-all dark:text-white"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="all">Tất cả loại giao dịch</option>
                                <option value="Deposit">Nạp tiền / Thu hộ</option>
                                <option value="Withdrawal">Rút tiền / Chi hộ</option>
                            </select>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Tìm theo ghi chú, đối tác..."
                                    className="pl-12 pr-6 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold text-sm w-80 transition-all dark:text-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b-2 border-slate-50 dark:border-slate-800">
                                    <th className="px-6 py-4 text-left font-black">Thời gian</th>
                                    <th className="px-6 py-4 text-left font-black">Phân loại</th>
                                    <th className="px-6 py-4 text-left font-black">Ghi chú</th>
                                    <th className="px-6 py-4 text-right font-black">Số tiền (đ)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <RefreshCcw size={40} className="animate-spin text-blue-500/20" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-full text-slate-200">
                                                    <Search size={60} />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Không tìm thấy giao dịch phù hợp</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map((t, idx) => (
                                        <m.tr
                                            key={t.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group"
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                                                        <Calendar size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-800 dark:text-slate-200">{formatDate(t.date).split(' ')[0]}</div>
                                                        <div className="text-[10px] font-bold text-slate-400">{formatDate(t.date).split(' ')[1]}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className={cn(
                                                    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                                                    t.type === 'Deposit'
                                                        ? "bg-emerald-100/50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                                        : "bg-rose-100/50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                                                )}>
                                                    {t.type === 'Deposit' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                                    {t.type === 'Deposit' ? 'Nạp tiền' : 'Rút tiền'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-bold text-slate-600 dark:text-slate-400 max-w-md truncate">
                                                    {t.note || 'Không có ghi chú'}
                                                    {t.partner_name && (
                                                        <span className="ml-2 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-md text-[9px] uppercase font-black">
                                                            {t.partner_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right tabular-nums">
                                                <div className={cn(
                                                    "text-lg font-black tracking-tight",
                                                    t.type === 'Deposit' ? "text-emerald-600" : "text-rose-600"
                                                )}>
                                                    {t.type === 'Deposit' ? '+' : '-'}{formatNumber(t.amount)}
                                                </div>
                                            </td>
                                        </m.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </m.div>
            )}

            {/* Account Modal */}
            <Portal>
                <AnimatePresence>
                    {showAccountModal && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <m.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden border-2 border-blue-500/20"
                            >
                                <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/10 dark:to-slate-900">
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                                        <div className="p-2 bg-blue-500 rounded-xl text-white shadow-lg">
                                            <Landmark size={20} />
                                        </div>
                                        {modalMode === 'add' ? 'Thêm tài khoản mới' : 'Cập nhật tài khoản'}
                                    </h2>
                                    <button onClick={() => setShowAccountModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={24} /></button>
                                </div>

                                <div className="p-10 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên ngân hàng</label>
                                        <input
                                            type="text"
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold dark:text-white transition-all shadow-inner"
                                            placeholder="VD: Vietcombank, Techcombank..."
                                            value={accountForm.bank_name}
                                            onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số tài khoản</label>
                                        <input
                                            type="text"
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold dark:text-white transition-all shadow-inner"
                                            placeholder="0123456789..."
                                            value={accountForm.account_number}
                                            onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chủ tài khoản</label>
                                        <input
                                            type="text"
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold dark:text-white transition-all shadow-inner"
                                            placeholder="NGUYEN VAN A..."
                                            value={accountForm.account_holder}
                                            onChange={(e) => setAccountForm({ ...accountForm, account_holder: e.target.value })}
                                        />
                                    </div>
                                    {modalMode === 'add' && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số dư khởi tạo</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    className="w-full p-4 pr-16 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-black text-2xl text-right dark:text-white transition-all shadow-inner"
                                                    placeholder="0"
                                                    value={formatNumber(accountForm.balance)}
                                                    onChange={(e) => setAccountForm({ ...accountForm, balance: parseFloat(e.target.value.replace(/,/g, '')) || 0 })}
                                                />
                                                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">đ</span>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleSaveAccount}
                                        className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                                    >
                                        XÁC NHẬN LƯU
                                    </button>
                                </div>
                            </m.div>
                        </div>
                    )}
                </AnimatePresence>
            </Portal>

            {/* Transaction Modal */}
            <Portal>
                <AnimatePresence>
                    {showTransactionModal && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <m.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden border-2 border-blue-500/20"
                            >
                                <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/10 dark:to-slate-900">
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                                        <div className="p-2 bg-blue-500 rounded-xl text-white shadow-lg">
                                            <RefreshCcw size={20} />
                                        </div>
                                        Lập giao dịch ngân hàng
                                    </h2>
                                    <button onClick={() => setShowTransactionModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={24} /></button>
                                </div>

                                <div className="p-10 space-y-6">
                                    <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-3xl flex border-2 border-slate-100 dark:border-slate-800">
                                        <button
                                            onClick={() => setTransactionForm({ ...transactionForm, type: 'Deposit' })}
                                            className={cn(
                                                "flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
                                                transactionForm.type === 'Deposit' ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <ArrowDownLeft size={16} /> NẠP TIỀN
                                        </button>
                                        <button
                                            onClick={() => setTransactionForm({ ...transactionForm, type: 'Withdrawal' })}
                                            className={cn(
                                                "flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
                                                transactionForm.type === 'Withdrawal' ? "bg-white dark:bg-slate-700 text-rose-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <ArrowUpRight size={16} /> RÚT TIỀN
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chọn tài khoản</label>
                                            <select
                                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold dark:text-white appearance-none transition-all shadow-inner"
                                                value={transactionForm.account_id}
                                                onChange={(e) => setTransactionForm({ ...transactionForm, account_id: e.target.value })}
                                            >
                                                <option value="">Chọn một tài khoản...</option>
                                                {accounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.bank_name} - {a.account_number}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số tiền giao dịch</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    className={cn(
                                                        "w-full p-6 pr-16 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none font-black text-4xl text-right transition-all shadow-inner",
                                                        transactionForm.type === 'Deposit' ? "text-emerald-600" : "text-rose-600"
                                                    )}
                                                    placeholder="0"
                                                    value={formatNumber(transactionForm.amount)}
                                                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: parseFloat(e.target.value.replace(/,/g, '')) || 0 })}
                                                    onFocus={(e) => e.target.select()}
                                                />
                                                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">đ</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung ghi chú</label>
                                            <textarea
                                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold dark:text-white transition-all shadow-inner h-24 resize-none"
                                                placeholder="Ghi chú thêm về giao dịch này..."
                                                value={transactionForm.note}
                                                onChange={(e) => setTransactionForm({ ...transactionForm, note: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleRecordTransaction}
                                        className={cn(
                                            "w-full py-6 text-white rounded-[2.5rem] font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4 uppercase tracking-widest",
                                            transactionForm.type === 'Deposit' ? "bg-emerald-600 shadow-emerald-500/20" : "bg-rose-600 shadow-rose-500/20"
                                        )}
                                    >
                                        XÁC NHẬN GIAO DỊCH
                                    </button>
                                </div>
                            </m.div>
                        </div>
                    )}
                </AnimatePresence>
            </Portal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {confirm && (
                <ConfirmModal
                    title={confirm.title}
                    message={confirm.message}
                    onConfirm={confirm.onConfirm}
                    onClose={() => setConfirm(null)}
                    type={confirm.type}
                />
            )}
        </div>
    );
}
