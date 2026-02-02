
import React, { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Chọn...",
    className,
    searchPlaceholder = "Tìm kiếm...",
    displayValue, // function or key to display. If string, used as key. If undefined, uses option directly
    valueKey = "id", // Key to use for value
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);
    const listRef = useRef(null);

    // Filter options based on search
    const filteredOptions = options.filter(option => {
        if (!searchTerm) return true;
        const label = typeof displayValue === 'function'
            ? displayValue(option)
            : (displayValue ? option[displayValue] : option);
        return String(label).toLowerCase().includes(searchTerm.toLowerCase());
    });

    useEffect(() => {
        if (isOpen) {
            setHighlightedIndex(0);
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            setSearchTerm('');
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
        if (isOpen && listRef.current && listRef.current.children[highlightedIndex]) {
            listRef.current.children[highlightedIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [highlightedIndex, isOpen]);

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
                setIsOpen(true);
                e.preventDefault();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredOptions[highlightedIndex]) {
                    handleSelect(filteredOptions[highlightedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    const handleSelect = (option) => {
        const val = valueKey && typeof option === 'object' ? option[valueKey] : option;
        onChange(val);
        setIsOpen(false);
    };

    const getOptionLabel = (option) => {
        if (!option) return '';
        return typeof displayValue === 'function'
            ? displayValue(option)
            : (displayValue ? option[displayValue] : option);
    };

    const selectedOption = options.find(o => (valueKey && typeof o === 'object' ? o[valueKey] == value : o === value));

    return (
        <div className={cn("relative min-w-[150px]", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-xs font-black bg-emerald-50/50 dark:bg-slate-800 border-none rounded-xl outline-none dark:text-emerald-400 transition-all text-left",
                    disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-slate-700"
                )}
            >
                <span className="truncate mr-2">
                    {selectedOption ? getOptionLabel(selectedOption) : placeholder}
                </span>
                <ChevronDown size={14} className="flex-shrink-0 text-emerald-600/50" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <m.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute top-full left-0 z-50 w-full min-w-[200px] mt-1 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
                    >
                        <div className="p-2 border-b dark:border-slate-700">
                            <div className="relative">
                                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={searchPlaceholder}
                                    autoComplete="off"
                                    className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 rounded-lg outline-none border-none dark:text-white font-bold"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <ul ref={listRef} className="max-h-60 overflow-y-auto no-scrollbar py-1">
                            {/* "All" option if needed, usually handled by checking value in parent or adding a specific Option */}
                            <li
                                className={cn(
                                    "px-3 py-2 text-xs font-bold cursor-pointer transition-colors flex items-center justify-between",
                                    !value ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" : "hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300"
                                )}
                                onClick={() => handleSelect("")}
                            >
                                {placeholder}
                            </li>

                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => {
                                    const isSelected = valueKey && typeof option === 'object' ? option[valueKey] == value : option === value;
                                    const isHighlighted = index === highlightedIndex;

                                    return (
                                        <li
                                            key={valueKey && typeof option === 'object' ? option[valueKey] : index}
                                            onClick={() => handleSelect(option)}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                            className={cn(
                                                "px-3 py-2 text-xs font-bold cursor-pointer transition-colors truncate",
                                                isSelected ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" : "text-gray-700 dark:text-gray-300",
                                                isHighlighted && !isSelected && "bg-gray-50 dark:bg-slate-800"
                                            )}
                                        >
                                            {getOptionLabel(option)}
                                        </li>
                                    );
                                })
                            ) : (
                                <li className="px-3 py-4 text-center text-xs text-gray-400">Không tìm thấy kết quả</li>
                            )}
                        </ul>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
