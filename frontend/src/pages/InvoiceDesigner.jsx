import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Save, Trash2, Plus, ArrowLeft, Image as ImageIcon,
    Type, Layout, Palette, Phone, MapPin, Globe, CreditCard,
    CheckCircle2, AlertCircle, FileText, Settings as SettingsIcon,
    ArrowRight, ChevronLeft, ChevronRight, Upload, Download, RefreshCw,
    Table as TableIcon, Undo, Clipboard, Monitor, Printer, Check,
    Bold, Italic, AlignLeft, AlignCenter, AlignRight, Sprout, Wheat, Droplets, Leaf, ChevronDown, Home
} from 'lucide-react';
import { cn, formatNumber } from '../lib/utils';
import Toast from '../components/Toast';
import { m, AnimatePresence } from 'framer-motion';
import PrintTemplate from '../components/PrintTemplate';
import ConfirmModal from '../components/ConfirmModal';
import { DEFAULT_SETTINGS } from '../lib/settings';

const MODULES = [
    { id: 'Sale', label: 'Bán hàng' },
    { id: 'Purchase', label: 'Nhập hàng' },
    { id: 'Report', label: 'Báo cáo' }
];

const PAPER_SIZES = [
    { id: 'A4', label: 'A4 (210mm)' },
    { id: 'A5', label: 'A5 (148mm)' },
    { id: 'A6', label: 'A6 (105mm)' },
    { id: 'K80', label: 'In nhiệt 80mm' },
    { id: 'K58', label: 'In nhiệt 58mm' }
];

function ColorPicker({ label, value, onChange }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#8b6f47] dark:text-[#d4a574]/60 uppercase tracking-[0.2em] ml-1">{label}</label>
            <div className="flex items-center gap-3 p-1.5 bg-[#fdfcfb] dark:bg-slate-800 border-2 border-[#d4a574]/20 dark:border-slate-700 rounded-2xl focus-within:border-[#4a7c59] transition-all shadow-sm">
                <div
                    className="w-10 h-10 rounded-xl shadow-inner border-2 border-[#d4a574]/10 flex-shrink-0 relative overflow-hidden group"
                    style={{ backgroundColor: value || '#000000' }}
                >
                    <input
                        type="color"
                        value={value || '#000000'}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                    />
                </div>
                <input
                    type="text"
                    value={value || '#000000'}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#HEX"
                    className="flex-1 bg-transparent border-none px-2 py-2 text-xs font-black font-mono dark:text-white outline-none uppercase tracking-widest text-[#8b6f47]"
                />
            </div>
        </div>
    );
}

const DEFAULT_INVOICE_CONFIG = {
    ...(DEFAULT_SETTINGS || {}),
    invoice_line_spacing: '1.4',
    invoice_column_spacing: '10',
    invoice_orientation: 'portrait', // portrait, landscape
    invoice_title_size: '22',
    invoice_table_header_size: '12',
    invoice_table_content_size: '12',
    invoice_total_section_size: '14',
    invoice_total_balance_size: '18',
    invoice_show_logo: 'true',
    invoice_show_shop_name: 'true',
    invoice_show_address: 'true',
    invoice_show_phone: 'true',
    invoice_show_thank_you: 'true',
    invoice_thank_you_message: 'Cảm ơn Quý Khách & Hẹn Gặp Lại!',
    invoice_show_id: 'true',
    invoice_show_date: 'true',
    invoice_show_customer_info: 'true',
    invoice_show_table: 'true',
    invoice_show_summary: 'true',
    invoice_show_signatures: 'true',
    invoice_show_col_stt: 'true',
    invoice_show_col_name: 'true',
    invoice_show_col_unit_secondary: 'true',
    invoice_show_col_qty: 'true',
    invoice_show_col_price: 'true',
    invoice_show_col_total: 'true',
    invoice_show_total_items: 'true',
    invoice_show_total_qty: 'true',
    invoice_show_old_debt: 'true',
    invoice_show_bank_info: 'true',
    invoice_show_paid: 'true',
    invoice_show_balance: 'true',
    shop_bank: '',
    shop_bank_account: '',
    shop_bank_user: '',
    invoice_header_spacing: '10',
    invoice_custom_font_url: '',
    invoice_use_default_margins: 'false',
    // New Table Styling
    invoice_table_border: 'true',
    invoice_table_border_rows: 'true',
    invoice_table_border_cols: 'true',
    invoice_table_border_thickness: 'thin',
    invoice_table_border_style: 'solid',
    invoice_table_header_bg_enabled: 'true',
    invoice_table_header_bg_color: '#f2f2f2',
    invoice_table_zebra_stripe: 'true',
    invoice_table_zebra_color: '#f9fafb',
    // Expanded Color Settings
    invoice_color_store_info: '#333333',
    invoice_color_title: '#000000',
    invoice_color_customer_info: '#000000',
    invoice_color_table_header: '#000000',
    invoice_color_table_body: '#000000',
    invoice_color_total_label: '#000000',
    invoice_color_total_value: '#000000',
    invoice_color_notes: '#555555',
    invoice_color_footer: '#444444',
    // Total Line Styling
    invoice_total_line_size: '18',
    invoice_total_line_bold: 'true',
    invoice_total_line_italic: 'false',
    invoice_total_line_margin_top: '10',
    invoice_total_line_margin_bottom: '10',
    // Default Margins (mm)
    invoice_margin_top: '10',
    invoice_margin_bottom: '10',
    invoice_margin_left: '10',

    invoice_margin_right: '10',
    // Report Defaults
    invoice_show_col_code: 'true',
    invoice_show_col_date: 'true',
    invoice_show_col_method: 'true',
    invoice_col_code: '80',
    invoice_col_date: '80',
    invoice_col_method: '80'
};

// Internal component, wrapped below
const InvoiceDesigner = () => {
    const navigate = useNavigate();
    const [selectedModule, setSelectedModule] = useState('Sale');
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [settings, setSettings] = useState(DEFAULT_INVOICE_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null); // { title, message, onConfirm, type }
    const [activeTab, setActiveTab] = useState('content'); // content, layout, fonts, table
    const [fonts, setFonts] = useState([]);

    // Generate @font-face for all custom fonts
    const customFontsStyle = (
        <style>
            {Array.isArray(fonts) && fonts.map(font => {
                const name = font.split('.')[0];
                return `@font-face { font-family: '${name}'; src: url('/uploads/fonts/${font}'); }`;
            }).join('\n')}
        </style>
    );

    // Preview data
    const previewData = selectedModule === 'Report' ? {
        id: 'RPT-001',
        date: new Date().toISOString(),
        partner_name: 'Khách hàng Mẫu',
        partner: {
            name: 'Khách hàng Mẫu',
            phone: '0901 234 567',
            address: '123 Đường ABC, Quận XYZ, TP.HCM'
        },
        type: 'Report',
        details: Array.from({ length: 15 }, (_, i) => ({
            id: `ORD-00${i + 1}`,
            display_id: `DH-00${i + 1}`,
            date: new Date(Date.now() - i * 86400000).toISOString(),
            payment_method: i % 3 === 0 ? 'Debt' : 'Cash',
            total_amount: (Math.floor(Math.random() * 50) + 1) * 100000,
        })),
        total_amount: 5500000,
        amount_paid: 2000000,
        old_debt: 1000000,
        note: 'Báo cáo chi tiết công nợ'
    } : {
        id: '12345',
        date: new Date().toISOString(),
        partner_name: 'Khách hàng Mẫu',
        partner: {
            name: 'Khách hàng Mẫu',
            phone: '0901 234 567',
            address: '123 Đường ABC, Quận XYZ, TP.HCM'
        },
        details: Array.from({ length: 35 }, (_, i) => ({
            product_name: `Sản phẩm mẫu ${i + 1}${i === 2 ? ' có tên rất dài để kiểm tra việc xuống dòng trong bảng hóa đơn' : ''}`,
            secondary_unit: i % 2 === 0 ? 'Thùng' : 'Hộp',
            quantity: Math.floor(Math.random() * 20) + 1,
            price: (Math.floor(Math.random() * 50) + 1) * 10000,
            unit: i % 2 === 0 ? 'Chai' : 'Cái',
            multiplier: i % 2 === 0 ? 24 : 10
        })),
        total_amount: 1850000,
        cost_price: 80000,
        amount_paid: 1000000,
        old_debt: 250000,
        note: 'Ghi chú mẫu cho hóa đơn',
        type: selectedModule === 'Purchase' ? 'Purchase' : 'Sale'
    };

    useEffect(() => {
        fetchTemplates();
        fetchFonts();
    }, [selectedModule]);

    const fetchTemplates = async (targetId = null) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/print-templates?module=${selectedModule}`);
            const data = await res.json();

            if (Array.isArray(data)) {
                setTemplates(data);
                if (data.length > 0) {
                    let candidate = null;

                    // 1. Try explicit target (from save)
                    if (targetId) {
                        candidate = data.find(t => t.id === targetId);
                    }

                    // 2. Try localStorage (from previous session)
                    if (!candidate) {
                        const lastId = localStorage.getItem(`last_template_${selectedModule}`);
                        if (lastId) {
                            candidate = data.find(t => t.id === parseInt(lastId));
                        }
                    }

                    // 3. Fallback to Default or First
                    if (!candidate) {
                        candidate = data.find(t => t.is_default) || data[0];
                    }

                    if (candidate) {
                        selectTemplate(candidate);
                    } else {
                        // If no template found, clear selection and reset settings
                        setSelectedTemplate(null);
                        setSettings(DEFAULT_INVOICE_CONFIG);
                    }
                } else {
                    setSelectedTemplate(null);
                    setSettings(DEFAULT_INVOICE_CONFIG);
                }
            } else {
                console.warn("API returned non-array for templates:", data);
                setTemplates([]);
                setSelectedTemplate(null);
                setSettings(DEFAULT_INVOICE_CONFIG);
            }
        } catch (err) {
            console.error("Error fetching templates", err);
            setTemplates([]);
            setSelectedTemplate(null);
            setSettings(DEFAULT_INVOICE_CONFIG);
            setToast({ message: "Lỗi khi tải mẫu in!", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const fetchFonts = async () => {
        try {
            const res = await fetch('/api/fonts');
            const data = await res.json();
            if (Array.isArray(data)) {
                setFonts(data);
            } else {
                console.warn("API returned non-array for fonts:", data);
                setFonts([]);
            }
        } catch (err) {
            console.error("Error fetching fonts", err);
            setFonts([]);
            setToast({ message: "Lỗi khi tải font chữ!", type: "error" });
        }
    };

    const selectTemplate = (template) => {
        setSelectedTemplate(template);
        if (template?.id) {
            localStorage.setItem(`last_template_${selectedModule}`, template.id);
        }

        try {
            let config = template.config;
            if (typeof config === 'string') {
                try {
                    config = JSON.parse(config);
                } catch (e) {
                    console.error("Invalid JSON config", e);
                    config = {};
                }
            }
            // Merge with default settings to ensure all keys are present
            setSettings({ ...DEFAULT_INVOICE_CONFIG, ...(config || {}) });
        } catch (e) {
            console.error("Error setting template", e);
            setSettings({ ...DEFAULT_INVOICE_CONFIG });
            setToast({ message: "Lỗi khi tải cấu hình mẫu!", type: "error" });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const body = {
                name: selectedTemplate?.name || `Mẫu ${selectedModule} mới`,
                module: selectedModule,
                config: settings,
                is_default: selectedTemplate?.is_default || false
            };

            let res;
            if (selectedTemplate?.id) {
                res = await fetch(`/api/print-templates/${selectedTemplate.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            } else {
                res = await fetch('/api/print-templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            }

            if (res.ok) {
                const savedData = await res.json();

                // Manually update the list so we don't have to wait for fetch
                setTemplates(prev => {
                    const existingIdx = prev.findIndex(t => t.id === savedData.id);
                    if (existingIdx >= 0) {
                        const newArr = [...prev];
                        newArr[existingIdx] = savedData;
                        return newArr;
                    } else {
                        return [...prev, savedData];
                    }
                });

                // Select it directly.
                selectTemplate(savedData);

                setToast({ message: "Đã lưu thiết kế thành công!", type: "success" });
            } else {
                const errText = await res.text();
                console.error("Save failed with status:", res.status, errText);
                setToast({ message: `Lỗi khi lưu mẫu in (${res.status}): ${errText}`, type: "error" });
            }

        } catch (err) {
            console.error("Save error:", err);
            setToast({ message: "Đã xảy ra lỗi khi lưu: " + err.message, type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const updateAllTemplatesShopInfo = () => {
        setConfirm({
            title: "Đồng bộ thông tin shop",
            message: "Hành động này sẽ cập nhật Tên Shop, Địa chỉ, SĐT và STK ngân hàng từ Cài Đặt Hệ Thống cho TẤT CẢ các mẫu in (Bán hàng, Nhập hàng, Phiếu Chi...). Tiếp tục?",
            onConfirm: async () => {
                setSaving(true);
                try {
                    // 1. Lấy thông tin shop từ Cài Đặt Hệ Thống
                    const settingsRes = await fetch('/api/settings');
                    const globalSettings = await settingsRes.json();

                    if (!globalSettings.shop_name) {
                        setToast({ message: "Chưa có thông tin shop trong Cài đặt!", type: "info" });
                        setConfirm(null);
                        setSaving(false);
                        return;
                    }

                    // 2. Lấy toàn bộ danh sách mẫu in
                    const resAll = await fetch('/api/print-templates');
                    const allTemplates = await resAll.json();

                    // 3. Cập nhật từng mẫu
                    const updatePromises = allTemplates.map(async (template) => {
                        let currentConfig = template.config;
                        if (typeof currentConfig === 'string') {
                            try { currentConfig = JSON.parse(currentConfig); } catch (e) { currentConfig = {}; }
                        }

                        const updatedConfig = {
                            ...(currentConfig || {}),
                            shop_name: globalSettings.shop_name || '',
                            shop_address: globalSettings.shop_address || '',
                            shop_phone: globalSettings.shop_phone || '',
                            shop_bank: globalSettings.shop_bank || '',
                            shop_bank_account: globalSettings.shop_bank_account || '',
                            shop_bank_user: globalSettings.shop_bank_user || ''
                        };

                        return fetch(`/api/print-templates/${template.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                ...template,
                                config: updatedConfig
                            })
                        });
                    });

                    await Promise.all(updatePromises);

                    // 4. Reload mẫu đang chọn để hiển thị thông tin mới
                    if (selectedTemplate) {
                        const refreshedRes = await fetch(`/api/print-templates?module=${selectedModule}`);
                        const refreshedData = await refreshedRes.json();
                        setTemplates(refreshedData);
                        const current = refreshedData.find(t => t.id === selectedTemplate.id);
                        if (current) {
                            setSelectedTemplate(current);
                            let cfg = current.config;
                            if (typeof cfg === 'string') cfg = JSON.parse(cfg);
                            setSettings({ ...DEFAULT_INVOICE_CONFIG, ...cfg });
                        }
                    }

                    setToast({ message: "Đã đồng bộ thông tin shop thành công cho toàn bộ mẫu!", type: "success" });
                } catch (err) {
                    console.error("Error syncing shop info:", err);
                    setToast({ message: "Lỗi khi đồng bộ thông tin shop!", type: "error" });
                } finally {
                    setSaving(false);
                    setConfirm(null);
                }
            },
            type: "info"
        });
    };

    const handleCreateNew = () => {
        const name = prompt("Nhập tên mẫu mới:");
        if (name) {
            setSelectedTemplate({ name, is_default: false, config: DEFAULT_INVOICE_CONFIG });
            setSettings(DEFAULT_INVOICE_CONFIG);
            setToast({ message: `Đã tạo mẫu mới: "${name}". Hãy lưu lại!`, type: "info" });
        }
    };

    const handleDelete = () => {
        if (!selectedTemplate?.id) {
            setToast({ message: "Không có mẫu nào để xóa.", type: "warning" });
            return;
        }
        setConfirm({
            title: "Xác nhận xóa mẫu",
            message: `Bạn có chắc chắn muốn xóa mẫu "${selectedTemplate.name}"?`,
            onConfirm: async () => {
                setSaving(true);
                try {
                    const res = await fetch(`/api/print-templates/${selectedTemplate.id}`, { method: 'DELETE' });
                    if (res.ok) {
                        // Clear storage if we deleted the active one
                        if (localStorage.getItem(`last_template_${selectedModule}`) == selectedTemplate.id) {
                            localStorage.removeItem(`last_template_${selectedModule}`);
                        }
                        await fetchTemplates(); // Re-fetch to update list and select new default/first
                        setToast({ message: `Đã xóa mẫu "${selectedTemplate.name}" thành công!`, type: "success" });
                    } else {
                        const errText = await res.text();
                        setToast({ message: `Lỗi khi xóa mẫu (${res.status}): ${errText}`, type: "error" });
                    }
                } catch (err) {
                    console.error("Error deleting template", err);
                    setToast({ message: "Lỗi khi xóa mẫu!", type: "error" });
                } finally {
                    setSaving(false);
                    setConfirm(null);
                }
            },
            type: "danger"
        });
    };

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        if (key === 'ui_show_doraemon') {
            localStorage.setItem('ui_show_doraemon', value);
            // Trigger storage event for same-window detection
            window.dispatchEvent(new Event('storage'));
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSaving(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload-logo', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.url) {
                updateSetting('invoice_logo_url', data.url);
                setToast({ message: "Logo đã được tải lên thành công!", type: "success" });
            } else {
                setToast({ message: "Lỗi tải logo: Không nhận được URL.", type: "error" });
            }
        } catch (err) {
            console.error("Error uploading logo", err);
            setToast({ message: "Lỗi tải logo!", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleFontUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSaving(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/fonts', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.filename) {
                fetchFonts();
                updateSetting('invoice_custom_font_name', data.filename);
                setToast({ message: `Font "${data.filename}" đã được tải lên thành công!`, type: "success" });
            } else {
                setToast({ message: "Lỗi tải font: Không nhận được tên file.", type: "error" });
            }
        } catch (err) {
            console.error("Error uploading font", err);
            setToast({ message: "Lỗi tải font!", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex bg-[#fdfcfb] dark:bg-[#0f172a] min-h-screen">
            {customFontsStyle}
            {/* Sidebar Content Designer */}
            <div className="w-[420px] border-r-2 border-[#d4a574]/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-y-auto h-screen sticky top-0 custom-scrollbar shadow-[20px_0_40px_-15px_rgba(0,0,0,0.05)] z-20">
                <div className="p-8">
                    <div className="flex flex-col gap-6 mb-10">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black text-[#2d5016] dark:text-[#4a7c59] flex items-center gap-3 uppercase tracking-tighter">
                                <m.button
                                    whileHover={{ scale: 1.1, x: -3 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => navigate('/pos')}
                                    className="mr-1 p-2 bg-white dark:bg-slate-800 text-[#8b6f47] dark:text-[#d4a574] rounded-2xl shadow-md border-2 border-[#d4a574]/20 hover:border-[#2d5016] dark:hover:border-[#4a7c59] hover:text-[#2d5016] dark:hover:text-[#4a7c59] transition-all"
                                    title="Quay lại bán hàng"
                                >
                                    <ArrowLeft size={20} strokeWidth={3} />
                                </m.button>
                                <div className="p-2 bg-gradient-to-br from-[#2d5016] to-[#4a7c59] rounded-2xl text-white shadow-lg shadow-[#4a7c59]/20">
                                    <Sprout size={28} />
                                </div>
                                Thiết kế Bản in
                            </h2>
                            <button
                                onClick={handleSave}
                                disabled={saving || loading}
                                className="p-3 bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white rounded-[1.25rem] hover:shadow-2xl hover:shadow-[#4a7c59]/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-white/20"
                                title="Lưu thay đổi"
                            >
                                <Save size={24} />
                            </button>
                        </div>

                        <button
                            onClick={updateAllTemplatesShopInfo}
                            disabled={saving || loading}
                            className="w-full px-6 py-4 bg-[#d4a574]/10 dark:bg-[#d4a574]/5 text-[#8b6f47] dark:text-[#d4a574] rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#d4a574]/20 transition-all border-2 border-[#d4a574]/20 flex items-center justify-center gap-3"
                            title="Đồng bộ thông tin shop từ Cài đặt hệ thống cho TOÀN BỘ các mẫu"
                        >
                            <RefreshCw size={16} className={saving ? "animate-spin" : ""} />
                            Đồng bộ thông tin Trang trại
                        </button>
                    </div>

                    {/* Module Selection */}
                    <div className="flex bg-[#d4a574]/10 dark:bg-slate-800/40 p-1.5 rounded-[1.5rem] border-2 border-[#d4a574]/20 backdrop-blur-md mb-8">
                        {MODULES.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setSelectedModule(m.id)}
                                className={cn(
                                    "flex-1 py-3 px-2 rounded-[1rem] text-[10px] font-black tracking-widest uppercase transition-all duration-300",
                                    selectedModule === m.id
                                        ? "bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white shadow-xl"
                                        : "text-[#8b6f47] hover:bg-[#d4a574]/10"
                                )}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Template Picker */}
                    <div className="mb-10 p-6 bg-[#fdfcfb] dark:bg-slate-800/50 rounded-[2rem] border-2 border-[#d4a574]/20 shadow-inner">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8b6f47] mb-4 block ml-1 flex items-center gap-2">
                            <Wheat size={14} /> Mẫu thiết kế vụ mùa
                        </label>
                        <div className="flex gap-3">
                            <div className="relative flex-1 group">
                                <select
                                    className="w-full bg-white dark:bg-slate-800 border-2 border-[#d4a574]/10 rounded-2xl px-5 py-4 text-sm font-black appearance-none outline-none focus:border-[#4a7c59] transition-all dark:text-white shadow-sm"
                                    value={selectedTemplate?.id || ''}
                                    onChange={(e) => {
                                        const template = templates.find(t => t.id === parseInt(e.target.value));
                                        if (template) selectTemplate(template);
                                    }}
                                    disabled={loading}
                                >
                                    {Array.isArray(templates) && templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} {t.is_default ? '(Mặc định)' : ''}</option>
                                    ))}
                                    {!selectedTemplate?.id && selectedTemplate && (
                                        <option value="">{selectedTemplate.name}</option>
                                    )}
                                    {templates.length === 0 && !selectedTemplate && (
                                        <option value="">Chưa có mẫu nào</option>
                                    )}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8b6f47]">
                                    <ChevronDown size={18} />
                                </div>
                            </div>
                            <button
                                onClick={handleCreateNew}
                                disabled={loading}
                                className="p-4 bg-white dark:bg-slate-800 text-[#4a7c59] border-2 border-[#4a7c59]/20 rounded-2xl hover:bg-[#4a7c59] hover:text-white transition-all disabled:opacity-50 shadow-sm active:scale-95"
                                title="Thêm mẫu mới"
                            >
                                <Plus size={24} />
                            </button>
                        </div>
                        {selectedTemplate?.id && (
                            <button
                                onClick={handleDelete}
                                disabled={saving || loading}
                                className="mt-4 w-full py-3 bg-white dark:bg-slate-800 text-rose-400 border-2 border-rose-100 dark:border-rose-900/30 rounded-2xl hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Trash2 size={16} /> Xóa thiết kế này
                            </button>
                        )}
                    </div>

                    {/* Designer Tabs */}
                    <div className="flex bg-[#d4a574]/5 dark:bg-slate-800/40 p-1 rounded-[2rem] border-2 border-[#d4a574]/10 mb-8 sticky top-0 backdrop-blur-md z-30">
                        {[
                            { id: 'content', icon: FileText, label: 'NỘI DUNG' },
                            { id: 'layout', icon: Layout, label: 'BỐ CỤC' },
                            { id: 'fonts', icon: Type, label: 'FONT CHỮ' },
                            { id: 'table', icon: TableIcon, label: 'BẢNG' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex-1 flex flex-col items-center gap-1.5 py-4 transition-all relative rounded-[1.5rem]",
                                    activeTab === tab.id ? "bg-white dark:bg-slate-700 text-[#4a7c59] shadow-lg shadow-black/5" : "text-[#8b6f47]/60 hover:text-[#4a7c59]"
                                )}
                            >
                                <tab.icon size={22} className={activeTab === tab.id ? "scale-110 transition-transform" : ""} />
                                <span className="text-[9px] font-black tracking-widest">{tab.label}</span>
                                {activeTab === tab.id && <m.div layoutId="activeTabDesign" className="absolute inset-0 bg-white dark:bg-slate-700 rounded-[1.5rem] -z-10 shadow-sm border border-[#d4a574]/20" />}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="space-y-6 pb-20">
                        {activeTab === 'content' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                <DesignerSection title="Thông tin Cửa hàng">
                                    <DesignerInput label="Tên cửa hàng" value={settings.shop_name} onChange={(v) => updateSetting('shop_name', v)} />
                                    <DesignerInput label="Địa chỉ" value={settings.shop_address} onChange={(v) => updateSetting('shop_address', v)} />
                                    <DesignerInput label="Số điện thoại" value={settings.shop_phone} onChange={(v) => updateSetting('shop_phone', v)} />

                                    <div className="grid grid-cols-2 gap-3">
                                        <DesignerInput label="Ngân hàng" value={settings.shop_bank} onChange={(v) => updateSetting('shop_bank', v)} placeholder="Ví dụ: MB Bank" />
                                        <DesignerInput label="Số tài khoản" value={settings.shop_bank_account} onChange={(v) => updateSetting('shop_bank_account', v)} placeholder="0123456789" />
                                    </div>
                                    <DesignerInput label="Chủ tài khoản" value={settings.shop_bank_user} onChange={(v) => updateSetting('shop_bank_user', v)} placeholder="NGUYEN VAN A" />

                                    <div className="border-t dark:border-slate-800 my-4 pt-4 space-y-3">
                                        <Toggle label="Hiện Logo" checked={settings.invoice_show_logo === 'true'} onChange={(v) => updateSetting('invoice_show_logo', v ? 'true' : 'false')} />
                                        {settings.invoice_show_logo === 'true' && (
                                            <div className="mt-2 ml-6">
                                                <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                <label htmlFor="logo-upload" className="flex items-center gap-2 text-xs font-bold text-primary cursor-pointer hover:underline">
                                                    <Upload size={14} /> Tải logo lên
                                                </label>
                                            </div>
                                        )}
                                        <Toggle label="Hiện Tên cửa hàng" checked={settings.invoice_show_shop_name === 'true'} onChange={(v) => updateSetting('invoice_show_shop_name', v ? 'true' : 'false')} />
                                        <Toggle label="Hiện Địa chỉ" checked={settings.invoice_show_address === 'true'} onChange={(v) => updateSetting('invoice_show_address', v ? 'true' : 'false')} />
                                        <Toggle label="Hiện Số điện thoại" checked={settings.invoice_show_phone === 'true'} onChange={(v) => updateSetting('invoice_show_phone', v ? 'true' : 'false')} />
                                        <Toggle label="Hiện STK Ngân hàng" checked={settings.invoice_show_bank_info === 'true'} onChange={(v) => updateSetting('invoice_show_bank_info', v ? 'true' : 'false')} />
                                    </div>
                                </DesignerSection>

                                <DesignerSection title="Viền & Nền Tiêu đề">
                                    <div className="p-3 bg-primary/5 rounded-2xl mb-4 border border-primary/10">
                                        <p className="text-[10px] text-primary/60 font-medium leading-relaxed italic">
                                            💡 Bạn có thể click trực tiếp vào <strong className="text-primary underline">Tiêu đề (HÓA ĐƠN...)</strong> trên bản xem trước để bật/tắt nhanh hiệu ứng này.
                                        </p>
                                    </div>
                                    <Toggle label="Sử dụng viền (Badge)" checked={settings.invoice_title_badge === 'true'} onChange={(v) => updateSetting('invoice_title_badge', v ? 'true' : 'false')} />
                                    {settings.invoice_title_badge === 'true' && (
                                        <div className="mt-4 space-y-4 pt-4 border-t dark:border-slate-800 animate-in slide-in-from-top-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <ColorPicker label="Màu nền" value={settings.invoice_title_badge_bg} onChange={v => updateSetting('invoice_title_badge_bg', v)} />
                                                <ColorPicker label="Màu viền" value={settings.invoice_title_badge_border} onChange={v => updateSetting('invoice_title_badge_border', v)} />
                                            </div>
                                            <ColorPicker label="Màu chữ" value={settings.invoice_title_badge_text_color} onChange={v => updateSetting('invoice_title_badge_text_color', v)} />
                                        </div>
                                    )}
                                </DesignerSection>

                                <DesignerSection title="Thông tin hóa đơn">
                                    <Toggle label="Mã hóa đơn" checked={settings.invoice_show_id === 'true'} onChange={(v) => updateSetting('invoice_show_id', v ? 'true' : 'false')} />
                                    <Toggle label="Ngày giờ in" checked={settings.invoice_show_date === 'true'} onChange={(v) => updateSetting('invoice_show_date', v ? 'true' : 'false')} />
                                    <Toggle label="Thông tin đối tác" checked={settings.invoice_show_customer_info === 'true'} onChange={(v) => updateSetting('invoice_show_customer_info', v ? 'true' : 'false')} />
                                </DesignerSection>

                                <DesignerSection title="Chân trang & Ghi chú">
                                    <Toggle label="Hiện 'Cảm ơn quý khách'" checked={settings.invoice_show_thank_you === 'true'} onChange={(v) => updateSetting('invoice_show_thank_you', v ? 'true' : 'false')} />
                                    {settings.invoice_show_thank_you === 'true' && (
                                        <DesignerInput label="Nội dung lời cảm ơn" value={settings.invoice_thank_you_message} onChange={(v) => updateSetting('invoice_thank_you_message', v)} />
                                    )}
                                    <div className="border-t dark:border-slate-800 my-4 pt-4 space-y-3">
                                        <Toggle label="Hiện Tổng tiền" checked={settings.invoice_show_total_amount === 'true'} onChange={(v) => updateSetting('invoice_show_total_amount', v ? 'true' : 'false')} />
                                        <Toggle label="Hiện Ghi chú" checked={settings.invoice_show_notes === 'true'} onChange={(v) => updateSetting('invoice_show_notes', v ? 'true' : 'false')} />
                                        <Toggle label="Hiện Chữ ký" checked={settings.invoice_show_signatures === 'true'} onChange={(v) => updateSetting('invoice_show_signatures', v ? 'true' : 'false')} />
                                    </div>
                                </DesignerSection>
                            </div>
                        )}

                        {activeTab === 'layout' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                <DesignerSection title="Khổ giấy">
                                    <div className="grid grid-cols-1 gap-2">
                                        {PAPER_SIZES.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => updateSetting('paper_size', p.id)}
                                                className={cn(
                                                    "px-4 py-3 rounded-xl text-left font-bold text-sm border flex items-center justify-between transition-all",
                                                    settings.paper_size === p.id
                                                        ? "bg-primary/5 text-primary border-primary"
                                                        : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-primary/50"
                                                )}
                                            >
                                                {p.label}
                                                {settings.paper_size === p.id && <CheckCircle2 size={16} />}
                                            </button>
                                        ))}
                                    </div>
                                </DesignerSection>

                                <DesignerSection title="Định dạng">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Hướng in</label>
                                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                                <button
                                                    onClick={() => updateSetting('invoice_orientation', 'portrait')}
                                                    className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", settings.invoice_orientation === 'portrait' ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-400")}
                                                >Dọc</button>
                                                <button
                                                    onClick={() => updateSetting('invoice_orientation', 'landscape')}
                                                    className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", settings.invoice_orientation === 'landscape' ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-400")}
                                                >Ngang</button>
                                            </div>
                                        </div>
                                        <DesignerInput label="Cách dòng" value={settings.invoice_line_spacing} onChange={(v) => updateSetting('invoice_line_spacing', v)} type="number" step="0.1" />
                                    </div>
                                </DesignerSection>

                                <DesignerSection title="Cách lề">
                                    <Toggle
                                        label="Dùng lề mặc định máy in"
                                        checked={settings.invoice_use_default_margins === 'true'}
                                        onChange={(v) => updateSetting('invoice_use_default_margins', v ? 'true' : 'false')}
                                    />
                                    <p className="text-[10px] text-slate-400 italic mb-2">Tắt để tùy chỉnh lề thủ công (mm)</p>
                                    <div className={cn("grid grid-cols-2 gap-4 transition-all", settings.invoice_use_default_margins === 'true' && "opacity-30 pointer-events-none")}>
                                        <DesignerInput label="Trên" value={settings.invoice_margin_top} onChange={(v) => updateSetting('invoice_margin_top', v)} type="number" />
                                        <DesignerInput label="Dưới" value={settings.invoice_margin_bottom} onChange={(v) => updateSetting('invoice_margin_bottom', v)} type="number" />
                                        <DesignerInput label="Trái" value={settings.invoice_margin_left} onChange={(v) => updateSetting('invoice_margin_left', v)} type="number" />
                                        <DesignerInput label="Phải" value={settings.invoice_margin_right} onChange={(v) => updateSetting('invoice_margin_right', v)} type="number" />
                                    </div>
                                </DesignerSection>
                            </div>
                        )}

                        {activeTab === 'fonts' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                <DesignerSection title="Font mặc định">
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm dark:text-white"
                                        value={settings.invoice_font_family}
                                        onChange={(e) => updateSetting('invoice_font_family', e.target.value)}
                                    >
                                        <option value="'Be Vietnam Pro', sans-serif">Be Vietnam Pro (Google Font)</option>
                                        <option value="Inter, sans-serif">Inter (Mặc định)</option>
                                        <option value="'Roboto', sans-serif">Roboto</option>
                                        <option value="'Courier New', Courier, monospace">Courier New (Máy in kim)</option>
                                        <option value="Arial, sans-serif">Arial</option>
                                        <option value="'Times New Roman', Times, serif">Times New Roman</option>
                                        {Array.isArray(fonts) && fonts.map(font => (
                                            <option key={font} value={`'${font.split('.')[0]}', sans-serif`}>{font}</option>
                                        ))}
                                    </select>
                                    <div className="mt-4">
                                        <input type="file" id="font-upload" className="hidden" accept=".ttf,.otf" onChange={handleFontUpload} />
                                        <label htmlFor="font-upload" className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-primary hover:border-primary transition-all cursor-pointer text-xs font-bold">
                                            <Upload size={16} /> Tải font tùy chỉnh (.ttf, .otf)
                                        </label>
                                    </div>
                                </DesignerSection>

                                <DesignerSection title="Kích cỡ chữ (px)">
                                    <div className="grid grid-cols-2 gap-4">
                                        <DesignerInput label="Tiêu đề" value={settings.invoice_title_size} onChange={(v) => updateSetting('invoice_title_size', v)} type="number" />
                                        <DesignerInput label="Tên cửa hàng" value={settings.invoice_store_name_size} onChange={(v) => updateSetting('invoice_store_name_size', v)} type="number" />
                                        <DesignerInput label="Heder bảng" value={settings.invoice_table_header_size} onChange={(v) => updateSetting('invoice_table_header_size', v)} type="number" />
                                        <DesignerInput label="Nội dung bảng" value={settings.invoice_table_content_size} onChange={(v) => updateSetting('invoice_table_content_size', v)} type="number" />
                                        <DesignerInput label="Tổng tiền" value={settings.invoice_total_section_size} onChange={(v) => updateSetting('invoice_total_section_size', v)} type="number" />
                                        <DesignerInput label="Còn lại (nổi bật)" value={settings.invoice_total_balance_size} onChange={(v) => updateSetting('invoice_total_balance_size', v)} type="number" />
                                    </div>
                                </DesignerSection>
                            </div>
                        )}

                        {activeTab === 'table' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                <DesignerSection title="Cột hiển thị">
                                    <Toggle label="STT" checked={settings.invoice_show_col_stt === 'true'} onChange={(v) => updateSetting('invoice_show_col_stt', v ? 'true' : 'false')} />

                                    {selectedModule === 'Report' ? (
                                        <>
                                            <Toggle label="Mã Đơn" checked={settings.invoice_show_col_code === 'true'} onChange={(v) => updateSetting('invoice_show_col_code', v ? 'true' : 'false')} />
                                            <Toggle label="Ngày" checked={settings.invoice_show_col_date === 'true'} onChange={(v) => updateSetting('invoice_show_col_date', v ? 'true' : 'false')} />
                                            <Toggle label="PTTT" checked={settings.invoice_show_col_method === 'true'} onChange={(v) => updateSetting('invoice_show_col_method', v ? 'true' : 'false')} />
                                        </>
                                    ) : (
                                        <>
                                            <Toggle label="Tên sản phẩm" checked={settings.invoice_show_col_name === 'true'} onChange={(v) => updateSetting('invoice_show_col_name', v ? 'true' : 'false')} />
                                            <Toggle label="Đơn vị tính (ĐVT)" checked={settings.invoice_show_col_unit === 'true'} onChange={(v) => updateSetting('invoice_show_col_unit', v ? 'true' : 'false')} />
                                            <Toggle label="Số lượng" checked={settings.invoice_show_col_qty === 'true'} onChange={(v) => updateSetting('invoice_show_col_qty', v ? 'true' : 'false')} />
                                            <Toggle label="Đơn giá" checked={settings.invoice_show_col_price === 'true'} onChange={(v) => updateSetting('invoice_show_col_price', v ? 'true' : 'false')} />
                                        </>
                                    )}

                                    <Toggle label="Thành tiền" checked={settings.invoice_show_col_total === 'true'} onChange={(v) => updateSetting('invoice_show_col_total', v ? 'true' : 'false')} />
                                </DesignerSection>

                                <DesignerSection title="Màu Sắc & Thương Hiệu">
                                    <div className="grid grid-cols-2 gap-4">
                                        <ColorPicker label="Thông tin shop" value={settings.invoice_color_store_info} onChange={v => updateSetting('invoice_color_store_info', v)} />
                                        <ColorPicker label="Tiêu đề mẫu in" value={settings.invoice_color_title} onChange={v => updateSetting('invoice_color_title', v)} />
                                        <ColorPicker label="Thông tin khách" value={settings.invoice_color_customer_info} onChange={v => updateSetting('invoice_color_customer_info', v)} />
                                        <ColorPicker label="Tiêu đề bảng" value={settings.invoice_color_table_header} onChange={v => updateSetting('invoice_color_table_header', v)} />
                                        <ColorPicker label="Nội dung hàng" value={settings.invoice_color_table_body} onChange={v => updateSetting('invoice_color_table_body', v)} />
                                        <ColorPicker label="Ghi chú / Khác" value={settings.invoice_color_notes} onChange={v => updateSetting('invoice_color_notes', v)} />
                                    </div>
                                </DesignerSection>

                                <DesignerSection title="Kiểu dáng Bảng">
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Độ dày viền</label>
                                            <select
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm dark:text-white outline-none"
                                                value={settings.invoice_table_border_thickness}
                                                onChange={(e) => updateSetting('invoice_table_border_thickness', e.target.value)}
                                            >
                                                <option value="thin">Mỏng (1px)</option>
                                                <option value="medium">Vừa (2px)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Kiểu nét</label>
                                            <select
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm dark:text-white outline-none"
                                                value={settings.invoice_table_border_style}
                                                onChange={(e) => updateSetting('invoice_table_border_style', e.target.value)}
                                            >
                                                <option value="solid">Nét liền</option>
                                                <option value="dashed">Nét đứt</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Toggle label="Viền toàn bảng" checked={settings.invoice_table_border === 'true'} onChange={(v) => updateSetting('invoice_table_border', v ? 'true' : 'false')} />
                                        <Toggle label="Viền dòng" checked={settings.invoice_table_border_rows === 'true'} onChange={(v) => updateSetting('invoice_table_border_rows', v ? 'true' : 'false')} />
                                        <Toggle label="Viền cột" checked={settings.invoice_table_border_cols === 'true'} onChange={(v) => updateSetting('invoice_table_border_cols', v ? 'true' : 'false')} />

                                        <div className="border-t dark:border-slate-800 pt-3 mt-3">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-[10px] font-black text-primary/60 uppercase tracking-widest block">Viền Header Bảng</label>
                                                <Toggle label="Bo tròn (Badge)" checked={settings.invoice_table_header_is_badge === 'true'} onChange={(v) => updateSetting('invoice_table_header_is_badge', v ? 'true' : 'false')} />
                                            </div>

                                            {settings.invoice_table_header_is_badge === 'true' ? (
                                                <div className="mt-3 space-y-4 pl-4 border-l-2 border-primary/20 animate-in slide-in-from-left-2">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <ColorPicker label="Màu nền" value={settings.invoice_table_header_badge_bg} onChange={v => updateSetting('invoice_table_header_badge_bg', v)} />
                                                        <ColorPicker label="Màu viền" value={settings.invoice_table_header_badge_border} onChange={v => updateSetting('invoice_table_header_badge_border', v)} />
                                                    </div>
                                                    <ColorPicker label="Màu chữ" value={settings.invoice_table_header_badge_text_color} onChange={v => updateSetting('invoice_table_header_badge_text_color', v)} />
                                                </div>
                                            ) : (
                                                <>
                                                    <Toggle label="Sử dụng viền Header riêng" checked={settings.invoice_table_header_border === 'true'} onChange={(v) => updateSetting('invoice_table_header_border', v ? 'true' : 'false')} />
                                                    {settings.invoice_table_header_border === 'true' && (
                                                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-primary/20 animate-in slide-in-from-left-2">
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <ColorPicker label="Màu viền" value={settings.invoice_table_header_border_color} onChange={v => updateSetting('invoice_table_header_border_color', v)} />
                                                                <div className="space-y-1.5">
                                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Độ dày (px)</label>
                                                                    <input
                                                                        type="number" min="1" max="10"
                                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm dark:text-white outline-none"
                                                                        value={settings.invoice_table_header_border_width}
                                                                        onChange={(e) => updateSetting('invoice_table_header_border_width', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Toggle label="Nền tiêu đề" checked={settings.invoice_table_header_bg_enabled === 'true'} onChange={(v) => updateSetting('invoice_table_header_bg_enabled', v ? 'true' : 'false')} />
                                                {settings.invoice_table_header_bg_enabled === 'true' && (
                                                    <ColorPicker label="Màu nền tiêu đề" value={settings.invoice_table_header_bg_color} onChange={v => updateSetting('invoice_table_header_bg_color', v)} />
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Toggle label="Kẻ Zebra" checked={settings.invoice_table_zebra_stripe === 'true'} onChange={(v) => updateSetting('invoice_table_zebra_stripe', v ? 'true' : 'false')} />
                                                {settings.invoice_table_zebra_stripe === 'true' && (
                                                    <ColorPicker label="Màu Zebra" value={settings.invoice_table_zebra_color} onChange={v => updateSetting('invoice_table_zebra_color', v)} />
                                                )}
                                            </div>
                                        </div>
                                        <div className="border-t dark:border-slate-700 my-2 pt-2 space-y-3">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Quy cách quy đổi (Secondary Qty)</label>
                                            <Toggle label="Cột Số lượng quy đổi" checked={settings.invoice_show_secondary_qty === 'true'} onChange={(v) => updateSetting('invoice_show_secondary_qty', v ? 'true' : 'false')} />
                                            {settings.invoice_show_secondary_qty === 'true' && (
                                                <div className="pl-4 space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-400">Độ rộng cột quy đổi (px)</label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="range" min="40" max="250" step="1"
                                                            value={settings.invoice_col_secondary_qty_width}
                                                            onChange={(e) => updateSetting('invoice_col_secondary_qty_width', e.target.value)}
                                                            className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                        />
                                                        <span className="text-xs font-mono w-8">{settings.invoice_col_secondary_qty_width}</span>
                                                    </div>
                                                </div>
                                            )}
                                            <Toggle label="Dòng Tổng cộng quy đổi" checked={settings.invoice_show_total_secondary_qty === 'true'} onChange={(v) => updateSetting('invoice_show_total_secondary_qty', v ? 'true' : 'false')} />
                                            {(settings.invoice_show_total_items === 'true' || settings.invoice_show_total_qty === 'true' || settings.invoice_show_total_secondary_qty === 'true') && (
                                                <div className="pl-4 space-y-2 border-t dark:border-slate-700 pt-2 pb-1">
                                                    <label className="text-[10px] font-bold text-slate-400">Cỡ chữ dòng Tổng (px)</label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="range" min="8" max="24" step="1"
                                                            value={settings.invoice_total_summary_font_size}
                                                            onChange={(e) => updateSetting('invoice_total_summary_font_size', e.target.value)}
                                                            className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                        />
                                                        <span className="text-xs font-mono w-8">{settings.invoice_total_summary_font_size}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </DesignerSection>

                                <DesignerSection title="Tổng hợp (Chân bảng)">
                                    <Toggle label="Tổng số mặt hàng (dòng)" checked={settings.invoice_show_total_items === 'true'} onChange={(v) => updateSetting('invoice_show_total_items', v ? 'true' : 'false')} />
                                    <Toggle label="Tổng số lượng" checked={settings.invoice_show_total_qty === 'true'} onChange={(v) => updateSetting('invoice_show_total_qty', v ? 'true' : 'false')} />
                                </DesignerSection>

                                {(selectedModule === 'Sale' || selectedModule === 'Purchase' || selectedModule === 'Report') && (
                                    <DesignerSection title={`Phần Tổng cộng (${selectedModule === 'Sale' ? 'Bán hàng' : selectedModule === 'Purchase' ? 'Nhập hàng' : 'Báo cáo'})`}>
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <ColorPicker label="Màu Chữ Nhãn" value={settings.invoice_color_total_label} onChange={v => updateSetting('invoice_color_total_label', v)} />
                                            <ColorPicker label="Màu Chữ Số" value={settings.invoice_color_total_value} onChange={v => updateSetting('invoice_color_total_value', v)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Cỡ chữ (px)</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm dark:text-white outline-none"
                                                    value={settings.invoice_total_line_size}
                                                    onChange={(e) => updateSetting('invoice_total_line_size', e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-2 items-end pb-1">
                                                <button
                                                    onClick={() => updateSetting('invoice_total_line_bold', settings.invoice_total_line_bold === 'true' ? 'false' : 'true')}
                                                    className={cn("p-2 rounded-lg border transition-all", settings.invoice_total_line_bold === 'true' ? "bg-primary/10 border-primary text-primary" : "border-slate-200 text-slate-400")}
                                                ><Bold size={16} /></button>
                                                <button
                                                    onClick={() => updateSetting('invoice_total_line_italic', settings.invoice_total_line_italic === 'true' ? 'false' : 'true')}
                                                    className={cn("p-2 rounded-lg border transition-all", settings.invoice_total_line_italic === 'true' ? "bg-primary/10 border-primary text-primary" : "border-slate-200 text-slate-400")}
                                                ><Italic size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Lề trên (px)</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm dark:text-white outline-none"
                                                    value={settings.invoice_total_line_margin_top}
                                                    onChange={(e) => updateSetting('invoice_total_line_margin_top', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Lề dưới (px)</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm dark:text-white outline-none"
                                                    value={settings.invoice_total_line_margin_bottom}
                                                    onChange={(e) => updateSetting('invoice_total_line_margin_bottom', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <Toggle label="Nợ cũ" checked={settings.invoice_show_old_debt === 'true'} onChange={(v) => updateSetting('invoice_show_old_debt', v ? 'true' : 'false')} />
                                        <Toggle label="Thanh toán" checked={settings.invoice_show_paid === 'true'} onChange={(v) => updateSetting('invoice_show_paid', v ? 'true' : 'false')} />
                                        <Toggle label="Còn lại" checked={settings.invoice_show_balance === 'true'} onChange={(v) => updateSetting('invoice_show_balance', v ? 'true' : 'false')} />
                                    </DesignerSection>
                                )}


                                <DesignerSection title="Độ rộng cột (px)">
                                    <div className="grid grid-cols-2 gap-4">
                                        <DesignerInput label="STT" value={settings.invoice_col_stt} onChange={(v) => updateSetting('invoice_col_stt', v)} type="number" />

                                        {selectedModule === 'Report' ? (
                                            <>
                                                <DesignerInput label="Mã Đơn" value={settings.invoice_col_code} onChange={(v) => updateSetting('invoice_col_code', v)} type="number" />
                                                <DesignerInput label="Ngày" value={settings.invoice_col_date} onChange={(v) => updateSetting('invoice_col_date', v)} type="number" />
                                                <DesignerInput label="PTTT" value={settings.invoice_col_method} onChange={(v) => updateSetting('invoice_col_method', v)} type="number" />
                                            </>
                                        ) : (
                                            <>
                                                <DesignerInput label="Tên sản phẩm" value={settings.invoice_col_name} onChange={(v) => updateSetting('invoice_col_name', v)} type="number" />
                                                <DesignerInput label="Đơn vị (ĐVT)" value={settings.invoice_col_unit} onChange={(v) => updateSetting('invoice_col_unit', v)} type="number" />
                                                <DesignerInput label="Số lượng" value={settings.invoice_col_qty} onChange={(v) => updateSetting('invoice_col_qty', v)} type="number" />
                                                <DesignerInput label="Đơn giá" value={settings.invoice_col_price} onChange={(v) => updateSetting('invoice_col_price', v)} type="number" />
                                            </>
                                        )}

                                        <DesignerInput label="Thành tiền" value={settings.invoice_col_total} onChange={(v) => updateSetting('invoice_col_total', v)} type="number" />
                                    </div>
                                </DesignerSection>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 flex flex-col p-12 overflow-y-auto relative">
                <div className="absolute inset-0 bg-[radial-gradient(#d4a574_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:40px_40px] opacity-[0.15] -z-10" />

                <div className="max-w-[1100px] mx-auto w-full flex flex-col items-center">
                    <div className="w-full flex items-center justify-between mb-12">
                        <div>
                            <div className="flex items-center gap-3 text-[#4a7c59] mb-2 font-black uppercase text-xs tracking-[0.4em]">
                                <Monitor size={16} /> Phòng LAB Thiết kế
                            </div>
                            <h3 className="text-4xl font-black text-slate-800 dark:text-emerald-50 uppercase tracking-tighter">Xem trước Thời gian thực</h3>
                        </div>
                        <div className="flex bg-[#d4a574]/10 dark:bg-slate-800/60 p-1.5 rounded-[1.75rem] border-2 border-[#d4a574]/20 backdrop-blur-md shadow-xl">
                            <button className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#2d5016] to-[#4a7c59] text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest shadow-xl">
                                <Monitor size={18} /> Phóng đại
                            </button>
                            <button className="flex items-center gap-3 px-6 py-3 hover:bg-[#d4a574]/10 text-[#8b6f47] rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all">
                                <Printer size={18} /> Máy in thực tế
                            </button>
                        </div>
                    </div>

                    <div className="w-full bg-white dark:bg-slate-900 border-2 border-[#d4a574]/10 rounded-[4rem] p-16 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] overflow-auto custom-scrollbar flex justify-center perspective-[1000px]">
                        <m.div
                            initial={{ rotateX: 5, y: 40, opacity: 0 }}
                            animate={{ rotateX: 0, y: 0, opacity: 1 }}
                            className="origin-top"
                        >
                            <div className="bg-white shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] ring-1 ring-black/5">
                                <PrintTemplate data={previewData} settings={settings} type={selectedModule} isPreview={true} onUpdateSetting={updateSetting} />
                            </div>
                        </m.div>
                    </div>

                    <div className="mt-12 flex items-center gap-8 text-[#8b6f47]/40">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#4a7c59]/40" /> <span className="text-[10px] font-black uppercase tracking-widest">ĐANG HOẠT ĐỘNG</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#d4a574]/40" /> <span className="text-[10px] font-black uppercase tracking-widest">TỰ ĐỘNG ĐẾM DÒNG</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300" /> <span className="text-[10px] font-black uppercase tracking-widest">HỖ TRỢ MỌI KHỔ GIẤY</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}



// Sub-components
function DesignerSection({ title, children }) {
    return (
        <div className="space-y-4 mb-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8b6f47] mb-3 ml-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4a7c59]" />
                {title}
            </h4>
            <div className="bg-[#fdfcfb] dark:bg-slate-800/30 p-8 rounded-[2.5rem] border-2 border-[#d4a574]/10 space-y-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-[0.03] pointer-events-none p-4">
                    <Leaf size={64} />
                </div>
                {children}
            </div>
        </div>
    );
}

function DesignerInput({ label, value, onChange, type = "text", ...props }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-[#8b6f47] dark:text-[#d4a574]/60 uppercase tracking-widest ml-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border-2 border-[#d4a574]/10 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-black focus:border-[#4a7c59] dark:focus:border-[#4a7c59] transition-all dark:text-white outline-none ring-offset-2 ring-offset-white dark:ring-offset-slate-900 focus:ring-2 ring-[#4a7c59]/20"
                {...props}
            />
        </div>
    );
}

function Toggle({ label, checked, onChange }) {
    return (
        <div
            className="flex items-center justify-between cursor-pointer group p-3 hover:bg-[#d4a574]/5 rounded-2xl transition-all"
            onClick={() => onChange(!checked)}
        >
            <span className="text-sm font-black text-[#8b6f47] dark:text-emerald-50 group-hover:text-[#4a7c59] transition-colors uppercase tracking-tight">{label}</span>
            <button
                className={cn(
                    "relative w-12 h-6 rounded-full transition-all duration-300 outline-none",
                    checked ? "bg-gradient-to-r from-[#2d5016] to-[#4a7c59]" : "bg-slate-200 dark:bg-slate-700"
                )}
            >
                <div className={cn(
                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md",
                    checked ? "translate-x-6" : "translate-x-0"
                )} />
            </button>
        </div>
    );
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-10 bg-red-50 text-red-800 rounded-xl border border-red-200 m-4">
                    <h3 className="text-xl font-bold mb-4">Invoice Designer Error</h3>
                    <p className="font-mono text-sm whitespace-pre-wrap bg-white p-4 rounded border border-red-100">{this.state.error?.toString()}</p>
                    <details className="mt-4">
                        <summary className="cursor-pointer font-bold mb-2">Stack Trace</summary>
                        <pre className="text-[10px] overflow-auto max-h-60 bg-slate-900 text-white p-4 rounded">{this.state.errorInfo?.componentStack}</pre>
                    </details>
                    <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Reload Page</button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default function InvoiceDesignerWrapper() {
    return (
        <ErrorBoundary>
            <InvoiceDesigner />
        </ErrorBoundary>
    );
}
