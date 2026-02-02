import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function FontLoader() {
    const [fonts, setFonts] = useState([]);

    useEffect(() => {
        const fetchFonts = async () => {
            try {
                const res = await axios.get('/api/fonts');
                setFonts(res.data);
            } catch (err) {
                console.error("Error fetching fonts for loader", err);
            }
        };
        fetchFonts();
    }, []);

    useEffect(() => {
        if (fonts.length > 0) {
            const styleId = 'custom-fonts-style';
            let style = document.getElementById(styleId);
            if (!style) {
                style = document.createElement('style');
                style.id = styleId;
                document.head.appendChild(style);
            }

            style.innerHTML = fonts.map(font => {
                const fontName = font.split('.')[0];
                const format = font.toLowerCase().endsWith('.ttf') ? 'truetype' : 'opentype';
                return `
                    @font-face {
                        font-family: '${fontName}';
                        src: url('/uploads/fonts/${font}') format('${format}');
                        font-display: swap;
                    }
                `;
            }).join('\n');
        }
    }, [fonts]);

    return null; // This component doesn't render anything
}
