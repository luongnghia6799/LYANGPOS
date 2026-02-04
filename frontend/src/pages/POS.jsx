import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { m, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, Trash2, Save, X, Printer, User, Phone, FileText, ShoppingCart, Pause, RotateCcw, Play, AlertTriangle, Activity, History, Sprout, Wheat, Droplets, Coins, Leaf, Eye, Keyboard, ChevronLeft, ChevronRight, ArrowLeft, Clock, MapPin, Loader2 } from 'lucide-react';
import { formatCurrency, formatNumber, formatDebt } from '../lib/utils';
import { cn } from '../lib/utils';
import { useLocation } from 'react-router-dom';
import { DEFAULT_SETTINGS } from '../lib/settings';
import PrintTemplate from '../components/PrintTemplate';
import Toast from '../components/Toast';
import ProductEditModal from '../components/ProductEditModal';
import PartnerEditModal from '../components/PartnerEditModal';
import POSHistoryPanel from '../components/POSHistoryPanel';
import LoadingOverlay from '../components/LoadingOverlay';
import Portal from '../components/Portal';

import { useProductData, usePartnerData } from '../queries/useProductData';
import { useQueryClient } from '@tanstack/react-query';

export default function POS() {
    const { data: productsData, isLoading: isLoadingProducts } = useProductData();
    const { data: partnersData, isLoading: isLoadingPartners } = usePartnerData();
    const queryClient = useQueryClient();

    // Fallback to empty array if data not yet loaded
    const products = productsData || [];
    const partners = partnersData || [];

    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState([]);

    // Removed old fetch useEffects
    // Use the fetched data directly


    const [selectedPartner, setSelectedPartner] = useState(null);
    const [partnerSearch, setPartnerSearch] = useState('');
    const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);
    const [note, setNote] = useState('');
    const [amountPaid, setAmountPaid] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState(() => ((localStorage.getItem('unified_pos_mode') || 'Retail') === 'Wholesale' ? 'Pending' : 'Cash'));
    const [lastOrder, setLastOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [editOrderId, setEditOrderId] = useState(null);
    const [editingOriginalOrder, setEditingOriginalOrder] = useState(null);
    const [pendingPartnerId, setPendingPartnerId] = useState(null);
    const [historyStep, setHistoryStep] = useState(0); // 0 = new invoice, 1 = last, 2 = 2nd last...
    const location = useLocation();

    const [heldInvoices, setHeldInvoices] = useState(() => {
        const saved = localStorage.getItem('held_invoices');
        return saved ? JSON.parse(saved) : [];
    });
    const [isHeldSidebarOpen, setIsHeldSidebarOpen] = useState(false);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [customPrices, setCustomPrices] = useState({}); // {product_id: price}
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [showQuickAddPartner, setShowQuickAddPartner] = useState(false);
    const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
    const [quickAddName, setQuickAddName] = useState('');
    const [toast, setToast] = useState(null);
    const [posMode, setPosMode] = useState(() => localStorage.getItem('unified_pos_mode') || 'Retail');
    const [workingItem, setWorkingItem] = useState({ product: null, quantity: 1, price: 0, secondary_qty: 0, name: '' });
    const [rowSearchIdx, setRowSearchIdx] = useState(null);
    const [rowSearchTerm, setRowSearchTerm] = useState('');
    const [rowActiveIndex, setRowActiveIndex] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const quantityRefs = useRef({});
    const searchInputRef = useRef(null);
    const workingQtyRef = useRef(null);
    const workingPriceRef = useRef(null);
    const partnerInputRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F3') {
                e.preventDefault();
                partnerInputRef.current?.focus();
                partnerInputRef.current?.select();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    const workingSecQtyRef = useRef(null);
    const partnerDropdownRef = useRef(null);
    const productDropdownRef = useRef(null);
    const rowSearchDropdownRef = useRef(null);

    const [isPartnerEditModalOpen, setIsPartnerEditModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState(null);

    const [isLoaded, setIsLoaded] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [historyLoading, setHistoryLoading] = useState(false);
    const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const currentWorkingTotal = useMemo(() => workingItem.product ? (workingItem.price * workingItem.quantity) : 0, [workingItem.product, workingItem.price, workingItem.quantity]);
    const totalAmount = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + currentWorkingTotal, [cart, currentWorkingTotal]);
    const totalItems = useMemo(() => cart.length + (workingItem.product ? 1 : 0), [cart, workingItem.product]);
    const totalQty = useMemo(() => cart.reduce((sum, item) => sum + (item.quantity || 0), 0) + (workingItem.quantity || 0), [cart, workingItem.quantity]);
    const totalSecondaryQty = useMemo(() => cart.reduce((sum, item) => sum + (item.secondary_qty || 0), 0) + (workingItem.secondary_qty || 0), [cart, workingItem.secondary_qty]);

    const oldDebt = useMemo(() => {
        if (!selectedPartner) return 0;
        let balance = selectedPartner.debt_balance;

        // If we are editing an order, the current balance already includes the impact of the original version of this order.
        // We subtract that impact to show the "actual" old debt (balance before this order was made/edited).
        if (editOrderId && editingOriginalOrder && selectedPartner.id === editingOriginalOrder.partner_id) {
            if (editingOriginalOrder.payment_method === 'Debt') {
                const originalImpact = (editingOriginalOrder.total_amount || 0) - (editingOriginalOrder.amount_paid || 0);
                balance -= originalImpact;
            }
        }
        return balance;
    }, [selectedPartner, editOrderId, editingOriginalOrder]);

    const remainingDebt = paymentMethod === 'Debt'
        ? (oldDebt + (totalAmount >= 0 ? (totalAmount - amountPaid) : (totalAmount + amountPaid)))
        : oldDebt;


    useEffect(() => {
        localStorage.setItem('held_invoices', JSON.stringify(heldInvoices));
    }, [heldInvoices]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key.toUpperCase();
            if (e.key === 'Escape') {
                // If anything is open, close it and prevent further default actions
                const isAnythingOpen = isPartnerDropdownOpen || isHeldSidebarOpen || showPreview ||
                    showQuickAddPartner || showQuickAddProduct || isEditModalOpen ||
                    searchTerm || rowSearchIdx !== null;

                if (isAnythingOpen) {
                    setIsPartnerDropdownOpen(false);
                    setIsHeldSidebarOpen(false);
                    setShowPreview(false);
                    setShowQuickAddPartner(false);
                    setShowQuickAddProduct(false);
                    setIsEditModalOpen(false);
                    setSearchTerm('');
                    setRowSearchIdx(null);
                    setIsHistoryPanelOpen(false);
                }
            } else if (key === (settings.kb_search || 'F2').toUpperCase()) {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (key === (settings.kb_save || 'F12').toUpperCase()) {
                e.preventDefault();
                handleSave(false);
            } else if (key === (settings.kb_pay || 'F9').toUpperCase()) {
                e.preventDefault();
                handleSave(true);
            } else if (key === (settings.kb_new || 'F4').toUpperCase()) {
                e.preventDefault();
                handleNew();
            } else if (key === (settings.kb_hold || 'F8').toUpperCase()) {
                e.preventDefault();
                handleHold();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, selectedPartner, amountPaid, note, settings, isPartnerDropdownOpen, isHeldSidebarOpen, showPreview, showQuickAddPartner, showQuickAddProduct, isEditModalOpen, searchTerm, rowSearchIdx]);

    // Mode change listeners removed
    useEffect(() => {
        // Any other focus logic if needed, but mode syncing is gone
    }, []);

    const loadDraft = () => {
        const draft = localStorage.getItem('pos_draft');
        if (draft) {
            try {
                const d = JSON.parse(draft);
                setCart(d.cart || []);
                setNote(d.note || '');
                setAmountPaid(d.amountPaid || 0);
                setPaymentMethod(d.paymentMethod || (localStorage.getItem('unified_pos_mode') === 'Wholesale' ? 'Pending' : 'Cash'));
                if (d.selectedPartnerId) {
                    const partner = partners.find(p => p.id === d.selectedPartnerId);
                    setSelectedPartner(partner || null);
                } else {
                    setSelectedPartner(null);
                }
                setEditOrderId(null);
                setEditingOriginalOrder(null);
                setHistoryStep(0);
                return true;
            } catch (e) {
                console.error("Error loading draft", e);
            }
        }
        return false;
    };

    useEffect(() => {
        // fetchProducts(); - Removed, using React Query
        // fetchPartners(); - Removed, using React Query
        fetchSettings();
        fetchBankAccounts();

        // Load Draft
        if (!location.state?.editOrder) {
            loadDraft();
        }

        // Handle Edit Mode from State
        if (location.state?.editOrder) {
            const order = location.state.editOrder;
            loadOrder(order);
        } else {
            // Handle Edit Mode from URL Param
            const params = new URLSearchParams(window.location.search);
            const editId = params.get('edit');
            if (editId) {
                fetchOrder(editId);
            } else {
                // Not in edit mode - if we were previously editing, we should reset
                if (editOrderId) {
                    handleNew(false);
                }
            }
        }
        setIsLoaded(true);
    }, [location.search, location.state]);

    const fetchOrder = async (id) => {
        try {
            const res = await axios.get(`/api/orders/${id}`);
            if (res.data) loadOrder(res.data);
        } catch (e) {
            console.error("Error fetching order", e);
            setToast({ message: 'Không tìm thấy hóa đơn', type: 'error' });
        }
    };

    const loadOrder = (order) => {
        setEditOrderId(order.id);
        setEditingOriginalOrder(order);
        setCart(order.details.map(d => ({
            product_id: d.product_id,
            product_name: d.product_name,
            unit: d.product_unit,
            secondary_unit: d.secondary_unit,
            multiplier: d.multiplier || 1,
            price: d.price,
            cost_price: d.cost_price,
            quantity: d.quantity,
            secondary_qty: d.quantity / (d.multiplier || 1),
            stock: d.stock || 0,
            active_ingredient: d.active_ingredient
        })));
        setNote(order.note || '');
        setAmountPaid(order.amount_paid || 0);
        setPaymentMethod(order.payment_method);
        setPendingPartnerId(order.partner_id);
        setPartnerSearch('');
        setSearchTerm('');
        setIsPartnerDropdownOpen(false);
    };

    // Update payment method when settings change
    // Handle Mode Change
    const handleModeChange = (newMode) => {
        setPosMode(newMode);
        localStorage.setItem('unified_pos_mode', newMode);
        // Only update payment method if cart is empty or strictly new order logic desired
        if (cart.length === 0 && !editOrderId) {
            setPaymentMethod(newMode === 'Wholesale' ? 'Pending' : 'Cash');
        }
    };

    // Auto-sync amountPaid for Cash method
    useEffect(() => {
        if (paymentMethod === 'Cash') {
            setAmountPaid(totalAmount);
        }
    }, [paymentMethod, totalAmount]);

    // ...

    // Save Draft
    useEffect(() => {
        if (isLoaded && !editOrderId) {
            const draft = { cart, selectedPartnerId: selectedPartner?.id, note, amountPaid, paymentMethod };
            localStorage.setItem('pos_draft', JSON.stringify(draft));
        }
    }, [cart, selectedPartner, note, amountPaid, paymentMethod, editOrderId, isLoaded]); // Added isLoaded dependency

    useEffect(() => {
        if (partners.length > 0) {
            if (pendingPartnerId) {
                const partner = partners.find(p => p.id == pendingPartnerId);
                if (partner) {
                    setSelectedPartner(partner);
                    setPendingPartnerId(null);
                    setPartnerSearch('');
                }
            } else if (!editOrderId) {
                const draft = localStorage.getItem('pos_draft');
                if (draft) {
                    try {
                        const d = JSON.parse(draft);
                        if (d.selectedPartnerId) {
                            const partner = partners.find(p => p.id === d.selectedPartnerId);
                            if (partner) {
                                setSelectedPartner(partner);
                                setPartnerSearch('');
                            }
                        }
                    } catch (e) { }
                }
            }
        }
    }, [partners, pendingPartnerId, editOrderId, location.state]);

    const fetchSettings = async () => {
        try {
            const [templatesRes, settingsRes] = await Promise.all([
                axios.get('/api/print-templates?module=Sale'),
                axios.get('/api/settings')
            ]);

            let combinedSettings = { ...DEFAULT_SETTINGS };

            if (settingsRes.data) {
                combinedSettings = { ...combinedSettings, ...settingsRes.data };
            }

            // Sync Logic:
            // Sync Logic Removed
            // combinedSettings.pos_input_mode always ignored now
            if (templatesRes.data && templatesRes.data.length > 0) {
                const defaultTemplate = templatesRes.data.find(t => t.is_default) || templatesRes.data[0];
                if (defaultTemplate) {
                    try {
                        const config = JSON.parse(defaultTemplate.config);
                        combinedSettings = { ...combinedSettings, ...config };
                    } catch (e) {
                        console.error("Error parsing template config", e);
                    }
                }
            }
            setSettings(combinedSettings);

            // On initial load, set payment method based on mode
            const isEditMode = editOrderId || location.state?.editOrder || new URLSearchParams(window.location.search).get('edit');
            if (cart.length === 0 && !isEditMode) {
                setPaymentMethod(posMode === 'Wholesale' ? 'Pending' : 'Cash');
                setAmountPaid(totalAmount);
            }
        } catch (err) {
            console.error('Lỗi khi tải cài đặt:', err);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await axios.get('/api/products');
            setProducts(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchPartners = async () => {
        try {
            const res = await axios.get('/api/partners');
            setPartners(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchBankAccounts = async () => {
        try {
            const res = await axios.get('/api/bank-accounts');
            setBankAccounts(res.data);
            if (res.data.length > 0) setSelectedBankAccountId(res.data[0].id);
        } catch (err) { console.error(err); }
    };

    const fetchCustomPrices = async (partnerId) => {
        if (!partnerId) {
            setCustomPrices({});
            return;
        }
        try {
            const res = await axios.get(`/api/custom-prices/${partnerId}`);
            setCustomPrices(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (selectedPartner) {
            fetchCustomPrices(selectedPartner.id);
        } else {
            setCustomPrices({});
        }
    }, [selectedPartner]);

    // Update cart prices when partner/customPrices change
    useEffect(() => {
        if (cart.length > 0) {
            setCart(prevCart => prevCart.map(item => {
                const customPrice = customPrices[item.product_id];
                if (customPrice !== undefined) {
                    return { ...item, price: customPrice };
                }
                // If no custom price, revert to default product price? 
                // In wholesale, if partner is removed, item price should return to default.
                const originalProd = products.find(p => p.id === item.product_id);
                return { ...item, price: originalProd ? originalProd.sale_price : item.price };
            }));
        }
    }, [customPrices]);

    useEffect(() => {
        if (paymentMethod === 'Cash') {
            setAmountPaid(totalAmount);
        }
    }, [totalAmount, paymentMethod]);

    const addToCart = (product, customQty = null, customPrice = null) => {
        const qtyToAdd = customQty !== null ? customQty : 1;
        const existing = cart.find(item => item.product_id === product.id);

        const defaultPrice = product.sale_price;
        const appliedPrice = customPrice !== null ? customPrice : (customPrices[product.id] !== undefined ? customPrices[product.id] : defaultPrice);

        if (existing) {
            setCart(cart.map(item =>
                item.product_id === product.id
                    ? { ...item, quantity: item.quantity + qtyToAdd, price: appliedPrice, secondary_qty: (item.quantity + qtyToAdd) / (item.multiplier || 1) }
                    : item
            ));
        } else {
            setCart([{
                product_id: product.id,
                product_name: product.name,
                unit: product.unit,
                secondary_unit: product.secondary_unit,
                multiplier: product.multiplier || 1,
                price: appliedPrice,
                cost_price: product.cost_price,
                quantity: qtyToAdd,
                secondary_qty: qtyToAdd / (product.multiplier || 1),
                stock: product.stock,
                is_combo: product.is_combo,
                active_ingredient: product.active_ingredient
            }, ...cart]);
        }
        setSearchTerm('');
        setActiveIndex(0);
        setWorkingItem({ product: null, quantity: 1, price: 0, secondary_qty: 0, name: '' });

        // Focus back to search for next line (Immediate)
        setTimeout(() => {
            const input = searchInputRef.current;
            if (input) {
                input.focus();
                input.select();
            }
        }, 10);
    };

    const updateCartItem = (idx, field, value) => {
        const newCart = [...cart];
        const item = newCart[idx];

        if (field === 'secondary_qty') {
            item.secondary_qty = value;
            item.quantity = value * item.multiplier;
        } else if (field === 'quantity') {
            item.quantity = value;
            item.secondary_qty = value / item.multiplier;
        } else {
            item[field] = value;
        }

        setCart(newCart);
    };

    const removeFromCart = (idx) => {
        setCart(cart.filter((_, i) => i !== idx));
    };


    const handleSave = async (shouldPrint = true) => {
        let finalCart = [...cart];
        if (workingItem.product && workingItem.quantity !== 0) {
            // Check if already in cart to avoid duplicates if possible, or just append
            const existingIdx = finalCart.findIndex(i => i.product_id === workingItem.product.id && i.price === workingItem.price);
            if (existingIdx > -1) {
                finalCart[existingIdx].quantity += workingItem.quantity;
                finalCart[existingIdx].secondary_qty += workingItem.secondary_qty;
            } else {
                finalCart = [{
                    product_id: workingItem.product.id,
                    product_name: workingItem.product.name,
                    unit: workingItem.product.unit,
                    secondary_unit: workingItem.product.secondary_unit,
                    multiplier: workingItem.product.multiplier || 1,
                    price: workingItem.price,
                    cost_price: workingItem.product.cost_price,
                    quantity: workingItem.quantity,
                    secondary_qty: workingItem.secondary_qty,
                    is_combo: workingItem.product.is_combo
                }, ...finalCart];
            }
        }

        if (finalCart.length === 0) return;
        setLoading(true);
        try {
            const orderData = {
                partner_id: selectedPartner ? selectedPartner.id : null,
                type: 'Sale',
                payment_method: paymentMethod,
                details: finalCart.map(item => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price: item.price
                })),
                note,
                amount_paid: amountPaid,
                bank_account_id: paymentMethod === 'Transfer' ? selectedBankAccountId : null
            };

            let res;
            if (editOrderId) {
                res = await axios.put(`/api/orders/${editOrderId}`, orderData);
            } else {
                res = await axios.post('/api/orders', orderData);
            }

            setLastOrder(res.data);

            // AUTO-SAVE: If a partner is selected and price was manually changed from the known custom price
            if (selectedPartner) {
                for (const item of cart) {
                    const knownPrice = customPrices[item.product_id];
                    if (item.price !== knownPrice) {
                        // Save this as the new custom price for this partner
                        await axios.post('/api/custom-prices', {
                            partner_id: selectedPartner.id,
                            product_id: item.product_id,
                            price: item.price
                        });
                    }
                }
            }

            if (shouldPrint) {
                // Wait for React to render the PrintTemplate with the new order data
                setTimeout(() => {
                    window.print();
                    // Don't clear lastOrder immediately, wait a bit for the printer driver/preview to finish
                    setTimeout(() => {
                        handleNew(false);
                        fetchProducts();
                        fetchPartners();
                        setLastOrder(null);
                    }, 1000);
                }, 1000);
            } else {
                handleNew(false);
                fetchProducts();
                fetchPartners();
                setToast({ message: "Đã lưu đơn hàng thành công!", type: "success" });
                setLastOrder(null);
                localStorage.removeItem('pos_draft');
            }
        } catch (err) {
            setToast({ message: err.response?.data?.error || "Lỗi khi lưu đơn hàng", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleHold = () => {
        if (cart.length === 0) return;
        const newHeld = {
            id: Date.now(),
            cart: [...cart],
            partner: selectedPartner,
            note,
            amountPaid,
            paymentMethod,
            total: totalAmount,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            editOrderId // Preserve the original invoice ID
        };
        setHeldInvoices([...heldInvoices, newHeld]);
        localStorage.removeItem('pos_draft');
        handleNew();
        setIsHeldSidebarOpen(true);
    };

    const handleRestore = (held) => {
        setCart(held.cart);
        setSelectedPartner(held.partner);
        setNote(held.note);
        setAmountPaid(held.amountPaid);
        setPaymentMethod(held.paymentMethod || 'Debt');
        setEditOrderId(held.editOrderId || null); // Restore the original invoice ID
        setHeldInvoices(heldInvoices.filter(h => h.id !== held.id));
        setIsHeldSidebarOpen(false);
    };

    const handleRemoveHeld = (id) => {
        setHeldInvoices(heldInvoices.filter(h => h.id !== id));
    };

    const handleNew = (keepPartner = false) => {
        setCart([]);
        if (!keepPartner) {
            setSelectedPartner(null);
            setPartnerSearch('');
        }
        setSearchTerm('');
        setIsPartnerDropdownOpen(false);
        setAmountPaid(0);
        setNote('');
        const defaultMethod = posMode === 'Wholesale' ? 'Pending' : 'Cash';
        setPaymentMethod(defaultMethod);
        if (defaultMethod === 'Cash') setAmountPaid(0); // It will be updated by useEffect when items are added
        setEditOrderId(null);
        setEditingOriginalOrder(null);
        setLastOrder(null);
        setHistoryStep(0);
        setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    const navigateHistory = async (direction) => {
        let nextStep;
        if (direction === 'prev') {
            nextStep = historyStep + 1;
        } else {
            nextStep = Math.max(0, historyStep - 1);
        }

        if (nextStep === 0) {
            if (!loadDraft()) {
                handleNew();
            }
            return;
        }

        try {
            setHistoryLoading(true);
            const res = await axios.get(`/api/orders?type=Sale&limit=1&page=${nextStep}`);
            const items = res.data.items || res.data;
            if (items && items.length > 0) {
                const order = items[0];

                // Small delay to allow fade out
                await new Promise(r => setTimeout(r, 150));

                setEditOrderId(order.id);
                setEditingOriginalOrder(order);
                setCart(order.details.map(d => ({
                    product_id: d.product_id,
                    product_name: d.product_name,
                    unit: d.product_unit,
                    secondary_unit: d.secondary_unit,
                    multiplier: d.multiplier || 1,
                    price: d.price,
                    cost_price: d.cost_price || 0,
                    quantity: d.quantity,
                    secondary_qty: d.quantity / (d.multiplier || 1),
                    is_combo: d.is_combo,
                    active_ingredient: d.active_ingredient
                })));
                setNote(order.note || '');
                setAmountPaid(order.amount_paid || 0);
                setPaymentMethod(order.payment_method);
                const partner = partners.find(p => p.id === order.partner_id);
                setSelectedPartner(partner || null);
                setHistoryStep(nextStep);
            } else {
                if (direction === 'prev') {
                    setToast({ message: "Không còn đơn hàng cũ hơn.", type: "error" });
                } else {
                    handleNew();
                }
            }
        } catch (err) {
            console.error(err);
            setToast({ message: "Lỗi khi tải lịch sử đơn hàng", type: "error" });
        } finally {
            setTimeout(() => setHistoryLoading(false), 300);
        }
    };

    const filteredProducts = useMemo(() => {
        const s = searchTerm.toLowerCase();
        if (!s) return products.slice(0, 10);
        return products
            .filter(p => (p.name || "").toLowerCase().includes(s) || (p.code || "").toLowerCase().includes(s) || (p.active_ingredient || "").toLowerCase().includes(s))
            .sort((a, b) => {
                const aName = (a.name || "").toLowerCase();
                const bName = (b.name || "").toLowerCase();
                const aStarts = aName.startsWith(s);
                const bStarts = bName.startsWith(s);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                if (a.code?.toLowerCase() === s && b.code?.toLowerCase() !== s) return -1;
                if (a.code?.toLowerCase() !== s && b.code?.toLowerCase() === s) return 1;
                return aName.localeCompare(bName, 'vi', { sensitivity: 'base' });
            })
            .slice(0, 10);
    }, [products, searchTerm]);

    const filteredPartners = useMemo(() => {
        const s = partnerSearch.toLowerCase();
        return partners
            .filter(p => (p.name || "").toLowerCase().includes(s) || (p.phone || "").includes(s))
            .sort((a, b) => {
                const aName = (a.name || "").toLowerCase();
                const bName = (b.name || "").toLowerCase();
                const aStarts = aName.startsWith(s);
                const bStarts = bName.startsWith(s);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return aName.localeCompare(bName, 'vi', { sensitivity: 'base' });
            });
    }, [partners, partnerSearch]);


    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden no-print">
                {/* Top Bar: Search & Partner */}
                <div className="p-4 flex gap-6 items-center print:hidden transition-colors relative border-primary/20 z-[110]">

                    {/* Background Decoration Layer */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute right-[-40px] top-[-40px] opacity-[0.03] dark:opacity-[0.06] -rotate-12 transition-all duration-1000">
                            <Wheat size={240} className="text-primary" />
                        </div>
                        <div className="absolute left-[-20px] bottom-[-20px] opacity-[0.02] dark:opacity-[0.04] rotate-45 transition-all duration-1000">
                            <Sprout size={180} className="text-[#4a7c59]" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mr-4 relative z-10">
                        <div className="p-3 bg-gradient-to-br from-primary to-emerald-600 rounded-2xl shadow-lg">
                            <Wheat size={28} className="text-white" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-2xl font-black text-primary dark:text-[#d4a574] uppercase tracking-tighter flex items-center gap-2">
                            Vụ mùa số
                            <span className="text-sm font-bold px-3 py-1 bg-gradient-to-r from-[#d4a574]/20 to-[#f4c430]/20 text-muted dark:text-[#d4a574] rounded-xl border border-primary/30">
                                #{editOrderId || 'MỚI'}
                            </span>
                        </h1>
                        <button
                            onClick={() => {
                                const tempOrder = {
                                    display_id: editOrderId ? `Đơn #${editOrderId}` : 'XEM TRƯỚC',
                                    date: new Date().toISOString(),
                                    partner_name: selectedPartner ? selectedPartner.name : 'Khách Lẻ',
                                    partner_address: selectedPartner ? selectedPartner.address : '',
                                    partner_phone: selectedPartner ? selectedPartner.phone : '',
                                    total_amount: totalAmount,
                                    amount_paid: amountPaid,
                                    payment_method: paymentMethod,
                                    note: note,
                                    old_debt: oldDebt,
                                    partner_id: selectedPartner ? selectedPartner.id : null,
                                    details: cart.map(item => ({ ...item }))
                                };
                                setPreviewData(tempOrder);
                                setShowPreview(true);
                            }}
                            className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-muted hover:text-primary hover:bg-[#d4a574]/20 dark:hover:bg-[#4a7c59]/20 px-4 py-2 rounded-xl border-2 border-[#d4a574]/30 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-md"
                        >
                            <Eye size={16} /> Xem trước in
                        </button>
                    </div>
                    <div className="flex-1 flex gap-4 relative z-10">

                        <div className="w-80 relative z-50" onBlur={() => setTimeout(() => setIsPartnerDropdownOpen(false), 200)}>
                            <div
                                className="relative cursor-pointer"
                                onDoubleClick={(e) => {
                                    e.preventDefault();
                                    if (selectedPartner) {
                                        setEditingPartner(selectedPartner);
                                        setIsPartnerEditModalOpen(true);
                                    }
                                }}
                            >
                                <Sprout className="absolute left-3 top-3 text-primary" size={18} strokeWidth={2.5} />
                                <input
                                    type="text"
                                    className="w-full pl-10 p-2.5 border-2 border-primary/30 dark:border-slate-800 rounded-xl focus:border-primary dark:focus:border-primary outline-none font-bold text-primary dark:text-gray-200 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm cursor-pointer transition-all shadow-sm focus:shadow-md"
                                    ref={partnerInputRef}
                                    placeholder="🔍 Tìm kiếm đối tác..."
                                    value={selectedPartner ? selectedPartner.name : partnerSearch}
                                    onDoubleClick={(e) => {
                                        if (selectedPartner) {
                                            e.stopPropagation();
                                            setEditingPartner(selectedPartner);
                                            setIsPartnerEditModalOpen(true);
                                        }
                                    }}
                                    onChange={(e) => {
                                        setPartnerSearch(e.target.value);
                                        if (selectedPartner) setSelectedPartner(null);
                                        setIsPartnerDropdownOpen(true);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setActiveIndex(prev => {
                                                const next = Math.min(prev + 1, filteredPartners.length);
                                                const container = partnerDropdownRef.current;
                                                if (container) {
                                                    const item = container.children[next];
                                                    if (item) item.scrollIntoView({ block: 'nearest' });
                                                }
                                                return next;
                                            });
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setActiveIndex(prev => {
                                                const next = Math.max(prev - 1, 0);
                                                const container = partnerDropdownRef.current;
                                                if (container) {
                                                    const item = container.children[next];
                                                    if (item) item.scrollIntoView({ block: 'nearest' });
                                                }
                                                return next;
                                            });
                                        } else if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (activeIndex === 0) {
                                                setSelectedPartner(null);
                                                setPartnerSearch('');
                                                setIsPartnerDropdownOpen(false);
                                            } else if (filteredPartners[activeIndex - 1]) {
                                                const p = filteredPartners[activeIndex - 1];
                                                setSelectedPartner(p);
                                                setPartnerSearch('');
                                                setIsPartnerDropdownOpen(false);
                                            }
                                        }
                                    }}
                                />
                                {selectedPartner && (
                                    <button
                                        onClick={() => { setSelectedPartner(null); setPartnerSearch(''); }}
                                        className="absolute right-3 top-3 text-muted hover:text-red-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>





                            <AnimatePresence>
                                {isPartnerDropdownOpen && !selectedPartner && (
                                    <m.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        className="dropdown-premium min-w-[320px] !z-[200]"
                                        ref={partnerDropdownRef}
                                    >
                                        <div
                                            className={cn(
                                                "dropdown-item flex items-center gap-3",
                                                activeIndex === 0 && "active"
                                            )}
                                            onClick={() => { setSelectedPartner(null); setPartnerSearch(''); setIsPartnerDropdownOpen(false); }}
                                        >
                                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors", activeIndex === 0 ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-500")}>
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <div className={cn("font-black uppercase tracking-tight", activeIndex === 0 ? "text-white" : "text-gray-800 dark:text-gray-100")}>Khách lẻ</div>
                                                <div className={cn("text-[10px] font-bold", activeIndex === 0 ? "text-white/70" : "text-gray-400")}>Thanh toán ngay</div>
                                            </div>
                                        </div>
                                        <div className="max-h-[350px] overflow-y-auto no-scrollbar scroll-smooth">
                                            {filteredPartners.map((p, idx) => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => {
                                                        setSelectedPartner(p);
                                                        setPartnerSearch('');
                                                        setIsPartnerDropdownOpen(false);
                                                    }}
                                                    className={cn(
                                                        "dropdown-item flex justify-between items-center",
                                                        activeIndex === idx + 1 && "active"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors", (activeIndex === idx + 1) ? "bg-white/20 text-white" : "bg-primary/10 text-primary")}>
                                                            <User size={16} />
                                                        </div>
                                                        <div>
                                                            <div className={cn("font-black uppercase tracking-tight", (activeIndex === idx + 1) ? "text-white" : "text-gray-800 dark:text-gray-100")}>{p.name}</div>
                                                            <div className={cn("text-[10px] font-bold flex items-center gap-2", (activeIndex === idx + 1) ? "text-white/70" : "text-gray-400")}>
                                                                <span className="flex items-center gap-0.5"><Phone size={10} strokeWidth={3} /> {p.phone || 'N/A'}</span>
                                                                <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                                                                <span className="flex items-center gap-0.5 uppercase tracking-tighter">
                                                                    {p.is_customer && p.is_supplier ? "KH & NCC" : p.is_customer ? "Khách hàng" : "Nhà CC"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={cn("text-[10px] font-black uppercase opacity-60 mb-0.5", (activeIndex === idx + 1) ? "text-white/60" : "text-gray-400")}>Dư nợ</div>
                                                        <div className={cn("font-black text-sm", (activeIndex === idx + 1) ? "text-white" : "text-red-500")}>{formatDebt(p.debt_balance)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {partnerSearch && filteredPartners.length === 0 && (
                                            <div
                                                className="p-4 bg-primary text-white cursor-pointer font-black uppercase text-xs flex items-center gap-2 hover:brightness-110 transition-all"
                                                onClick={() => {
                                                    setQuickAddName(partnerSearch);
                                                    setShowQuickAddPartner(true);
                                                    setIsPartnerDropdownOpen(false);
                                                }}
                                            >
                                                <Plus size={18} strokeWidth={3} /> Thêm khách hàng mới: "{partnerSearch}"
                                            </div>
                                        )}
                                    </m.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex gap-2 items-center">

                            <m.button
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                onClick={() => setIsHeldSidebarOpen(true)}
                                className="relative p-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-muted dark:text-gray-400 rounded-xl hover:bg-[#d4a574]/20 dark:hover:bg-slate-700 transition-all font-bold flex items-center gap-2 border-2 border-[#d4a574]/20 shadow-sm hover:shadow-md"
                                title="Hóa đơn chờ"
                            >
                                <Pause size={20} />
                                {heldInvoices.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-gradient-to-br from-[#f4c430] to-[#d4a574] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black shadow-lg">
                                        {heldInvoices.length}
                                    </span>
                                )}
                                <span className="hidden lg:inline text-xs uppercase">HĐ Chờ</span>
                            </m.button>

                            <div className="flex bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm border-2 border-[#d4a574]/20">
                                <m.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => navigateHistory('prev')}
                                    className="p-2.5 text-muted dark:text-gray-400 hover:bg-[#d4a574]/20 dark:hover:bg-slate-700 transition-all border-r border-[#d4a574]/20 dark:border-slate-700"
                                    title="Đơn trước"
                                >
                                    <ChevronLeft size={20} />
                                </m.button>
                                <m.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        if (historyStep !== 0) {
                                            if (!loadDraft()) handleNew();
                                        }
                                    }}
                                    className="px-3 flex flex-col items-center justify-center min-w-[70px] hover:bg-[#d4a574]/20 dark:hover:bg-slate-700 transition-colors"
                                    title="Quay về đơn mới"
                                >
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-tighter",
                                        historyStep === 0 ? "text-primary dark:text-[#4a7c59]" : "text-[#f4c430]"
                                    )}>
                                        {historyStep === 0 ? "Mới" : `#${historyStep}`}
                                    </span>
                                    {historyStep !== 0 && (
                                        <span className="text-[8px] font-bold text-muted dark:text-gray-400 uppercase leading-none">Về Mới</span>
                                    )}
                                </m.button>
                                <m.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => navigateHistory('next')}
                                    disabled={historyStep === 0}
                                    className={cn(
                                        "p-2.5 text-muted dark:text-gray-400 hover:bg-[#d4a574]/20 dark:hover:bg-slate-700 transition-all border-l border-[#d4a574]/20 dark:border-slate-700",
                                        historyStep === 0 && "opacity-30 cursor-not-allowed"
                                    )}
                                    title="Đơn sau"
                                >
                                    <ChevronRight size={20} />
                                </m.button>
                            </div>

                            <m.button
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                onClick={handleNew}
                                className="p-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-muted dark:text-gray-400 rounded-xl hover:bg-[#d4a574]/20 dark:hover:bg-slate-700 transition-all font-bold flex items-center gap-2 border-2 border-[#d4a574]/20 shadow-sm hover:shadow-md"
                                title="Đơn mới"
                            >
                                <RotateCcw size={20} />
                                <span className="hidden lg:inline text-xs uppercase">Đơn mới</span>
                            </m.button>

                            <m.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleModeChange(posMode === 'Retail' ? 'Wholesale' : 'Retail')}
                                className={cn(
                                    "px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer select-none shadow-sm hover:shadow-md border-2",
                                    posMode === 'Wholesale'
                                        ? "bg-gradient-to-r from-[#f4c430]/20 to-[#d4a574]/20 text-muted border-[#d4a574]/30 hover:from-[#f4c430]/30 hover:to-[#d4a574]/30"
                                        : "bg-gradient-to-r from-primary/20 to-primary-hover/20 text-primary dark:text-[#4a7c59] border-[#4a7c59]/30 hover:from-primary/30 hover:to-primary-hover/30"
                                )}
                            >
                                <div className={cn("w-2 h-2 rounded-full", posMode === 'Wholesale' ? "bg-amber-500" : "bg-emerald-500")} />
                                {posMode === 'Wholesale' ? 'SỈ' : 'LẺ'}
                            </m.button>

                            {selectedPartner && (
                                <m.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsHistoryPanelOpen(true)}
                                    className="p-2.5 bg-gradient-to-br from-primary to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-primary/40 transition-all border-2 border-white/20 dark:border-slate-700/50 flex items-center justify-center"
                                    title="Lịch sử mua hàng"
                                >
                                    <History size={20} strokeWidth={3} />
                                </m.button>
                            )}
                        </div>

                        {/* Date/Time Display in Empty Space */}
                        <div className="flex-1 flex justify-end items-center mr-2">
                            <div className="flex flex-col items-end opacity-80 hover:opacity-100 transition-opacity select-none">
                                <div className="text-2xl font-black text-primary dark:text-[#d4a574] tracking-tighter leading-none flex items-center gap-2 tabular-nums">
                                    {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-[10px] font-bold text-muted dark:text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Clock size={10} strokeWidth={2.5} />
                                    <span>{currentTime.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Held Invoices Sidebar */}
                <AnimatePresence>
                    {isHeldSidebarOpen && (
                        <Portal>
                            <div className="fixed inset-0 z-[2000] flex justify-end font-sans">
                                <m.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                                    onClick={() => setIsHeldSidebarOpen(false)}
                                />
                                <m.div
                                    initial={{ x: '100%', opacity: 0.5 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: '100%', opacity: 0.5 }}
                                    transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
                                    className="relative w-[340px] md:w-[400px] bg-white dark:bg-slate-900 shadow-2xl h-full flex flex-col p-8 border-l border-white/10"
                                >
                                    <div className="flex justify-between items-center mb-8">
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tighter flex items-center gap-3">
                                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                                                    <Pause className="text-amber-600 dark:text-amber-400" size={24} />
                                                </div>
                                                Hóa đơn chờ
                                            </h2>
                                            <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-[0.2em] mt-1 ml-1">Đang treo ({heldInvoices.length})</p>
                                        </div>
                                        <button
                                            onClick={() => setIsHeldSidebarOpen(false)}
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all hover:rotate-90"
                                        >
                                            <X size={24} className="text-gray-400" />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-auto space-y-4 pr-2 no-scrollbar">
                                        {heldInvoices.length === 0 ? (
                                            <div className="text-center py-32 text-gray-300 dark:text-slate-700">
                                                <div className="relative inline-block mb-4">
                                                    <Pause size={64} className="opacity-20 mx-auto" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
                                                </div>
                                                <p className="font-black uppercase text-xs tracking-widest">Trống trải...</p>
                                            </div>
                                        ) : (
                                            <AnimatePresence mode="popLayout">
                                                {heldInvoices.map((held, idx) => (
                                                    <m.div
                                                        key={held.id}
                                                        layout
                                                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.9, x: 20 }}
                                                        transition={{
                                                            delay: idx * 0.05,
                                                            type: "spring",
                                                            stiffness: 400,
                                                            damping: 30
                                                        }}
                                                        className="bg-white dark:bg-slate-800/40 border-2 border-amber-50 dark:border-amber-900/10 rounded-[2rem] p-5 hover:border-amber-200 dark:hover:border-amber-600/30 transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1"
                                                    >
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex-1">
                                                                <div className="font-black text-gray-800 dark:text-gray-100 uppercase text-sm leading-tight group-hover:text-amber-600 transition-colors">
                                                                    {held.partner ? held.partner.name : "KHÁCH BÁN LẺ"}
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-2">
                                                                    <div className="text-[10px] font-black text-gray-400 bg-gray-50 dark:bg-slate-900 px-2 py-0.5 rounded-full uppercase tabular-nums">
                                                                        🕒 {held.time}
                                                                    </div>
                                                                    <div className="text-[10px] font-black text-amber-600/70 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full uppercase">
                                                                        {held.cart.length} món
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemoveHeld(held.id)}
                                                                className="text-gray-300 hover:text-rose-500 transition-colors p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                                                            <div>
                                                                <div className="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">Tổng cộng</div>
                                                                <div className="text-amber-600 dark:text-amber-400 font-black text-xl tracking-tighter">
                                                                    {formatNumber(held.total)}
                                                                </div>
                                                            </div>
                                                            <m.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => handleRestore(held)}
                                                                className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-5 py-2 rounded-xl font-black text-[11px] uppercase flex items-center gap-2 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all"
                                                            >
                                                                <RotateCcw size={14} strokeWidth={3} />
                                                                THU HỒI
                                                            </m.button>
                                                        </div>
                                                    </m.div>
                                                ))}
                                            </AnimatePresence>
                                        )}
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800">
                                        <button
                                            onClick={() => setIsHeldSidebarOpen(false)}
                                            className="w-full py-4 rounded-2xl border-2 border-gray-200 dark:border-slate-800 text-gray-500 font-black uppercase text-xs hover:bg-gray-50 dark:hover:bg-slate-800 transition-all tracking-widest"
                                        >
                                            Đóng sidebar
                                        </button>
                                    </div>
                                </m.div>
                            </div>
                        </Portal>
                    )}
                </AnimatePresence>

                {/* Main Area: Cart Grid & Summary Sidebar */}
                <div className="flex-1 flex gap-3 p-4 pt-0 pb-4 print:hidden min-h-0">
                    {/* Left: Product Cart Section */}
                    <m.div
                        initial={false}
                        animate={{ width: isSidebarExpanded ? "78%" : "calc(100% - 90px)" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="flex flex-col min-h-0"
                    >
                        <div className={cn(
                            "flex-1 overflow-hidden relative shadow-2xl transition-all duration-500 rounded-[2.7rem]",
                            settings.ui_show_rainbow_border === 'true' && "premium-rainbow-border"
                        )}>
                            <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative main-content-bg">
                                {/* Subtle wheat grain pattern overlay */}
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(139, 111, 71, 0.1) 10px, rgba(139, 111, 71, 0.1) 20px),
                                            radial-gradient(circle at 3px 3px, rgba(45, 80, 22, 0.08) 1px, transparent 0)`,
                                    backgroundSize: '40px 40px, 30px 30px',
                                    backgroundPosition: '0 0, 15px 15px'
                                }}></div>

                                <div className="absolute inset-0 overflow-auto no-scrollbar-on-empty">
                                    <div className="min-w-[1000px] transition-colors relative group/decoration pb-40">
                                        {/* Background Decoration Layer */}
                                        <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none">
                                            <div className="absolute right-[-100px] bottom-[-100px] opacity-[0.02] dark:opacity-[0.04] group-hover/decoration:scale-110 transition-transform duration-[2000ms] text-[#4a7c59]">
                                                <Leaf size={600} />
                                            </div>
                                            <div className="absolute left-[-50px] top-[-50px] opacity-[0.015] dark:opacity-[0.03] group-hover/decoration:rotate-12 transition-transform duration-[3000ms] text-muted">
                                                <Wheat size={400} />
                                            </div>
                                        </div>
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gradient-to-r from-primary/10 via-primary-hover/8 to-primary/10 border-b-2 border-[#d4a574]/40 text-primary dark:text-[#d4a574] uppercase text-[11px] font-black tracking-wider transition-colors sticky top-0 z-[100] shadow-md backdrop-blur-sm">
                                                <tr>
                                                    <th rowSpan={2} className="p-2 w-16 text-center align-middle">Stt</th>
                                                    <th className="px-4 py-0 align-middle text-center min-w-[450px]">
                                                        <div className="flex items-center justify-center gap-3 h-full min-h-[36px]">
                                                            <span className="font-black uppercase tracking-wider">Tên Sản Phẩm</span>
                                                        </div>
                                                    </th>
                                                    <th rowSpan={2} className="p-2 w-32 text-center align-middle">ĐVT</th>
                                                    <th className="p-2 w-40 text-center whitespace-nowrap">SL Quy đổi</th>
                                                    <th className="p-2 w-24 text-center text-primary dark:text-[#d4a574] whitespace-nowrap">Số lượng</th>
                                                    <th rowSpan={2} className="p-2 w-40 text-center align-middle">Đơn giá</th>
                                                    <th rowSpan={2} className="p-2 w-40 text-center align-middle">Thành tiền</th>
                                                    <th rowSpan={2} className="p-2 w-10 text-center align-middle"></th>
                                                </tr>
                                                <tr className="border-t border-[#d4a574]/20 text-[10px]">
                                                    <td className="px-4 py-1 text-primary/60 dark:text-[#d4a574]/60 font-black uppercase tracking-[0.1em] text-center border-r border-[#d4a574]/10">
                                                        Tổng đối soát ({totalItems} mặt hàng)
                                                    </td>
                                                    <td className="px-4 py-1 text-center border-r border-[#d4a574]/10">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <span className="text-sm font-black text-primary dark:text-[#d4a574]">{formatNumber(totalSecondaryQty)}</span>
                                                            <span className="text-[8px] font-black text-primary/40 uppercase tracking-tighter">Quy đổi</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-1 text-center border-r border-[#d4a574]/10">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <span className="text-sm font-black text-primary dark:text-[#d4a574]">{formatNumber(totalQty)}</span>
                                                            <span className="text-[8px] font-black text-primary/40 uppercase tracking-tighter">SL Lẻ</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                {/* Dòng Tìm Kiếm Sản Phẩm - Relocated for Better Workflow */}
                                                <tr
                                                    className="bg-gradient-to-r from-[#faf8f3]/60 via-white/40 to-[#faf8f3]/60 dark:bg-slate-900/40 print:hidden border-b-2 border-[#d4a574]/30 sticky top-[62px] z-[90] backdrop-blur-md cursor-pointer shadow-sm"
                                                    onDoubleClick={() => {
                                                        if (workingItem.product) {
                                                            setEditingProduct(workingItem.product);
                                                            setIsEditModalOpen(true);
                                                        }
                                                    }}
                                                >
                                                    <td className="p-4 text-center">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                                            <Plus className="text-primary" size={18} />
                                                        </div>
                                                    </td>
                                                    <td className="p-2 relative">
                                                        <div className="relative group/search">
                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-400">
                                                                <Search size={20} />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                placeholder="Tên sản phẩm (F2)..."
                                                                className="w-full p-2.5 pl-12 pr-16 bg-white/80 dark:bg-slate-800 border-2 border-[#d4a574]/20 focus:border-primary dark:focus:border-[#4a7c59] focus:bg-white rounded-xl font-black text-gray-800 dark:text-gray-100 uppercase outline-none transition-all shadow-sm"
                                                                autoComplete="off"
                                                                value={searchTerm}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setSearchTerm(val);
                                                                    setActiveIndex(0);
                                                                    if (workingItem.product && val !== workingItem.name) {
                                                                        setWorkingItem({ ...workingItem, product: null, name: val });
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'ArrowUp') {
                                                                        e.preventDefault();
                                                                        setActiveIndex(prev => {
                                                                            const next = Math.max(prev - 1, 0);
                                                                            const container = productDropdownRef.current;
                                                                            if (container) {
                                                                                const item = container.children[next];
                                                                                if (item) item.scrollIntoView({ block: 'nearest' });
                                                                            }
                                                                            return next;
                                                                        });
                                                                    } else if (e.key === 'ArrowDown') {
                                                                        e.preventDefault();
                                                                        setActiveIndex(prev => {
                                                                            const next = Math.min(prev + 1, filteredProducts.length - 1);
                                                                            const container = productDropdownRef.current;
                                                                            if (container) {
                                                                                const item = container.children[next];
                                                                                if (item) item.scrollIntoView({ block: 'nearest' });
                                                                            }
                                                                            return next;
                                                                        });
                                                                    } else if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        if (searchTerm && filteredProducts[activeIndex]) {
                                                                            const p = filteredProducts[activeIndex];
                                                                            const currentQty = workingItem.quantity !== 0 ? workingItem.quantity : 1;
                                                                            setWorkingItem({
                                                                                product: p,
                                                                                quantity: currentQty,
                                                                                price: customPrices[p.id] !== undefined ? customPrices[p.id] : p.sale_price,
                                                                                secondary_qty: currentQty / (p.multiplier || 1),
                                                                                name: p.name
                                                                            });
                                                                            setSearchTerm(p.name);
                                                                            addToCart(p, 1, customPrices[p.id] !== undefined ? customPrices[p.id] : p.sale_price);
                                                                        }
                                                                    } else if (e.key === 'Tab') {
                                                                        if (workingItem.product) {
                                                                            e.preventDefault();
                                                                            const targetRef = (posMode === 'Wholesale' && workingItem.product.secondary_unit) ? workingSecQtyRef : workingQtyRef;
                                                                            setTimeout(() => {
                                                                                targetRef.current?.focus();
                                                                                targetRef.current?.select();
                                                                            }, 10);
                                                                        } else if (searchTerm && filteredProducts[activeIndex]) {
                                                                            e.preventDefault();
                                                                            const p = filteredProducts[activeIndex];
                                                                            const currentQty = workingItem.quantity !== 0 ? workingItem.quantity : 1;
                                                                            setWorkingItem({
                                                                                product: p,
                                                                                quantity: currentQty,
                                                                                price: customPrices[p.id] !== undefined ? customPrices[p.id] : p.sale_price,
                                                                                secondary_qty: currentQty / (p.multiplier || 1),
                                                                                name: p.name
                                                                            });
                                                                            setSearchTerm(p.name);
                                                                            const targetRef = (posMode === 'Wholesale' && p.secondary_unit) ? workingSecQtyRef : workingQtyRef;
                                                                            setTimeout(() => {
                                                                                targetRef.current?.focus();
                                                                                targetRef.current?.select();
                                                                            }, 10);
                                                                        }
                                                                    }
                                                                }}
                                                                ref={searchInputRef}
                                                            />
                                                            {workingItem.product && (
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                                                    <div className={cn(
                                                                        "px-3 py-1 rounded-xl text-[13px] font-black shadow-sm border-2 transition-all flex items-center gap-1.5",
                                                                        workingItem.product.stock < 10
                                                                            ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50"
                                                                            : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50"
                                                                    )}>
                                                                        <Activity size={14} className="opacity-70" />
                                                                        {workingItem.product.stock}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <AnimatePresence>
                                                                {searchTerm && !workingItem.product && (
                                                                    <m.div
                                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                                        className="dropdown-premium min-w-[500px] !z-[150]"
                                                                    >
                                                                        <div className="max-h-[400px] overflow-y-auto no-scrollbar scroll-smooth" ref={productDropdownRef}>
                                                                            {filteredProducts.map((p, idx) => (
                                                                                <div
                                                                                    key={p.id}
                                                                                    onClick={() => {
                                                                                        const currentQty = workingItem.quantity !== 0 ? workingItem.quantity : 1;
                                                                                        setWorkingItem({
                                                                                            product: p,
                                                                                            quantity: currentQty,
                                                                                            price: customPrices[p.id] !== undefined ? customPrices[p.id] : p.sale_price,
                                                                                            secondary_qty: currentQty / (p.multiplier || 1),
                                                                                            name: p.name
                                                                                        });
                                                                                        setSearchTerm(p.name);
                                                                                        setSearchTerm(p.name);
                                                                                        const targetRef = (posMode === 'Wholesale' && p.secondary_unit) ? workingSecQtyRef : workingQtyRef;
                                                                                        setTimeout(() => {
                                                                                            targetRef.current?.focus();
                                                                                            targetRef.current?.select();
                                                                                        }, 10);
                                                                                    }}
                                                                                    className={cn(
                                                                                        "dropdown-item flex justify-between items-center",
                                                                                        idx === activeIndex && "active"
                                                                                    )}
                                                                                >
                                                                                    <div>
                                                                                        <div className={cn("font-black uppercase tracking-tight", idx === activeIndex ? "text-white" : "text-gray-800 dark:text-gray-100")}>{p.name}</div>
                                                                                        <div className={cn("text-[10px] font-bold italic mb-0.5", idx === activeIndex ? "text-white/80" : "text-primary dark:text-emerald-400")}>{p.active_ingredient}</div>
                                                                                        <div className={cn("text-[10px] uppercase font-black flex items-center gap-2", idx === activeIndex ? "text-white/70" : "text-gray-500")}>
                                                                                            {p.is_combo ? <span className="bg-primary text-white px-1.5 rounded text-[9px]">COMBO</span> : (
                                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                                    <span className="opacity-60">{p.unit} {p.multiplier > 1 && `/ ${p.secondary_unit} (x${p.multiplier})`}</span>
                                                                                                    <div className={cn(
                                                                                                        "ml-auto px-3 py-1 rounded-xl text-[13px] font-black border-2 transition-all flex items-center gap-1.5 shadow-sm",
                                                                                                        idx === activeIndex
                                                                                                            ? "bg-white !text-emerald-700 border-white"
                                                                                                            : p.stock < 10
                                                                                                                ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800"
                                                                                                                : "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                                                                                                    )}>
                                                                                                        <Activity size={14} className="opacity-70" />
                                                                                                        {p.stock}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        <div className={cn("font-black text-lg tracking-tighter", idx === activeIndex ? "text-white" : "text-primary dark:text-emerald-400")}>{formatNumber(p.sale_price)}</div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        {searchTerm && filteredProducts.length === 0 && (
                                                                            <div
                                                                                className="p-4 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-primary hover:text-white cursor-pointer text-primary dark:text-emerald-400 font-black uppercase text-xs flex items-center gap-2"
                                                                                onClick={() => { setQuickAddName(searchTerm); setShowQuickAddProduct(true); }}
                                                                            >
                                                                                <Plus size={16} /> Thêm sản phẩm mới: "{searchTerm}"
                                                                            </div>
                                                                        )}
                                                                    </m.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="font-bold text-gray-700 dark:text-gray-200 text-xs">{workingItem.product?.unit || '-'}</div>
                                                        {workingItem.product?.secondary_unit && (
                                                            <div className="text-[10px] text-primary dark:text-[#d4a574] font-black uppercase tracking-tighter">
                                                                1 {workingItem.product.secondary_unit} = {workingItem.product.multiplier} {workingItem.product.unit}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-2 w-32">
                                                        {workingItem.product?.secondary_unit ? (
                                                            <div className="flex items-center gap-1 h-9 px-2 bg-amber-50/50 dark:bg-amber-900/10 border-2 border-dashed border-[#d4a574]/40 rounded-xl focus-within:border-primary dark:focus-within:border-[#4a7c59] focus-within:ring-4 focus-within:ring-primary/10 shadow-sm transition-all text-primary dark:text-[#d4a574]">
                                                                <input
                                                                    type="number"
                                                                    className="w-full min-w-0 bg-transparent text-center font-black text-base outline-none placeholder:text-gray-300"
                                                                    id="working-sec-qty"
                                                                    ref={workingSecQtyRef}
                                                                    value={workingItem.secondary_qty}
                                                                    autoComplete="off"
                                                                    onFocus={(e) => e.target.select()}
                                                                    onChange={(e) => {
                                                                        const v = parseFloat(e.target.value) || 0;
                                                                        setWorkingItem(prev => {
                                                                            const mult = parseFloat(prev.product?.multiplier) || 1;
                                                                            return {
                                                                                ...prev,
                                                                                secondary_qty: v,
                                                                                quantity: v * mult
                                                                            };
                                                                        });
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Tab') {
                                                                            e.preventDefault();
                                                                            workingQtyRef.current?.focus();
                                                                        } else if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            if (workingItem.product && workingItem.quantity !== 0) {
                                                                                addToCart(workingItem.product, workingItem.quantity, workingItem.price);
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                                <span className="text-[10px] font-black text-gray-400 uppercase pr-2">{workingItem.product.secondary_unit}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center text-gray-300 italic text-[10px] font-bold h-[38px] flex items-center justify-center">N/A</div>
                                                        )}
                                                    </td>
                                                    <td className="p-2 w-24 group/qty">
                                                        <div className="relative w-full">
                                                            <input
                                                                type="number"
                                                                className="w-full h-9 text-center bg-white dark:bg-slate-800 border-2 border-[#d4a574]/20 rounded-xl focus:border-primary dark:focus:border-[#4a7c59] focus:ring-4 focus:ring-primary/10 outline-none font-black text-lg text-primary dark:text-[#d4a574] shadow-sm transition-all placeholder:text-gray-300"
                                                                value={workingItem.quantity}
                                                                id="working-main-qty"
                                                                ref={workingQtyRef}
                                                                autoComplete="off"
                                                                onFocus={(e) => e.target.select()}
                                                                onChange={(e) => {
                                                                    const v = parseFloat(e.target.value) || 0;
                                                                    setWorkingItem(prev => {
                                                                        const mult = parseFloat(prev.product?.multiplier) || 1;
                                                                        return {
                                                                            ...prev,
                                                                            quantity: v,
                                                                            secondary_qty: v / mult
                                                                        };
                                                                    });
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Tab') {
                                                                        e.preventDefault();
                                                                        workingPriceRef.current?.focus();
                                                                    } else if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        if (workingItem.product && workingItem.quantity !== 0) {
                                                                            addToCart(workingItem.product, workingItem.quantity, workingItem.price);
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                tabIndex={-1}
                                                                className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-[#8b6f47] text-white rounded-full shadow-md hover:bg-[#8b6f47]/90 active:scale-95 z-[70] transition-all hover:scale-110 border border-white dark:border-slate-800 opacity-0 group-hover/qty:opacity-100 duration-200"
                                                                onClick={() => {
                                                                    setWorkingItem(prev => ({
                                                                        ...prev,
                                                                        quantity: prev.quantity * -1,
                                                                        secondary_qty: prev.secondary_qty * -1
                                                                    }));
                                                                    workingQtyRef.current?.focus();
                                                                }}
                                                                title="Đổi thành Trả Hàng (Âm)"
                                                            >
                                                                <RotateCcw size={10} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        <div className="relative group/price">
                                                            <input
                                                                type="text"
                                                                className={cn(
                                                                    "w-full p-2 text-right bg-transparent border-none focus:ring-2 rounded font-bold transition-all outline-none",
                                                                    workingItem.product && workingItem.price < workingItem.product.cost_price
                                                                        ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 focus:ring-red-200 dark:focus:ring-red-900"
                                                                        : "text-primary dark:text-[#d4a574] focus:ring-primary/20 dark:focus:ring-[#4a7c59]/20"
                                                                )}
                                                                value={formatNumber(workingItem.price)}
                                                                id="working-price"
                                                                ref={workingPriceRef}
                                                                autoComplete="off"
                                                                onFocus={(e) => e.target.select()}
                                                                onChange={(e) => {
                                                                    const v = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                                                                    setWorkingItem({ ...workingItem, price: v });
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        if (workingItem.product && workingItem.quantity !== 0) {
                                                                            addToCart(workingItem.product, workingItem.quantity, workingItem.price);
                                                                        }
                                                                    } else if (e.key === 'Tab' && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                        searchInputRef.current?.focus();
                                                                    }
                                                                }}
                                                            />
                                                            {workingItem.product && workingItem.price < workingItem.product.cost_price && (
                                                                <div className="absolute top-full right-0 bg-red-600 text-white text-sm px-4 py-2 rounded-xl font-black whitespace-nowrap z-[1001] flex items-center gap-2 shadow-2xl animate-bounce pointer-events-none uppercase tracking-tighter border-2 border-white dark:border-red-900 shadow-red-500/50 mt-2">
                                                                    <AlertTriangle size={18} fill="white" className="text-red-600" />
                                                                    LỖ VỐN (GỐC: {formatCurrency(workingItem.product.cost_price)})
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className={cn("font-black text-lg transition-colors", workingItem.quantity < 0 ? "text-red-600 dark:text-red-400" : "text-primary dark:text-[#d4a574]")}>
                                                            {formatNumber(workingItem.price * workingItem.quantity)}
                                                        </div>
                                                        {workingItem.quantity < 0 && (
                                                            <span className="inline-block px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-[9px] font-black uppercase tracking-widest border border-red-200 dark:border-red-800/50 mt-1">
                                                                Hàng trả
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        {workingItem.product && (
                                                            <button
                                                                onClick={() => setWorkingItem({ product: null, quantity: 1, price: 0, secondary_qty: 0, name: '' })}
                                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                                title="Xóa dòng"
                                                            >
                                                                <X size={20} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>

                                                <AnimatePresence initial={false} mode="wait">
                                                    {historyLoading ? (
                                                        <m.tr
                                                            key="loading-skeleton"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="w-full"
                                                        >
                                                            <td colSpan={9} className="h-[400px] text-center relative align-middle">
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                                                    <div className="relative">
                                                                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                                                                        <Loader2 size={48} className="animate-spin text-primary relative z-10" />
                                                                    </div>
                                                                    <span className="text-sm font-black text-muted dark:text-[#d4a574] uppercase tracking-widest">
                                                                        Đang đồng bộ dữ liệu...
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </m.tr>
                                                    ) : (
                                                        cart.map((item, idx) => (
                                                            <m.tr
                                                                key={`cart-row-${idx}`}
                                                                layout
                                                                initial={{ opacity: 0, x: -20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: 50, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } }}
                                                                transition={{
                                                                    duration: 0.3,
                                                                    type: "spring",
                                                                    stiffness: 300,
                                                                    damping: 25,
                                                                    delay: idx * 0.02
                                                                }}
                                                                className={cn(
                                                                    "transition-colors group cursor-pointer border-b border-dashed border-gray-100 dark:border-slate-800 last:border-0",
                                                                    idx % 2 === 0
                                                                        ? "bg-white/30 hover:bg-[#d4a574]/10"
                                                                        : "bg-[#faf8f3]/20 hover:bg-[#d4a574]/15"
                                                                )}
                                                                onDoubleClick={() => {
                                                                    const p = products.find(prod => prod.id === item.product_id);
                                                                    if (p) {
                                                                        setEditingProduct(p);
                                                                        setIsEditModalOpen(true);
                                                                    }
                                                                }}
                                                            >
                                                                <td className="p-4 text-center text-gray-400 font-bold group-hover:text-primary dark:group-hover:text-[#d4a574] transition-colors">{cart.length - idx}</td>
                                                                <td className="p-2 relative">
                                                                    <div
                                                                        className="relative group/search-row"
                                                                        onDoubleClick={(e) => {
                                                                            e.preventDefault();
                                                                            const p = products.find(prod => prod.id === item.product_id);
                                                                            if (p) {
                                                                                setEditingProduct(p);
                                                                                setIsEditModalOpen(true);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <input
                                                                            className="w-full p-2 pr-16 bg-transparent border-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-[#4a7c59]/20 rounded font-bold text-gray-800 dark:text-gray-100 uppercase outline-none"
                                                                            autoComplete="off"
                                                                            value={rowSearchIdx === idx ? rowSearchTerm : item.product_name}
                                                                            onFocus={(e) => {
                                                                                setRowSearchIdx(idx);
                                                                                setRowSearchTerm(item.product_name);
                                                                                setRowActiveIndex(0);
                                                                                e.target.select();
                                                                            }}
                                                                            onChange={(e) => {
                                                                                setRowSearchTerm(e.target.value);
                                                                                setRowActiveIndex(0);
                                                                            }}
                                                                            onBlur={() => {
                                                                                setTimeout(() => {
                                                                                    setRowSearchIdx(prev => prev === idx ? null : prev);
                                                                                }, 200);
                                                                            }}
                                                                            onDoubleClick={() => {
                                                                                const p = products.find(prod => prod.id === item.product_id);
                                                                                if (p) {
                                                                                    setEditingProduct(p);
                                                                                    setIsEditModalOpen(true);
                                                                                }
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                                const filtered = products.filter(p => {
                                                                                    const s = rowSearchTerm.toLowerCase();
                                                                                    return (p.name || "").toLowerCase().includes(s) ||
                                                                                        (p.code || "").toLowerCase().includes(s) ||
                                                                                        (p.active_ingredient || "").toLowerCase().includes(s);
                                                                                })
                                                                                    .sort((a, b) => {
                                                                                        const s = rowSearchTerm.toLowerCase();
                                                                                        const aName = (a.name || "").toLowerCase();
                                                                                        const bName = (b.name || "").toLowerCase();
                                                                                        const aStarts = aName.startsWith(s);
                                                                                        const bStarts = bName.startsWith(s);
                                                                                        if (aStarts && !bStarts) return -1;
                                                                                        if (!aStarts && bStarts) return 1;
                                                                                        if (a.code?.toLowerCase() === s && b.code?.toLowerCase() !== s) return -1;
                                                                                        if (a.code?.toLowerCase() !== s && b.code?.toLowerCase() === s) return 1;
                                                                                        return aName.localeCompare(bName, 'vi', { sensitivity: 'base' });
                                                                                    })
                                                                                    .slice(0, 10);
                                                                                if (e.key === 'ArrowDown') {
                                                                                    if (rowSearchIdx === idx && filtered.length > 0) {
                                                                                        e.preventDefault();
                                                                                        setRowActiveIndex(prev => {
                                                                                            const next = Math.min(prev + 1, filtered.length - 1);
                                                                                            if (rowSearchDropdownRef.current) {
                                                                                                const itemEl = rowSearchDropdownRef.current.children[next];
                                                                                                if (itemEl) itemEl.scrollIntoView({ block: 'nearest' });
                                                                                            }
                                                                                            return next;
                                                                                        });
                                                                                    } else {
                                                                                        e.preventDefault();
                                                                                        const nextIdx = idx + 1;
                                                                                        if (nextIdx < cart.length) {
                                                                                            document.getElementById(`row-name-${nextIdx}`)?.focus();
                                                                                        }
                                                                                    }
                                                                                } else if (e.key === 'ArrowUp') {
                                                                                    if (rowSearchIdx === idx && filtered.length > 0) {
                                                                                        e.preventDefault();
                                                                                        setRowActiveIndex(prev => {
                                                                                            const next = Math.max(prev - 1, 0);
                                                                                            if (rowSearchDropdownRef.current) {
                                                                                                const itemEl = rowSearchDropdownRef.current.children[next];
                                                                                                if (itemEl) itemEl.scrollIntoView({ block: 'nearest' });
                                                                                            }
                                                                                            return next;
                                                                                        });
                                                                                    } else {
                                                                                        e.preventDefault();
                                                                                        const prevIdx = idx - 1;
                                                                                        if (prevIdx >= 0) {
                                                                                            document.getElementById(`row-name-${prevIdx}`)?.focus();
                                                                                        } else {
                                                                                            searchInputRef.current?.focus();
                                                                                        }
                                                                                    }
                                                                                } else if (e.key === 'Enter') {
                                                                                    e.preventDefault();
                                                                                    if (filtered[rowActiveIndex]) {
                                                                                        const p = filtered[rowActiveIndex];
                                                                                        let newCart = [...cart];
                                                                                        const currentQty = newCart[idx].quantity;
                                                                                        const existingIdx = newCart.findIndex((item, i) => i !== idx && item.product_id === p.id);
                                                                                        if (existingIdx > -1) {
                                                                                            newCart[existingIdx].quantity += currentQty;
                                                                                            newCart[existingIdx].secondary_qty = newCart[existingIdx].quantity / (newCart[existingIdx].multiplier || 1);
                                                                                            newCart.splice(idx, 1);
                                                                                        } else {
                                                                                            newCart[idx] = {
                                                                                                ...newCart[idx],
                                                                                                product_id: p.id,
                                                                                                product_name: p.name,
                                                                                                unit: p.unit,
                                                                                                secondary_unit: p.secondary_unit,
                                                                                                multiplier: p.multiplier || 1,
                                                                                                price: customPrices[p.id] !== undefined ? customPrices[p.id] : p.sale_price,
                                                                                                cost_price: p.cost_price,
                                                                                                stock: p.stock,
                                                                                                is_combo: p.is_combo,
                                                                                                secondary_qty: currentQty / (p.multiplier || 1),
                                                                                                active_ingredient: p.active_ingredient
                                                                                            };
                                                                                        }
                                                                                        setCart(newCart);
                                                                                        setRowSearchIdx(null);
                                                                                    }
                                                                                    // Always focus back to main search after Enter
                                                                                    searchInputRef.current?.focus();
                                                                                } else if (e.key === 'Tab') {
                                                                                    e.preventDefault();
                                                                                    const filtered_matches = filtered.length > 0 ? filtered : [];
                                                                                    if (filtered_matches[rowActiveIndex]) {
                                                                                        const p = filtered_matches[rowActiveIndex];
                                                                                        let newCart = [...cart];
                                                                                        const currentQty = newCart[idx].quantity;
                                                                                        const existingIdx = newCart.findIndex((item, i) => i !== idx && item.product_id === p.id);
                                                                                        if (existingIdx > -1) {
                                                                                            newCart[existingIdx].quantity += currentQty;
                                                                                            newCart[existingIdx].secondary_qty = newCart[existingIdx].quantity / (newCart[existingIdx].multiplier || 1);
                                                                                            newCart.splice(idx, 1);
                                                                                            setCart(newCart);
                                                                                            setRowSearchIdx(null);

                                                                                            // Focus the merged row's quantity
                                                                                            setTimeout(() => {
                                                                                                const targetIdx = existingIdx > idx ? existingIdx - 1 : existingIdx;
                                                                                                const sec = document.getElementById(`qty-sec-${targetIdx}`);
                                                                                                if (posMode === 'Wholesale' && sec && !sec.disabled) {
                                                                                                    sec.focus();
                                                                                                    sec.select?.();
                                                                                                } else {
                                                                                                    const main = document.getElementById(`qty-main-${targetIdx}`);
                                                                                                    main?.focus();
                                                                                                    main?.select?.();
                                                                                                }
                                                                                            }, 200);
                                                                                        } else {
                                                                                            newCart[idx] = {
                                                                                                ...newCart[idx],
                                                                                                product_id: p.id,
                                                                                                product_name: p.name,
                                                                                                unit: p.unit,
                                                                                                secondary_unit: p.secondary_unit,
                                                                                                multiplier: p.multiplier || 1,
                                                                                                price: customPrices[p.id] !== undefined ? customPrices[p.id] : p.sale_price,
                                                                                                cost_price: p.cost_price,
                                                                                                stock: p.stock,
                                                                                                is_combo: p.is_combo,
                                                                                                secondary_qty: currentQty / (p.multiplier || 1),
                                                                                                active_ingredient: p.active_ingredient
                                                                                            };
                                                                                            setCart(newCart);
                                                                                            setRowSearchIdx(null);
                                                                                            setTimeout(() => {
                                                                                                const sec = document.getElementById(`qty-sec-${idx}`);
                                                                                                if (posMode === 'Wholesale' && sec && !sec.disabled) {
                                                                                                    sec.focus();
                                                                                                    sec.select?.();
                                                                                                } else {
                                                                                                    const main = document.getElementById(`qty-main-${idx}`);
                                                                                                    main?.focus();
                                                                                                    main?.select?.();
                                                                                                }
                                                                                            }, 200);
                                                                                        }
                                                                                    } else {
                                                                                        // No match, just move to quantity of current row
                                                                                        setRowSearchIdx(null);
                                                                                        setTimeout(() => {
                                                                                            const sec = document.getElementById(`qty-sec-${idx}`);
                                                                                            if (posMode === 'Wholesale' && sec && !sec.disabled) {
                                                                                                sec.focus();
                                                                                                sec.select?.();
                                                                                            } else {
                                                                                                const main = document.getElementById(`qty-main-${idx}`);
                                                                                                main?.focus();
                                                                                                main?.select?.();
                                                                                            }
                                                                                        }, 200);
                                                                                    }
                                                                                }
                                                                            }}
                                                                            id={`row-name-${idx}`}
                                                                        />
                                                                        {rowSearchIdx !== idx && (
                                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                                                                <div className={cn(
                                                                                    "px-3 py-1 rounded-xl text-[13px] font-black shadow-sm border-2 transition-all flex items-center gap-1.5",
                                                                                    item.stock < 10
                                                                                        ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50"
                                                                                        : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50"
                                                                                )}>
                                                                                    <Activity size={14} className="opacity-70" />
                                                                                    {item.stock}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {rowSearchIdx === idx && rowSearchTerm && (
                                                                            <div className="dropdown-premium min-w-[400px] mt-2">
                                                                                <div ref={rowSearchDropdownRef} className="max-h-64 overflow-y-auto no-scrollbar">
                                                                                    {products.filter(p => {
                                                                                        const s = rowSearchTerm.toLowerCase();
                                                                                        return (p.name || "").toLowerCase().includes(s) ||
                                                                                            (p.code || "").toLowerCase().includes(s) ||
                                                                                            (p.active_ingredient || "").toLowerCase().includes(s);
                                                                                    })
                                                                                        .sort((a, b) => {
                                                                                            const s = rowSearchTerm.toLowerCase();
                                                                                            const aName = (a.name || "").toLowerCase();
                                                                                            const bName = (b.name || "").toLowerCase();
                                                                                            const aStarts = aName.startsWith(s);
                                                                                            const bStarts = bName.startsWith(s);
                                                                                            if (aStarts && !bStarts) return -1;
                                                                                            if (!aStarts && bStarts) return 1;
                                                                                            if (a.code?.toLowerCase() === s && b.code?.toLowerCase() !== s) return -1;
                                                                                            if (a.code?.toLowerCase() !== s && b.code?.toLowerCase() === s) return 1;
                                                                                            return aName.localeCompare(bName, 'vi', { sensitivity: 'base' });
                                                                                        })
                                                                                        .slice(0, 10).map((p, pIdx) => (
                                                                                            <div
                                                                                                key={p.id}
                                                                                                onClick={() => {
                                                                                                    let newCart = [...cart];
                                                                                                    const currentQty = newCart[idx].quantity;
                                                                                                    const existingIdx = newCart.findIndex((item, i) => i !== idx && item.product_id === p.id);
                                                                                                    if (existingIdx > -1) {
                                                                                                        newCart[existingIdx].quantity += currentQty;
                                                                                                        newCart[existingIdx].secondary_qty = newCart[existingIdx].quantity / (newCart[existingIdx].multiplier || 1);
                                                                                                        newCart.splice(idx, 1);
                                                                                                    } else {
                                                                                                        newCart[idx] = {
                                                                                                            ...newCart[idx],
                                                                                                            product_id: p.id,
                                                                                                            product_name: p.name,
                                                                                                            unit: p.unit,
                                                                                                            secondary_unit: p.secondary_unit,
                                                                                                            multiplier: p.multiplier || 1,
                                                                                                            price: customPrices[p.id] !== undefined ? customPrices[p.id] : p.sale_price,
                                                                                                            cost_price: p.cost_price,
                                                                                                            stock: p.stock,
                                                                                                            is_combo: p.is_combo,
                                                                                                            secondary_qty: currentQty / (p.multiplier || 1),
                                                                                                            active_ingredient: p.active_ingredient
                                                                                                        };
                                                                                                    }
                                                                                                    setCart(newCart);
                                                                                                    setRowSearchIdx(null);
                                                                                                }}
                                                                                                className={cn(
                                                                                                    "dropdown-item flex justify-between items-center",
                                                                                                    pIdx === rowActiveIndex && "active"
                                                                                                )}
                                                                                            >
                                                                                                <div>
                                                                                                    <div className="font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">{p.name}</div>
                                                                                                    <div className="text-[11px] text-gray-500 uppercase font-black flex items-center gap-2">
                                                                                                        <span>{p.unit}</span>
                                                                                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                                                                        <div className={cn(
                                                                                                            "px-2.5 py-0.5 rounded-lg text-[12px] font-black border transition-all flex items-center gap-1.5 shadow-sm",
                                                                                                            pIdx === rowActiveIndex
                                                                                                                ? "bg-white !text-emerald-700 border-white"
                                                                                                                : p.stock < 10
                                                                                                                    ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50"
                                                                                                                    : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50"
                                                                                                        )}>
                                                                                                            <Activity size={12} className="opacity-70" />
                                                                                                            {p.stock}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="text-right font-black text-primary dark:text-[#d4a574]">{formatNumber(p.sale_price)}</div>
                                                                                            </div>
                                                                                        ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {item.is_combo && <span className="ml-2 bg-primary/10 text-primary dark:text-[#d4a574] text-[9px] px-1.5 py-0.5 rounded font-black uppercase">Combo</span>}
                                                                        {item.active_ingredient && (
                                                                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover/search-row:block z-[2000] w-64 bg-slate-800 text-white p-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 border border-slate-700">
                                                                                <div className="text-[10px] font-black uppercase text-[#d4a574] mb-1 tracking-widest border-b border-white/10 pb-1">Hoạt chất / Thành phần</div>
                                                                                <div className="text-xs font-bold leading-relaxed">{item.active_ingredient}</div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-center">
                                                                    <div className="font-bold text-gray-700 dark:text-gray-200">{item.unit}</div>
                                                                    {item.secondary_unit && <div className="text-[10px] text-primary dark:text-[#d4a574] font-black uppercase tracking-tighter">1 {item.secondary_unit} = {item.multiplier} {item.unit}</div>}
                                                                </td>
                                                                <td className="p-2 w-32">
                                                                    {item.secondary_unit ? (
                                                                        <div className="flex items-center gap-1 h-9 px-2 bg-amber-50/50 dark:bg-amber-900/10 border-2 border-dashed border-[#d4a574]/40 rounded-xl focus-within:border-primary dark:focus-within:border-[#4a7c59] focus-within:ring-4 focus-within:ring-primary/10 shadow-sm transition-all text-primary dark:text-[#d4a574]">
                                                                            <input
                                                                                type="number"
                                                                                className="w-full bg-transparent text-center font-black text-base outline-none placeholder:text-gray-300"
                                                                                value={item.secondary_qty}
                                                                                onFocus={(e) => e.target.select()}
                                                                                autoComplete="off"
                                                                                onChange={(e) => updateCartItem(idx, 'secondary_qty', parseFloat(e.target.value) || 0)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'ArrowDown') {
                                                                                        e.preventDefault();
                                                                                        const nextIdx = idx + 1;
                                                                                        if (nextIdx < cart.length) {
                                                                                            document.getElementById(`qty-sec-${nextIdx}`)?.focus();
                                                                                        }
                                                                                    } else if (e.key === 'ArrowUp') {
                                                                                        e.preventDefault();
                                                                                        const prevIdx = idx - 1;
                                                                                        if (prevIdx >= 0) {
                                                                                            document.getElementById(`qty-sec-${prevIdx}`)?.focus();
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                id={`qty-sec-${idx}`}
                                                                            />
                                                                            <span className="text-[10px] font-black text-gray-400 uppercase pr-2">{item.secondary_unit}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center text-gray-300 italic text-[10px] font-bold">N/A</div>
                                                                    )}
                                                                </td>
                                                                <td className="p-2 w-24 group/qty">
                                                                    <div className="relative w-full">
                                                                        <input
                                                                            type="number"
                                                                            className="w-full h-9 text-center bg-white dark:bg-slate-800 border-2 border-[#d4a574]/20 rounded-xl focus:border-primary dark:focus:border-[#4a7c59] focus:ring-4 focus:ring-primary/10 outline-none font-black text-lg text-primary dark:text-[#d4a574] shadow-sm transition-all placeholder:text-gray-300"
                                                                            value={item.quantity}
                                                                            onFocus={(e) => e.target.select()}
                                                                            autoComplete="off"
                                                                            onChange={(e) => updateCartItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                                            ref={(el) => quantityRefs.current[item.product_id] = el}
                                                                            id={`qty-main-${idx}`}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    e.preventDefault();
                                                                                    searchInputRef.current?.focus();
                                                                                } else if (e.key === 'Tab') {
                                                                                    e.preventDefault();
                                                                                    document.getElementById(`price-${idx}`)?.focus();
                                                                                } else if (e.key === 'ArrowDown') {
                                                                                    e.preventDefault();
                                                                                    const nextIdx = idx + 1;
                                                                                    if (nextIdx < cart.length) {
                                                                                        document.getElementById(`qty-main-${nextIdx}`)?.focus();
                                                                                    }
                                                                                } else if (e.key === 'ArrowUp') {
                                                                                    e.preventDefault();
                                                                                    const prevIdx = idx - 1;
                                                                                    if (prevIdx >= 0) {
                                                                                        document.getElementById(`qty-main-${prevIdx}`)?.focus();
                                                                                    } else {
                                                                                        workingQtyRef.current?.focus();
                                                                                    }
                                                                                }
                                                                            }}
                                                                        />
                                                                        <button
                                                                            tabIndex={-1}
                                                                            className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-[#8b6f47] text-white rounded-full shadow-md hover:bg-[#8b6f47]/90 active:scale-95 z-[70] transition-all hover:scale-110 border border-white dark:border-slate-800 opacity-0 group-hover/qty:opacity-100 duration-200"
                                                                            onClick={() => updateCartItem(idx, 'quantity', item.quantity * -1)}
                                                                            title="Đổi thành Trả Hàng (Âm)"
                                                                        >
                                                                            <RotateCcw size={10} strokeWidth={3} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                                <td className="p-2 text-right">
                                                                    <div className="relative group/price">
                                                                        <input
                                                                            type="text"
                                                                            className={cn(
                                                                                "w-full p-2 text-right bg-transparent border-none focus:ring-2 rounded font-bold transition-all outline-none",
                                                                                item.price < item.cost_price
                                                                                    ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 focus:ring-red-200 dark:focus:ring-red-900"
                                                                                    : "text-primary dark:text-[#d4a574] focus:ring-primary/20 dark:focus:ring-[#4a7c59]/20"
                                                                            )}
                                                                            value={formatNumber(item.price)}
                                                                            onFocus={(e) => e.target.select()}
                                                                            autoComplete="off"
                                                                            onChange={(e) => {
                                                                                const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                                                                                updateCartItem(idx, 'price', val);
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter' || e.key === 'Tab') {
                                                                                    e.preventDefault();
                                                                                    searchInputRef.current?.focus();
                                                                                } else if (e.key === 'ArrowDown') {
                                                                                    e.preventDefault();
                                                                                    const nextIdx = idx + 1;
                                                                                    if (nextIdx < cart.length) {
                                                                                        document.getElementById(`price-${nextIdx}`)?.focus();
                                                                                    }
                                                                                } else if (e.key === 'ArrowUp') {
                                                                                    e.preventDefault();
                                                                                    const prevIdx = idx - 1;
                                                                                    if (prevIdx >= 0) {
                                                                                        document.getElementById(`price-${prevIdx}`)?.focus();
                                                                                    } else {
                                                                                        workingPriceRef.current?.focus();
                                                                                    }
                                                                                }
                                                                            }}
                                                                            id={`price-${idx}`}
                                                                        />
                                                                        {item.price < item.cost_price && (
                                                                            <div className="absolute -top-10 right-0 bg-red-600 text-white text-xs px-4 py-1.5 rounded-full font-black whitespace-nowrap z-[100] flex items-center gap-1.5 shadow-xl pointer-events-none uppercase tracking-tighter border-2 border-white dark:border-red-900">
                                                                                <AlertTriangle size={14} fill="white" className="text-red-600" />
                                                                                LỖ VỐN (Gốc: {formatCurrency(item.cost_price)})
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <div className={cn("font-black text-lg transition-colors", item.quantity < 0 ? "text-red-600 dark:text-red-400" : "text-primary dark:text-[#d4a574]")}>
                                                                        {formatNumber(item.price * item.quantity)}
                                                                    </div>
                                                                    {item.quantity < 0 && (
                                                                        <span className="inline-block px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-[9px] font-black uppercase tracking-widest border border-red-200 dark:border-red-800/50 mt-1">
                                                                            Hàng trả
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            removeFromCart(idx);
                                                                        }}
                                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                                        title="Xóa dòng"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                </td>
                                                            </m.tr>
                                                        ))
                                                    )}
                                                </AnimatePresence>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Floating Bubbles - Only visible when sidebar is collapsed */}
                                <AnimatePresence>
                                    {!isSidebarExpanded && (
                                        <>
                                            {/* Floating Partner Bubble - Bottom Left */}
                                            <m.div
                                                key="partner-bubble"
                                                layout
                                                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                                                className="absolute bottom-10 left-10 z-[110] pointer-events-none"
                                            >
                                                <div
                                                    onClick={() => setIsPartnerModalOpen(true)}
                                                    className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-3xl px-6 py-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/40 flex items-center gap-4 group/partner-bubble cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 pointer-events-auto hover:bg-white dark:hover:bg-slate-800"
                                                >
                                                    <div className="w-12 h-12 bg-[#8b6f47] dark:bg-[#d4a574] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#8b6f47]/20 group-hover/partner-bubble:rotate-12 transition-transform">
                                                        <Sprout size={24} />
                                                    </div>
                                                    <div className="flex flex-col min-w-0 max-w-[280px]">
                                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted dark:text-[#d4a574]/60 mb-0.5">Đối tác / Khách hàng</div>
                                                        <div className="text-xl font-black text-primary dark:text-white uppercase leading-tight tracking-tight truncate py-0.5">
                                                            {selectedPartner ? selectedPartner.name : "Khách bán lẻ"}
                                                        </div>
                                                        {selectedPartner?.address && (
                                                            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-bold text-muted/70 dark:text-[#d4a574]/80 truncate">
                                                                <MapPin size={10} strokeWidth={2.5} className="shrink-0" />
                                                                <span className="truncate">{selectedPartner.address}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </m.div>

                                            {/* Floating Total Amount Bubble - Bottom Right */}
                                            <m.div
                                                key="total-bubble"
                                                layout
                                                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                                                className="absolute bottom-10 right-10 z-[110] pointer-events-none"
                                            >
                                                <div className="bg-[#8b6f47]/90 dark:bg-[#d4a574]/90 backdrop-blur-3xl text-white px-8 py-4 rounded-[2rem] shadow-[0_20px_50px_rgba(139,111,71,0.5)] border border-white/20 flex flex-col items-end group/total cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 pointer-events-auto hover:bg-[#8b6f47] dark:hover:bg-[#d4a574]">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Tổng cộng thanh toán</span>
                                                    </div>
                                                    <div className="text-4xl font-black tracking-tighter tabular-nums drop-shadow-lg flex items-baseline gap-1">
                                                        {formatNumber(totalAmount)}
                                                        <span className="text-sm opacity-60 font-bold">đ</span>
                                                    </div>
                                                </div>
                                            </m.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </m.div>

                    {/* Right: Summary & Actions Sidebar */}
                    <m.div
                        initial={false}
                        animate={{ width: isSidebarExpanded ? "22%" : "90px" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="flex flex-col bg-transparent pr-1 min-h-0 relative"
                    >
                        <div className="p-1 transition-colors relative flex-1 flex flex-col min-h-0">

                            <AnimatePresence mode="wait">
                                {/* Mini View Content (Visible when collapsed) */}
                                {!isSidebarExpanded && (
                                    <m.div
                                        key="mini-sidebar"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex flex-col items-center py-4 gap-8 h-full relative z-10"
                                    >
                                        {/* Partner Status Mini */}
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all shadow-lg",
                                            selectedPartner ? "bg-[#8b6f47] text-white border-white/20" : "bg-white/50 dark:bg-slate-800/50 text-muted border-white/50"
                                        )}>
                                            <Sprout size={24} />
                                        </div>

                                        {/* Main Toggle Button - Centered and Large */}
                                        <div className="flex-1 flex items-center justify-center">
                                            <m.button
                                                whileHover={{ scale: 1.15 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setIsSidebarExpanded(true)}
                                                className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-[#8b6f47] dark:text-[#d4a574] border-2 border-[#d4a574]/30 shadow-xl hover:shadow-2xl transition-all group/toggle"
                                            >
                                                <ChevronLeft size={32} strokeWidth={3} className="group-hover/toggle:-translate-x-1 transition-transform" />
                                            </m.button>
                                        </div>

                                        {/* Action Buttons Mini */}
                                        <div className="flex flex-col gap-3 pb-4">
                                            <m.button
                                                whileHover={{ scale: 1.1, y: -2 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={handleHold}
                                                disabled={cart.length === 0}
                                                className="w-14 h-14 bg-white/80 dark:bg-slate-800/80 rounded-2xl flex items-center justify-center text-[#8b6f47] border-2 border-[#d4a574]/30 shadow-md hover:shadow-lg transition-all"
                                                title="Treo đơn"
                                            >
                                                <Pause size={24} />
                                            </m.button>
                                            <m.button
                                                whileHover={{ scale: 1.1, y: -2 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleSave(false)}
                                                disabled={cart.length === 0 || loading}
                                                className="w-14 h-14 bg-white/80 dark:bg-slate-800/80 rounded-2xl flex items-center justify-center text-primary border-2 border-primary/30 shadow-md hover:shadow-lg transition-all"
                                                title="Chỉ lưu"
                                            >
                                                {loading ? <div className="w-5 h-5 border-3 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Save size={24} />}
                                            </m.button>
                                            <m.button
                                                whileHover={{ scale: 1.1, y: -2 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleSave(true)}
                                                disabled={cart.length === 0 || loading}
                                                className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 hover:shadow-primary/50 animate-pulse-smooth border border-white/20 transition-all"
                                                title="In hóa đơn"
                                            >
                                                {loading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <Printer size={28} />}
                                            </m.button>
                                        </div>
                                    </m.div>
                                )}

                                {/* Expanded View Content */}
                                {isSidebarExpanded && (
                                    <m.div
                                        key="expanded-sidebar"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.2 }}
                                        className="h-full flex flex-col relative"
                                    >
                                        {/* Side Circle Toggle Button - Premium look when expanded */}
                                        <m.button
                                            whileHover={{ scale: 1.15, x: 1 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setIsSidebarExpanded(false)}
                                            className="absolute -left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-[#8b6f47] dark:text-[#d4a574] border-2 border-[#d4a574]/30 z-[130] shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all group/toggle-open"
                                        >
                                            <ChevronRight size={18} strokeWidth={4} className="group-hover/toggle-open:translate-x-0.5 transition-transform" />
                                        </m.button>
                                        <div className="flex flex-col gap-3 relative z-10 flex-1 overflow-y-auto -mr-2 pr-2 pb-2">
                                            {/* Partner Info Section */}
                                            <div className="space-y-3">
                                                <div
                                                    onClick={() => setIsPartnerModalOpen(true)}
                                                    className="flex items-center gap-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-4 rounded-[1.5rem] border border-white/50 dark:border-white/10 shadow-sm transition-all hover:shadow-md group/partner cursor-pointer hover:bg-white/60 dark:hover:bg-slate-800/70"
                                                >
                                                    <div className="w-12 h-12 bg-gradient-to-br from-[#8b6f47]/10 to-[#8b6f47]/20 rounded-2xl shadow-inner flex items-center justify-center text-[#8b6f47] dark:text-[#d4a574] border border-white dark:border-slate-800 transition-transform group-hover/partner:scale-105 duration-500 shrink-0">
                                                        <Sprout size={24} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black text-muted dark:text-[#d4a574]/60 uppercase tracking-[0.2em]">Đối tác</div>
                                                        <div className="font-black text-primary dark:text-white text-lg uppercase leading-tight truncate group-hover/partner:text-[#8b6f47] transition-colors">{selectedPartner ? selectedPartner.name : "Khách bán lẻ"}</div>
                                                        {selectedPartner?.address && (
                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted/80 dark:text-[#d4a574]/80 truncate mt-1">
                                                                <MapPin size={8} strokeWidth={2.5} />
                                                                <span className="truncate">{selectedPartner.address}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Note Section */}
                                                <div className="relative">
                                                    <div className="absolute left-3 top-3 text-primary/40 dark:text-[#d4a574]/40 z-10"><Leaf size={16} /></div>
                                                    <textarea placeholder="Ghi chú đơn hàng..." className="w-full pl-9 p-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[1.5rem] focus:bg-white/70 dark:focus:bg-slate-800/70 focus:border-primary/50 dark:focus:border-[#4a7c59] outline-none transition-all resize-none h-14 text-xs italic dark:text-gray-300 shadow-sm hover:shadow-md" value={note} onChange={(e) => setNote(e.target.value)} />
                                                </div>
                                            </div>

                                            {/* Middle: Calculations */}
                                            <div className="flex-1 space-y-3 pt-1">
                                                <div className={cn(
                                                    "p-4 rounded-[1.5rem] border border-white/40 dark:border-white/10 shadow-sm transition-all duration-500 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl hover:shadow-md",
                                                    totalAmount > 0 ? "border-primary/30 shadow-primary/10" : ""
                                                )}>
                                                    <div className="text-[10px] font-black text-muted dark:text-[#d4a574]/80 uppercase tracking-widest mb-1 text-center">Tổng thanh toán</div>
                                                    <div className="font-black text-3xl text-primary dark:text-[#f4c430] text-center whitespace-nowrap overflow-hidden">{formatNumber(totalAmount)}</div>
                                                </div>

                                                <div className="space-y-3 px-1">
                                                    <div className="flex justify-between items-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-3 rounded-[1.2rem] border border-white/40 dark:border-white/10 shadow-sm hover:shadow-md transition-all">
                                                        <span className="text-[10px] font-black text-muted/60 dark:text-[#d4a574]/40 uppercase tracking-widest">Nợ cũ:</span>
                                                        <span className="font-black text-sm text-red-500 dark:text-red-400/80">{formatNumber(oldDebt)}</span>
                                                    </div>

                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-1.5 rounded-[1.2rem] gap-1 border border-white/40 dark:border-white/10 shadow-sm hover:shadow-md transition-all">
                                                            <button
                                                                onClick={() => setPaymentMethod('Cash')}
                                                                className={cn(
                                                                    "flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all",
                                                                    paymentMethod === 'Cash' ? "bg-primary text-white shadow-md" : "text-primary/60 hover:text-primary dark:text-[#d4a574]/60"
                                                                )}
                                                            >
                                                                TIỀN MẶT
                                                            </button>
                                                            <button
                                                                onClick={() => { setPaymentMethod('Debt'); setAmountPaid(0); }}
                                                                className={cn(
                                                                    "flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all",
                                                                    paymentMethod === 'Debt' ? "bg-[#8b6f47] text-white shadow-md" : "text-muted/60 hover:text-muted dark:text-[#d4a574]/60"
                                                                )}
                                                            >
                                                                CÔNG NỢ
                                                            </button>
                                                            <button
                                                                onClick={() => { setPaymentMethod('Pending'); setAmountPaid(0); }}
                                                                className={cn(
                                                                    "flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all",
                                                                    paymentMethod === 'Pending' ? "bg-[#f4c430] text-white shadow-md" : "text-[#f4c430]/60 hover:text-[#f4c430] dark:text-[#d4a574]/60"
                                                                )}
                                                            >
                                                                CHỜ T/T
                                                            </button>
                                                            <button
                                                                onClick={() => { setPaymentMethod('Transfer'); }}
                                                                className={cn(
                                                                    "flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all",
                                                                    paymentMethod === 'Transfer' ? "bg-blue-600 text-white shadow-md" : "text-blue-600/60 hover:text-blue-600 dark:text-[#d4a574]/60"
                                                                )}
                                                            >
                                                                CHUYỂN KHOẢN
                                                            </button>
                                                        </div>
                                                        {paymentMethod === 'Transfer' && (
                                                            <div className="relative">
                                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-400 uppercase z-10">TK Nhận:</div>
                                                                <select
                                                                    className="w-full p-2.5 pl-20 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-blue-200 dark:border-blue-900/30 rounded-[1.2rem] font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white"
                                                                    value={selectedBankAccountId}
                                                                    onChange={(e) => setSelectedBankAccountId(e.target.value)}
                                                                >
                                                                    {bankAccounts.map(acc => (
                                                                        <option key={acc.id} value={acc.id}>{acc.bank_name} - {acc.account_number}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                        <div className="relative">
                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted/40 uppercase z-10">Thanh toán:</div>
                                                            <input
                                                                type="text"
                                                                readOnly={paymentMethod === 'Cash' || paymentMethod === 'Pending'}
                                                                className={cn(
                                                                    "w-full p-2.5 pl-24 text-right rounded-[1.2rem] font-black text-xl outline-none border border-white/40 dark:border-white/10 shadow-sm bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl transition-all hover:shadow-md",
                                                                    (paymentMethod === 'Cash' || paymentMethod === 'Pending')
                                                                        ? "text-primary/40 cursor-default"
                                                                        : "text-primary dark:text-[#d4a574] focus:ring-2 focus:ring-primary/20 bg-white/70"
                                                                )}
                                                                value={formatNumber(amountPaid)}
                                                                autoComplete="off"
                                                                onChange={(e) => setAmountPaid(parseFloat(e.target.value.replace(/,/g, '')) || 0)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>

                                        {/* Bottom: Remaining & Actions */}
                                        <div className="space-y-3 pt-3">
                                            <div className="bg-gradient-to-br from-primary to-primary-hover text-white p-5 rounded-[1.5rem] flex items-center justify-between shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-95 border border-white/10 relative z-20">
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-black uppercase opacity-70 tracking-[0.1em] block mb-1">Nợ sau đơn:</span>
                                                    <span className="text-3xl font-black tracking-tighter block leading-none">{formatNumber(remainingDebt)}</span>
                                                </div>
                                                <Coins className="text-white/20 shrink-0 ml-2 animate-pulse" size={32} />
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <div className="flex gap-2">
                                                    <m.button
                                                        whileTap={{ scale: 0.95 }}
                                                        disabled={cart.length === 0}
                                                        onClick={handleHold}
                                                        className="flex-1 bg-white/80 dark:bg-slate-800/80 text-[#8b6f47] dark:text-[#d4a574] rounded-full font-black hover:bg-[#d4a574]/10 transition-all border-2 border-[#d4a574]/20 flex items-center justify-center gap-3 p-3"
                                                    >
                                                        <Pause size={20} className="shrink-0" />
                                                        <span className="text-lg uppercase tracking-widest font-black">TREO</span>
                                                    </m.button>
                                                    <m.button
                                                        whileTap={{ scale: 0.95 }}
                                                        disabled={cart.length === 0 || loading}
                                                        onClick={() => handleSave(false)}
                                                        className="flex-1 bg-white/80 dark:bg-slate-800/80 text-primary dark:text-[#d4a574] rounded-full font-black hover:bg-primary/5 transition-all border-2 border-primary/20 flex items-center justify-center gap-3 p-3"
                                                    >
                                                        <Save size={20} className="shrink-0" />
                                                        <span className="text-lg uppercase tracking-widest font-black">LƯU</span>
                                                    </m.button>
                                                </div>
                                                <m.button
                                                    whileTap={{ scale: 0.98 }}
                                                    disabled={cart.length === 0 || loading}
                                                    onClick={() => handleSave(true)}
                                                    className={cn(
                                                        "w-full bg-gradient-to-r from-primary to-primary-hover text-white rounded-full flex items-center justify-center border border-white/20 transition-all p-4 h-16 relative z-20",
                                                        !loading && cart.length > 0 ? "animate-pulse-smooth" : ""
                                                    )}
                                                >
                                                    {loading ? (
                                                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            <Printer size={28} className="shrink-0" />
                                                            <span className="text-3xl tracking-widest uppercase font-black">IN</span>
                                                        </div>
                                                    )}
                                                </m.button>
                                            </div>
                                        </div>
                                    </m.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </m.div>
                </div>

                {/* Quick Add Modals synced with management tabs */}
                <AnimatePresence>
                    {showQuickAddPartner && (
                        <PartnerEditModal
                            isOpen={showQuickAddPartner}
                            partner={{ name: quickAddName, is_customer: true, is_supplier: false }}
                            onClose={() => setShowQuickAddPartner(false)}
                            onSave={() => {
                                fetchPartners();
                                setShowQuickAddPartner(false);
                            }}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showQuickAddProduct && (
                        <ProductEditModal
                            isOpen={showQuickAddProduct}
                            product={{ name: quickAddName }}
                            onClose={() => setShowQuickAddProduct(false)}
                            onSave={() => {
                                fetchProducts();
                                setShowQuickAddProduct(false);
                            }}
                        />
                    )}
                </AnimatePresence>


                <AnimatePresence>
                    {toast && (
                        <Toast
                            message={toast.message}
                            type={toast.type}
                            onClose={() => setToast(null)}
                        />
                    )}
                </AnimatePresence>

                {/* Edit Modals */}
                <ProductEditModal
                    isOpen={isEditModalOpen}
                    product={editingProduct}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={fetchProducts}
                />

                <PartnerEditModal
                    isOpen={isPartnerEditModalOpen}
                    partner={editingPartner}
                    onClose={() => setIsPartnerEditModalOpen(false)}
                    onSave={async () => {
                        await fetchPartners();
                        if (selectedPartner) {
                            // Re-fetch partners list already occurred, now find the updated one
                            // Note: partners state might not have updated yet here, but async fetch ensures it's in progress
                            // We can use the result from an internal fetch or just wait
                            const res = await axios.get('/api/partners');
                            const updated = res.data.find(p => p.id === selectedPartner.id);
                            if (updated) setSelectedPartner(updated);
                        }
                    }}
                />



                {/* Print Preview Modal */}
                <AnimatePresence>
                    {showPreview && previewData && (
                        <Portal>
                            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 font-sans">
                                <m.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden border border-white dark:border-emerald-900/30 flex flex-col"
                                >
                                    <div className="p-6 border-b dark:border-emerald-900/30 flex justify-between items-center bg-gray-50 dark:bg-emerald-950/20">
                                        <h2 className="text-xl font-black text-gray-800 dark:text-emerald-400 uppercase tracking-tighter flex items-center gap-3">
                                            <Eye size={24} className="text-primary" />
                                            Xem trước nội dung in
                                        </h2>
                                        <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-xl transition-all"><X size={24} /></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-10 bg-gray-100 dark:bg-slate-950 flex justify-center">
                                        <div className="bg-white shadow-2xl h-fit">
                                            <PrintTemplate data={previewData} settings={settings} type="Sale" isPreview={true} />
                                        </div>
                                    </div>
                                    <div className="p-6 border-t dark:border-emerald-900/30 flex gap-4 bg-gray-50 dark:bg-emerald-950/10">
                                        <m.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setShowPreview(false)}
                                            className="flex-1 bg-white dark:bg-slate-800 text-[#8b6f47] dark:text-[#d4a574]/80 border-2 border-[#d4a574]/30 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#d4a574]/10 hover:text-[#2d5016] dark:hover:text-[#d4a574] transition-all flex items-center justify-center gap-2"
                                        >
                                            <ArrowLeft size={18} strokeWidth={2.5} />
                                            Đóng xem trước
                                        </m.button>
                                        <button onClick={() => { setShowPreview(false); handleSave(true); }} className="flex-1 bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all">Lưu & In thực tế</button>
                                    </div>
                                </m.div>
                            </div>
                        </Portal>
                    )}
                </AnimatePresence>
                <LoadingOverlay isVisible={loading && products.length === 0} message="Đang nạp dữ liệu POS..." />

                <Portal>
                    <POSHistoryPanel
                        isOpen={isHistoryPanelOpen}
                        partner={selectedPartner}
                        onClose={() => setIsHistoryPanelOpen(false)}
                        onAddToCart={(p) => {
                            const product = products.find(prod => prod.id === p.id);
                            if (product) {
                                addToCart(product);
                            }
                        }}
                    />
                </Portal>
            </div>
            {/* Print Template - Hidden on screen, shown on print */}
            {
                lastOrder && lastOrder.details && lastOrder.details.length > 0 && (
                    <div className="only-print">
                        <PrintTemplate data={lastOrder} settings={settings} type="Sale" />
                    </div>
                )
            }
        </div >
    );
}
