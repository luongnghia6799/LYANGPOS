import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

export const formatNumber = (value) => {
    if (value === undefined || value === null || isNaN(value)) return "0";
    return new Intl.NumberFormat('en-US').format(value);
}

export const formatDebt = (debt) => {
    if (debt === undefined || debt === null || debt === 0) return "CÔNG NỢ: 0";
    if (debt > 0) return `HỌ NỢ MÌNH: ${formatNumber(debt)}`;
    return `MÌNH NỢ HỌ: ${formatNumber(Math.abs(debt))}`;
}

export const isNearExpiry = (dateStr, days = 60) => {
    if (!dateStr || dateStr === '...') return false;
    try {
        let expiryDate;
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length !== 3) return false;
            expiryDate = new Date(parts[2], parts[1] - 1, parts[0]);
        } else if (dateStr.includes('-')) {
            // YYYY-MM-DD
            expiryDate = new Date(dateStr);
        } else {
            return false;
        }

        const today = new Date();
        // Reset hours
        today.setHours(0, 0, 0, 0);

        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= days;
    } catch (e) {
        return false;
    }
}

export const isExpired = (dateStr) => {
    if (!dateStr || dateStr === '...') return false;
    try {
        let expiryDate;
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length !== 3) return false;
            expiryDate = new Date(parts[2], parts[1] - 1, parts[0]);
        } else if (dateStr.includes('-')) {
            // YYYY-MM-DD
            expiryDate = new Date(dateStr);
        } else {
            return false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return expiryDate < today;
    } catch (e) {
        return false;
    }
}

export const formatDate = (dateInput) => {
    if (!dateInput) return '-';
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '-';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
    } catch (e) {
        return '-';
    }
}
