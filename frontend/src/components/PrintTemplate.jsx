import React, { forwardRef } from 'react';
import { formatNumber, formatDate } from '../lib/utils';
import { DEFAULT_SETTINGS } from '../lib/settings';

const PrintTemplate = forwardRef(({ data, settings = {}, type = 'Sale', isPreview = false, onUpdateSetting = null }, ref) => {
    if (!data) return null;
    const isVoucher = type === 'Receipt' || type === 'Payment';
    if (!isVoucher && (!data.details || data.details.length === 0)) return null;

    // Merge settings with defaults safely
    const s = { ...DEFAULT_SETTINGS, ...settings };

    const useBadge = s.invoice_shop_name_badge === 'true';

    const fontFamily = s.invoice_custom_font_name
        ? `'${s.invoice_custom_font_name.split('.')[0]}', sans-serif`
        : (s.invoice_font_family || 'Inter, sans-serif');

    // Dynamic @font-face for the custom font
    const customFontFaceStyle = s.invoice_custom_font_name ? (
        <style>
            {`
                @font-face {
                    font-family: '${s.invoice_custom_font_name.split('.')[0]}';
                    src: url('/uploads/fonts/${s.invoice_custom_font_name}') format('truetype');
                    font-weight: normal;
                    font-style: normal;
                    font-display: swap;
                }
            `}
        </style>
    ) : null;

    // Calculate dimensions based on paper size
    const getDimensions = () => {
        const size = s.paper_size || 'A4';
        const orientation = s.invoice_orientation || 'portrait';

        let width = '210mm';
        let height = '297mm';

        if (size === 'A5') { width = '148mm'; height = '210mm'; }
        else if (size === 'A6') { width = '105mm'; height = '148mm'; }
        else if (size === 'K80') { width = '80mm'; height = 'auto'; }
        else if (size === 'K58') { width = '58mm'; height = 'auto'; }

        if (orientation === 'landscape' && !size.startsWith('K')) {
            const temp = width;
            width = height;
            height = temp;
        }

        return { width, height };
    };

    const { width, height } = getDimensions();

    const isThermal = s.paper_size === 'K80' || s.paper_size === 'K58';

    const mt = s.invoice_use_default_margins === 'true' ? 0 : parseFloat(s.invoice_margin_top || 0);
    const mr = s.invoice_use_default_margins === 'true' ? 0 : parseFloat(s.invoice_margin_right || 0);
    const mb = s.invoice_use_default_margins === 'true' ? 0 : parseFloat(s.invoice_margin_bottom || 0);
    const ml = s.invoice_use_default_margins === 'true' ? 0 : parseFloat(s.invoice_margin_left || 0);

    const containerStyle = {
        fontFamily: fontFamily,
        fontSize: `${s.invoice_table_content_size || s.invoice_font_size}px`,
        lineHeight: s.invoice_line_spacing || '1.4',
        color: '#000',
        padding: isPreview ? `${mt}mm ${mr}mm ${mb}mm ${ml}mm` : '0 2mm 0 0',
        maxWidth: '100%',
        width: isPreview ? width : 'calc(100% - 2mm)',
        minHeight: isPreview ? height : '0',
        height: 'auto',
        backgroundColor: '#fff',
        margin: isPreview ? '0' : '0 auto',
        boxSizing: 'border-box',
        display: 'block',
        flexDirection: 'column',
        overflow: isPreview ? 'visible' : 'hidden',
        pageBreakAfter: 'auto',
        pageBreakBefore: 'auto',
        pageBreakInside: 'auto',
        position: 'relative',
        transition: 'all 0.3s ease-in-out',
        // Visual indicator for margins in preview
        boxShadow: isPreview ? '0 15px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)' : 'none',
        borderRadius: isPreview ? '2px' : '0',
        backgroundImage: (isPreview && s.invoice_use_default_margins !== 'true') ? `
            linear-gradient(to right, #f8fafc ${ml}mm, transparent ${ml}mm),
            linear-gradient(to left, #f8fafc ${mr}mm, transparent ${mr}mm),
            linear-gradient(to bottom, #f8fafc ${mt}mm, transparent ${mt}mm),
            linear-gradient(to top, #f8fafc ${mb}mm, transparent ${mb}mm)
        ` : 'none',
        backgroundBlendMode: 'multiply'
    };

    const isHeaderBadge = s.invoice_table_header_is_badge === 'true';

    // Dynamic @page style
    const pageStyle = !isPreview ? (
        <style>
            {`
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-sizing: border-box !important;
                    }
                    @page {
                        size: ${s.paper_size === 'K80' ? '80mm auto' : (s.paper_size === 'K58' ? '58mm auto' : s.paper_size || 'A4')} ${s.invoice_orientation || 'portrait'};
                        ${s.invoice_use_default_margins === 'true' ? '' : `margin: ${s.invoice_margin_top || 0}mm ${s.invoice_margin_right || 0}mm ${s.invoice_margin_bottom || 0}mm ${s.invoice_margin_left || 0}mm;`}
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                    }
                    #print-template {
                        width: calc(100% - 2mm) !important;
                        max-width: calc(100% - 2mm) !important;
                        overflow-x: hidden !important;
                    }
                    table {
                        border-collapse: ${isHeaderBadge ? 'separate' : 'collapse'} !important;
                        ${isHeaderBadge ? 'border: none !important;' : ''}
                    }
                }
            `}
        </style>
    ) : null;

    const headerStyle = {
        marginBottom: `${s.invoice_header_spacing || 10}px`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '15px',
        borderBottom: '1px solid #eee',
        paddingBottom: '10px',
        pageBreakInside: 'avoid'
    };

    const useTitleBadge = s.invoice_title_badge === 'true';

    const shopNameStyle = {
        fontSize: `${s.invoice_store_name_size || 16}px`,
        fontWeight: '900',
        textTransform: 'uppercase',
        marginBottom: '2px',
        lineHeight: '1.2',
        color: s.invoice_color_store_info || '#000'
    };

    const shopInfoStyle = {
        fontSize: `${s.invoice_store_info_size || 10}px`,
        color: s.invoice_color_store_info || '#333',
        lineHeight: '1.3'
    };

    const invoiceTitleStyle = {
        fontSize: `${s.invoice_title_size || '20'}px`,
        fontWeight: '900',
        textAlign: useTitleBadge ? 'center' : 'right',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        flexShrink: 0,
        maxWidth: useTitleBadge ? '100%' : '50%',
        color: useTitleBadge ? (s.invoice_title_badge_text_color || '#fff') : (s.invoice_color_title || '#000'),
        padding: useTitleBadge ? '5px 16px' : '0',
        backgroundColor: useTitleBadge ? (s.invoice_title_badge_bg || '#2d5016') : 'transparent',
        border: useTitleBadge ? `0.5px solid ${s.invoice_title_badge_border || '#86efac'}` : 'none',
        borderRadius: useTitleBadge ? '50px' : '0',
        display: useTitleBadge ? 'inline-block' : 'block',
        cursor: isPreview ? 'pointer' : 'default',
        transition: 'all 0.2s ease'
    };

    const infoGridStyle = {
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: '4px',
        marginBottom: '1.3mm'
    };

    const labelStyle = {
        fontWeight: 'bold',
        fontSize: `${s.invoice_customer_info_size}px`,
        color: s.invoice_color_customer_info || '#000'
    };

    const borderThickness = s.invoice_table_border_thickness === 'medium' ? '2px' : (s.invoice_table_border_thickness === 'thick' ? '3px' : '1px');
    const borderValue = `${borderThickness} ${s.invoice_table_border_style || 'solid'} #000`;

    const tableStyle = {
        width: '100%',
        borderCollapse: isHeaderBadge ? 'separate' : 'collapse',
        borderSpacing: 0,
        fontSize: `${s.invoice_table_font_size_preset === 'small' ? (parseInt(s.invoice_table_content_size) - 2) : s.invoice_table_content_size}px`,
        border: (s.invoice_table_border === 'true' && !isHeaderBadge) ? borderValue : 'none',
        marginTop: '1.3mm',
        tableLayout: 'auto',
        overflowX: 'hidden'
    };

    const headerBorderValue = s.invoice_table_header_border === 'true'
        ? `${s.invoice_table_header_border_width}px solid ${s.invoice_table_header_border_color}`
        : borderValue;

    const badgeHeaderBorder = isHeaderBadge
        ? `0.5px solid ${s.invoice_table_header_badge_border || '#86efac'}`
        : headerBorderValue;

    const thStyle = {
        borderTop: isHeaderBadge ? badgeHeaderBorder : (s.invoice_table_header_border === 'true' ? headerBorderValue : 'none'),
        borderBottom: isHeaderBadge ? badgeHeaderBorder : headerBorderValue,
        borderRight: (!isHeaderBadge && s.invoice_table_border_cols === 'true') ? borderValue : 'none',
        padding: isHeaderBadge ? `${Math.max(2, Math.floor((parseInt(s.invoice_row_padding || 4) + 4) * 0.8))}px ${s.invoice_row_padding}px` : `${Math.max(1, Math.floor(parseInt(s.invoice_row_padding || 4) * 0.8))}px ${s.invoice_row_padding}px`,
        backgroundColor: isHeaderBadge ? (s.invoice_table_header_badge_bg || '#2d5016') : (s.invoice_table_header_bg_enabled === 'true' ? (s.invoice_table_header_bg_color || '#f2f2f2') : 'transparent'),
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: `${s.invoice_table_header_size}px`,
        textAlign: 'center',
        color: isHeaderBadge ? (s.invoice_table_header_badge_text_color || '#fff') : (s.invoice_color_table_header || '#000'),
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap'
    };

    const getThStyle = (isFirst, isLast) => {
        let style = { ...thStyle };
        const isSmallPaper = s.paper_size === 'A6' || s.paper_size === 'K80' || s.paper_size === 'K58';
        const sidePadding = isSmallPaper ? '12px' : '20px';

        if (isHeaderBadge) {
            if (isFirst) {
                style.borderLeft = badgeHeaderBorder;
                style.borderTopLeftRadius = '50px';
                style.borderBottomLeftRadius = '50px';
                style.paddingLeft = sidePadding;
            }
            if (isLast) {
                style.borderRight = badgeHeaderBorder;
                style.borderTopRightRadius = '50px';
                style.borderBottomRightRadius = '50px';
                style.paddingRight = sidePadding;
            }
        } else {
            if (isFirst) style.borderLeft = s.invoice_table_border === 'true' ? borderValue : 'none';
        }
        return style;
    };

    const tdStyle = {
        borderBottom: s.invoice_table_border_rows === 'true' ? borderValue : 'none',
        borderRight: s.invoice_table_border_cols === 'true' ? borderValue : 'none',
        padding: `${s.invoice_row_padding || '4'}px`,
        verticalAlign: 'middle',
        color: s.invoice_color_table_body || '#000',
        borderLeft: (isHeaderBadge && s.invoice_table_border === 'true') ? borderValue : 'none'
    };

    const getTdStyle = (isFirst, isLast) => {
        let style = { ...tdStyle };
        if (isHeaderBadge && s.invoice_table_border === 'true') {
            if (isFirst) style.borderLeft = borderValue;
            if (isLast) style.borderRight = borderValue;
        }
        return style;
    };

    const summaryRowStyle = {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '15px',
        marginBottom: '4px',
        pageBreakInside: 'avoid'
    };

    const summaryLabelStyle = {
        fontSize: `${s.invoice_total_section_size || '14'}px`,
        fontWeight: '500',
        color: '#000',
        whiteSpace: 'nowrap'
    };

    const summaryValueStyle = {
        fontSize: `${s.invoice_total_section_size || '14'}px`,
        fontWeight: 'bold',
        minWidth: '100px',
        textAlign: 'right',
        color: '#000'
    };

    const mainTotalLabelStyle = {
        fontSize: `${s.invoice_total_line_size || s.invoice_total_section_size}px`,
        fontWeight: s.invoice_total_line_bold === 'true' ? '900' : '500',
        fontStyle: s.invoice_total_line_italic === 'true' ? 'italic' : 'normal',
        color: s.invoice_color_total_label || '#000',
        whiteSpace: 'nowrap'
    };

    const mainTotalValueStyle = {
        fontSize: `${s.invoice_total_line_size || s.invoice_total_section_size}px`,
        fontWeight: s.invoice_total_line_bold === 'true' ? '900' : 'bold',
        fontStyle: s.invoice_total_line_italic === 'true' ? 'italic' : 'normal',
        minWidth: '100px',
        textAlign: 'right',
        color: s.invoice_color_total_value || '#000'
    };

    const getInvoiceTitle = () => {
        if (type === 'Sale') return 'HÓA ĐƠN BÁN HÀNG';
        if (type === 'Purchase') return 'PHIẾU NHẬP HÀNG';
        if (type === 'History') return 'CHI TIẾT GIAO DỊCH';
        if (type === 'Receipt') return 'PHIẾU THU TIỀN';
        if (type === 'Payment') return 'PHIẾU CHI TIỀN';
        if (type === 'Report') return 'BÁO CÁO CHI TIẾT';
        return 'HÓA ĐƠN';
    };

    const partnerLabel = (type === 'Sale' || type === 'Receipt' || type === 'History') ? 'Khách hàng' : 'Nhà cung cấp';

    // Stats
    const totalQty = (data.details || []).reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const totalItems = (data.details || []).length;

    // Secondary qty totals grouped by unit
    const secondaryTotals = {};
    (data.details || []).forEach(item => {
        if (item.multiplier && item.multiplier > 1 && item.secondary_unit) {
            const whole = Math.floor(item.quantity / item.multiplier);
            if (whole > 0) {
                secondaryTotals[item.secondary_unit] = (secondaryTotals[item.secondary_unit] || 0) + whole;
            }
        }
    });
    const formattedSecondaryQtyTotals = Object.entries(secondaryTotals)
        .map(([unit, val]) => `${val} ${unit}`)
        .join(' / ');

    return (
        <>
            {pageStyle}
            {customFontFaceStyle}
            <div ref={ref} id="print-template" className={isPreview ? "preview-mode" : "only-print"} style={containerStyle}>
                {/* Visual Margin Guides for Preview */}
                {isPreview && (
                    <>
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            border: '1px dashed #cbd5e1',
                            pointerEvents: 'none',
                            zIndex: 10,
                            margin: s.invoice_use_default_margins === 'true' ? '5mm' : '0' // Show a hint for default margins
                        }} />
                        {s.invoice_use_default_margins === 'true' && (
                            <div style={{
                                position: 'absolute',
                                top: '2mm',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '9px',
                                color: '#94a3b8',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                zIndex: 11
                            }}>
                                Lề mặc định Driver (Ước lượng)
                            </div>
                        )}
                    </>
                )}
                <div style={headerStyle}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flex: 1 }}>
                        {s.invoice_show_logo === 'true' && s.invoice_logo_url && (
                            <img src={s.invoice_logo_url} alt="Logo" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                        )}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {s.invoice_show_shop_name === 'true' && (
                                <div style={{ ...shopNameStyle, marginBottom: '2px' }}>
                                    {s.shop_name}
                                </div>
                            )}
                            <div style={shopInfoStyle}>
                                {s.invoice_show_address === 'true' && s.shop_address && s.shop_address.trim() !== "" && <div>{s.shop_address}</div>}
                                {s.invoice_show_phone === 'true' && s.shop_phone && <div>ĐT: {s.shop_phone}</div>}
                                {s.invoice_show_bank_info === 'true' && (s.shop_bank || s.shop_bank_account) && (
                                    <div style={{ marginTop: '2px', borderTop: '1px dashed #ccc', paddingTop: '2px' }}>
                                        {s.shop_bank && <span>{s.shop_bank}: </span>}
                                        {s.shop_bank_account && <strong style={{ letterSpacing: '0.5px' }}>{s.shop_bank_account}</strong>}
                                        {s.shop_bank_user && <div style={{ fontSize: '0.9em', opacity: 0.8 }}>{s.shop_bank_user}</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div
                        style={{
                            ...invoiceTitleStyle,
                            marginTop: useTitleBadge ? '0' : '0'
                        }}
                        onClick={() => {
                            if (isPreview && onUpdateSetting) {
                                onUpdateSetting('invoice_title_badge', s.invoice_title_badge === 'true' ? 'false' : 'true');
                            }
                        }}
                        title={isPreview ? "Click để bật/tắt viền tiêu đề" : ""}
                        className={isPreview ? "hover:scale-[1.02] transition-transform active:scale-95" : ""}
                    >
                        {getInvoiceTitle()}
                    </div>
                </div>

                {/* General Info */}
                <div style={infoGridStyle}>
                    <div>
                        {s.invoice_show_customer_info === 'true' && (
                            <>
                                <div><span style={labelStyle}>{partnerLabel}:</span> {data.partner_name || data.partner?.name || 'Khách lẻ'}</div>
                                {(data.partner_phone || data.partner?.phone) && <div><span style={labelStyle}>Điện thoại:</span> {data.partner_phone || data.partner.phone}</div>}
                                {(data.partner_address || data.partner?.address) && <div><span style={labelStyle}>Địa chỉ:</span> {data.partner_address || data.partner.address}</div>}
                            </>
                        )}
                        {isVoucher && <div><span style={labelStyle}>Nội dung:</span> {data.note}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        {s.invoice_show_id === 'true' && <div><span style={labelStyle}>Mã Số:</span> #{data.display_id || data.id || 'Draft'}</div>}
                        {s.invoice_show_date === 'true' && <div><span style={labelStyle}>Ngày:</span> {formatDate(data.date || Date.now())}</div>}
                    </div>
                </div>

                {/* Table Area */}
                {s.invoice_show_table === 'true' && !isVoucher && (
                    <table style={tableStyle}>
                        <thead
                            onClick={() => {
                                if (isPreview && onUpdateSetting) {
                                    const newVal = s.invoice_table_header_is_badge === 'true' ? 'false' : 'true';
                                    onUpdateSetting('invoice_table_header_is_badge', newVal);
                                    // Also sync border if turning on badge for best look
                                    if (newVal === 'true') {
                                        onUpdateSetting('invoice_table_header_border', 'true');
                                    }
                                }
                            }}
                            style={{ cursor: isPreview ? 'pointer' : 'default' }}
                            title={isPreview ? "Click để bật/tắt viền (Badge) header bảng" : ""}
                            className={isPreview ? "hover:brightness-110 transition-all active:scale-[0.99]" : ""}
                        >
                            <tr>
                                {(() => {
                                    const cols = [];
                                    if (s.invoice_show_col_stt === 'true') cols.push({ id: 'stt', label: 'STT', width: s.invoice_col_stt });

                                    if (type === 'Report') {
                                        if (s.invoice_show_col_code === 'true') cols.push({ id: 'code', label: 'Mã Đơn', width: s.invoice_col_code, align: 'left' });
                                        if (s.invoice_show_col_date === 'true') cols.push({ id: 'date', label: 'Ngày', width: s.invoice_col_date });
                                        if (s.invoice_show_col_method === 'true') cols.push({ id: 'method', label: 'PTTT', width: s.invoice_col_method });
                                    } else {
                                        if (s.invoice_show_col_name === 'true') cols.push({ id: 'name', label: 'Tên hàng hóa', width: s.invoice_col_name, align: 'left' });
                                        if (s.invoice_show_col_unit === 'true') cols.push({ id: 'unit', label: 'ĐVT', width: s.invoice_col_unit });
                                        if (s.invoice_show_secondary_qty === 'true') cols.push({ id: 'sqty', label: 'SL quy đổi', width: s.invoice_col_secondary_qty_width, align: 'right' });
                                        if (s.invoice_show_col_qty === 'true') cols.push({ id: 'qty', label: 'SL', width: s.invoice_col_qty, align: 'right' });
                                        if (s.invoice_show_col_price === 'true') cols.push({ id: 'price', label: 'Đơn giá', width: s.invoice_col_price, align: 'right' });
                                    }

                                    if (s.invoice_show_col_total === 'true') cols.push({ id: 'total', label: 'Thành tiền', width: s.invoice_col_total, align: 'right' });

                                    const isHeaderBadge = s.invoice_table_header_is_badge === 'true';

                                    return cols.map((c, i) => (
                                        <th
                                            key={c.id}
                                            style={{
                                                ...getThStyle(i === 0, i === cols.length - 1),
                                                width: `${c.width}px`,
                                                textAlign: isHeaderBadge ? 'center' : (c.align || 'center')
                                            }}
                                        >
                                            {c.label}
                                        </th>
                                    ));
                                })()}
                            </tr>
                        </thead>
                        <tbody>
                            {(data.details || []).map((item, idx) => (
                                <tr key={idx} style={{ backgroundColor: (s.invoice_table_zebra_stripe === 'true' && idx % 2 === 1) ? (s.invoice_table_zebra_color || '#f9fafb') : 'transparent' }}>
                                    {(() => {
                                        const colsCount = [];
                                        if (s.invoice_show_col_stt === 'true') colsCount.push('stt');
                                        if (type === 'Report') {
                                            if (s.invoice_show_col_code === 'true') colsCount.push('code');
                                            if (s.invoice_show_col_date === 'true') colsCount.push('date');
                                            if (s.invoice_show_col_method === 'true') colsCount.push('method');
                                        } else {
                                            if (s.invoice_show_col_name === 'true') colsCount.push('name');
                                            if (s.invoice_show_col_unit === 'true') colsCount.push('unit');
                                            if (s.invoice_show_secondary_qty === 'true') colsCount.push('sqty');
                                            if (s.invoice_show_col_qty === 'true') colsCount.push('qty');
                                            if (s.invoice_show_col_price === 'true') colsCount.push('price');
                                        }
                                        if (s.invoice_show_col_total === 'true') colsCount.push('total');

                                        const isFirst = (id) => colsCount[0] === id;
                                        const isLast = (id) => colsCount[colsCount.length - 1] === id;

                                        return (
                                            <>
                                                {s.invoice_show_col_stt === 'true' && <td style={{ ...getTdStyle(isFirst('stt'), isLast('stt')), textAlign: 'center' }}>{idx + 1}</td>}

                                                {type === 'Report' ? (
                                                    <>
                                                        {s.invoice_show_col_code === 'true' && <td style={{ ...getTdStyle(isFirst('code'), isLast('code')), textAlign: 'left', fontWeight: 'bold' }}>{item.display_id || item.id}</td>}
                                                        {s.invoice_show_col_date === 'true' && <td style={{ ...getTdStyle(isFirst('date'), isLast('date')), textAlign: 'center' }}>{formatDate(item.date).split(' ')[0]}</td>}
                                                        {s.invoice_show_col_method === 'true' && (
                                                            <td style={{ ...getTdStyle(isFirst('method'), isLast('method')), textAlign: 'center' }}>
                                                                <span style={{
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: item.payment_method === 'Cash' ? '#ecfdf5' : '#fff1f2',
                                                                    color: item.payment_method === 'Cash' ? '#059669' : '#e11d48',
                                                                    fontSize: '0.9em',
                                                                    fontWeight: 'bold',
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    {item.payment_method === 'Cash' ? 'Tiền mặt' : 'Công nợ'}
                                                                </span>
                                                            </td>
                                                        )}
                                                        {s.invoice_show_col_total === 'true' && <td style={{ ...getTdStyle(isFirst('total'), isLast('total')), textAlign: 'right', fontWeight: 'bold' }}>{formatNumber(item.total_amount)}</td>}
                                                    </>
                                                ) : (
                                                    <>
                                                        {s.invoice_show_col_name === 'true' && (
                                                            <td style={{ ...getTdStyle(isFirst('name'), isLast('name')), textAlign: 'left' }}>
                                                                <div style={{ fontWeight: '500' }}>{item.product_name}</div>
                                                            </td>
                                                        )}
                                                        {s.invoice_show_col_unit === 'true' && <td style={{ ...getTdStyle(isFirst('unit'), isLast('unit')), textAlign: 'center' }}>{item.product_unit || item.unit || '-'}</td>}
                                                        {s.invoice_show_secondary_qty === 'true' && (
                                                            <td style={{ ...getTdStyle(isFirst('sqty'), isLast('sqty')), textAlign: 'right' }}>
                                                                {item.multiplier && item.multiplier > 1 ? (
                                                                    <span style={{ fontWeight: '500' }}>
                                                                        {Math.floor(item.quantity / item.multiplier)} {item.secondary_unit} {item.quantity % item.multiplier > 0 ? `+ ${item.quantity % item.multiplier}` : ''}
                                                                    </span>
                                                                ) : '-'}
                                                            </td>
                                                        )}
                                                        {s.invoice_show_col_qty === 'true' && <td style={{ ...getTdStyle(isFirst('qty'), isLast('qty')), textAlign: 'right' }}>{item.quantity}</td>}
                                                        {s.invoice_show_col_price === 'true' && <td style={{ ...getTdStyle(isFirst('price'), isLast('price')), textAlign: 'right' }}>{formatNumber(item.price)}</td>}
                                                        {s.invoice_show_col_total === 'true' && <td style={{ ...getTdStyle(isFirst('total'), isLast('total')), textAlign: 'right', fontWeight: 'bold' }}>{formatNumber(item.price * item.quantity)}</td>}
                                                    </>
                                                )}
                                            </>
                                        );
                                    })()}
                                </tr>
                            ))}
                        </tbody>
                        {(type !== 'Report') && (s.invoice_show_total_items === 'true' || s.invoice_show_total_qty === 'true' || s.invoice_show_total_secondary_qty === 'true') && (
                            <tfoot>
                                <tr>
                                    <td colSpan={100} style={{
                                        ...tdStyle,
                                        padding: '8px 10px',
                                        backgroundColor: '#fafafa',
                                        fontSize: `${s.invoice_total_summary_font_size}px`,
                                        borderBottom: 'none'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: '15px'
                                        }}>
                                            {s.invoice_show_total_items === 'true' && (
                                                <span>Tổng: <strong>{totalItems}</strong> SP</span>
                                            )}

                                            {s.invoice_show_total_qty === 'true' && (
                                                <>
                                                    <span style={{ color: '#ccc' }}>|</span>
                                                    <span>SL: <strong>{totalQty}</strong></span>
                                                </>
                                            )}

                                            {s.invoice_show_total_secondary_qty === 'true' && formattedSecondaryQtyTotals && (
                                                <>
                                                    <span style={{ color: '#ccc' }}>|</span>
                                                    <span>Quy đổi: <strong>{formattedSecondaryQtyTotals}</strong></span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                )}

                {/* Summary Section - Rewritten for independence */}
                <div style={{ marginTop: `${s.invoice_total_section_margin_top || 0}px`, display: 'flex', flexDirection: 'column', gap: '15px', pageBreakInside: 'avoid' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
                        {/* Left: Notes */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {s.invoice_show_notes === 'true' && data.note && !isVoucher && (
                                <div style={{ fontSize: '11px', fontStyle: 'italic', color: s.invoice_color_notes || '#555', borderLeft: '3px solid #ddd', paddingLeft: '8px' }}>
                                    <strong>Ghi chú:</strong> {data.note}
                                </div>
                            )}
                        </div>

                        {/* Right: Totals */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            {s.invoice_show_total_amount === 'true' && (
                                <div style={{ width: '100%' }}>
                                    {!isVoucher ? (
                                        <>
                                            <div style={{ ...summaryRowStyle, marginTop: `${s.invoice_total_line_margin_top || 0}px`, marginBottom: `${s.invoice_total_line_margin_bottom || 10}px` }}>
                                                <div style={mainTotalLabelStyle}>Tổng cộng:</div>
                                                <div style={mainTotalValueStyle}>{formatNumber(data.total_amount)}</div>
                                            </div>

                                            {(type === 'Sale' || type === 'Purchase' || type === 'Report') && (
                                                <>
                                                    {s.invoice_show_old_debt === 'true' && data.partner_id && (data.old_debt || 0) !== 0 && (
                                                        <div style={summaryRowStyle}>
                                                            <div style={summaryLabelStyle}>Nợ cũ:</div>
                                                            <div style={summaryValueStyle}>{formatNumber(data.old_debt || 0)}</div>
                                                        </div>
                                                    )}
                                                    {s.invoice_show_paid === 'true' && data.partner_id && (
                                                        <div style={summaryRowStyle}>
                                                            <div style={summaryLabelStyle}>Thanh toán:</div>
                                                            <div style={summaryValueStyle}>{formatNumber(data.amount_paid || 0)}</div>
                                                        </div>
                                                    )}
                                                    {(() => {
                                                        const balance = type === 'Sale'
                                                            ? (data.total_amount + (data.old_debt || 0)) - (data.amount_paid || 0)
                                                            : (data.old_debt || 0) - (data.total_amount - (data.amount_paid || 0));

                                                        // Sync visibility with 'Old Debt' as requested: Hide both if old debt is 0
                                                        if (s.invoice_show_balance === 'true' && data.partner_id && (data.old_debt || 0) !== 0) {
                                                            return (
                                                                <div style={{ ...summaryRowStyle, marginTop: '5px', borderTop: '1px double #000', paddingTop: '5px' }}>
                                                                    <div style={{ ...summaryLabelStyle, fontSize: `${s.invoice_total_balance_size}px`, fontWeight: '900' }}>Còn lại:</div>
                                                                    <div style={{ ...summaryValueStyle, fontSize: `${s.invoice_total_balance_size}px`, fontWeight: '900' }}>
                                                                        {formatNumber(balance)}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{ borderTop: '1px solid #000', paddingTop: '8px' }}>
                                            <div style={{ ...summaryLabelStyle, fontSize: '18px', fontWeight: 'bold' }}>
                                                Số tiền {type === 'Receipt' ? 'thu' : 'chi'}: {formatNumber(data.amount)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Signatures */}
                {s.invoice_show_signatures === 'true' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px', textAlign: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Khách hàng</div>
                            <div style={{ fontSize: '10px', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                        </div>
                        <div>
                            <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Người lập phiếu</div>
                            <div style={{ fontSize: '10px', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                        </div>
                    </div>
                )}

                {/* Thank You Message - Independent block */}
                {s.invoice_show_thank_you === 'true' && (
                    <div style={{
                        textAlign: 'center',
                        marginTop: '25px',
                        paddingTop: '15px',
                        borderTop: '1px dashed #eee',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        fontStyle: 'italic',
                        color: s.invoice_color_footer || '#444'
                    }}>
                        {s.invoice_thank_you_message || 'Cảm ơn Quý Khách & Hẹn Gặp Lại!'}
                    </div>
                )}
            </div>
        </>
    );

});

export default PrintTemplate;
