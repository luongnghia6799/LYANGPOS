import Fuse from 'fuse.js';

const VN_NUMBERS = {
    'không': 0, 'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'tư': 4, 'năm': 5, 'lăm': 5,
    'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9, 'mười': 10, 'mươi': 10, 'trăm': 100,
    'ngàn': 1000, 'nghìn': 1000, 'mốt': 1
};

const VN_UNITS = [
    'chai', 'bao', 'gói', 'hũ', 'can', 'lít', 'lit', 'ml', 'kg', 'ký', 'ki lô', 'gam', 'gram',
    'viên', 'vỉ', 'ống', 'thùng', 'cặp', 'bộ', 'xấp', 'cuộn', 'tờ'
];

/**
 * Convert Vietnamese number words to digits if possible.
 * Simple implementation for basic quantities.
 */
function normalizeNumbers(text) {
    let result = text.toLowerCase();
    // Very basic word to digit conversion for small numbers
    Object.keys(VN_NUMBERS).forEach(word => {
        // Only replace if it's a standalone word
        const reg = new RegExp(`\\b${word}\\b`, 'g');
        if (VN_NUMBERS[word] < 10) {
            result = result.replace(reg, VN_NUMBERS[word]);
        }
    });
    return result;
}

const SYSTEM_COMMANDS = {
    CLEAR_CART: ['xóa đơn', 'xóa hết', 'hủy đơn', 'làm mới'],
    CHECKOUT: ['thanh toán', 'tính tiền', 'chốt đơn'],
    HOLD_ORDER: ['lưu đơn', 'tạm giữ', 'đợi tí'],
};

/**
 * Extracts quantity, unit and product name from voice transcript.
 */
export function parseVoiceIntent(text) {
    let cleanText = normalizeNumbers(text.toLowerCase().trim());
    let match;

    // Check for System Commands first
    for (const [intent, keywords] of Object.entries(SYSTEM_COMMANDS)) {
        if (keywords.some(k => cleanText.includes(k))) {
            return { type: 'COMMAND', command: intent };
        }
    }

    // Pattern: [Partner Keyword] [Name]
    const partnerPattern = /^(bán cho|khách là|tên là)\s+(.+)$/i;
    match = cleanText.match(partnerPattern);
    if (match) {
        return {
            type: 'SET_PARTNER',
            partnerName: match[2].trim()
        };
    }

    // Detect negative adjustment keywords
    let multiplier = 1;
    const negKeywords = ['bớt', 'trừ', 'giảm', 'xóa bớt'];
    for (const kw of negKeywords) {
        if (cleanText.startsWith(kw)) {
            multiplier = -1;
            cleanText = cleanText.replace(kw, '').trim();
            break;
        }
    }

    // Remove filler words
    const fillers = ['bán cho em', 'bán cho anh', 'bán cho chú', 'lấy cho', 'thêm', 'cho', 'mình mua'];
    fillers.forEach(f => {
        if (cleanText.startsWith(f)) {
            cleanText = cleanText.replace(f, '').trim();
        }
    });

    // Pattern: [Quantity] [Unit] [Product Name]
    const unitsPattern = VN_UNITS.join('|');
    const fullPattern = new RegExp(`^(\\d+)\\s+(${unitsPattern})\\s+(.+)$`, 'i');

    // Pattern: [Quantity] [Product Name]
    const simplePattern = new RegExp(`^(\\d+)\\s+(.+)$`, 'i');

    match = cleanText.match(fullPattern);
    if (match) {
        return {
            quantity: parseFloat(match[1]) * multiplier,
            unit: match[2],
            productName: match[3].trim()
        };
    }

    match = cleanText.match(simplePattern);
    if (match) {
        return {
            quantity: parseFloat(match[1]) * multiplier,
            unit: null,
            productName: match[2].trim()
        };
    }

    // Pattern: [Quantity] [Unit] ONLY (Adjustment for last item)
    const adjustPattern = new RegExp(`^(\\d+)\\s+(${unitsPattern})$`, 'i');
    match = cleanText.match(adjustPattern);
    if (match) {
        return {
            type: 'ADJUST',
            quantity: parseFloat(match[1]) * multiplier,
            unit: match[2]
        };
    }


    // Fallback: Just return text as product name
    return {
        quantity: 1,
        unit: null,
        productName: cleanText
    };
}


/**
 * Phonetic/Fuzzy matching using Fuse.js
 */
export function matchProduct(searchTerm, products, aliases) {
    if (!searchTerm) return null;

    // Combine products and aliases for searching
    // We want to return the actual product object.
    const searchPool = [
        ...products.map(p => ({ ...p, searchType: 'product', searchField: p.name })),
        ...aliases.map(a => ({ ...a, searchType: 'alias', searchField: a.alias_name }))
    ];

    const options = {
        keys: ['searchField'],
        threshold: 0.3, // More precise matching
        distance: 100,

        includeScore: true
    };

    const fuse = new Fuse(searchPool, options);
    const results = fuse.search(searchTerm);

    if (results.length > 0) {
        const bestMatch = results[0];
        if (bestMatch.item.searchType === 'alias') {
            // Find the real product
            return products.find(p => p.id === bestMatch.item.product_id);
        }
        return bestMatch.item;
    }

    return null;
}
