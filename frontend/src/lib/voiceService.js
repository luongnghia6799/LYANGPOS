import axios from 'axios';
import { parseVoiceIntent, matchProduct } from './voiceParser';

/**
 * Service to manage voice aliases and phonetic matching.
 * Caches aliases in localStorage for ultra-fast response.
 */
export const VoiceService = {
    /**
     * Fetch all voice aliases from backend and save to local storage.
     */
    async syncAliases() {
        try {
            const res = await axios.get('/api/voice-aliases');
            if (res.data) {
                localStorage.setItem('voice_aliases', JSON.stringify(res.data));
                console.log('Voice Aliases synced:', res.data.length);
            }
        } catch (err) {
            console.error('Failed to sync voice aliases:', err);
        }
    },

    /**
     * Get aliases from local storage.
     */
    getAliases() {
        const saved = localStorage.getItem('voice_aliases');
        return saved ? JSON.parse(saved) : [];
    },

    /**
     * The core pipeline: Text -> Intent -> Match -> Result
     * @param {string} text - Raw transcript from STT
     * @param {Array} currentProducts - List of all products from app state
     */
    processVoiceInput(text, currentProducts) {
        if (!text) return null;

        const parsed = parseVoiceIntent(text);

        // If it's a system command (Checkout, Clear...), return immediately
        if (parsed.type === 'COMMAND') {
            return {
                ...parsed,
                success: true
            };
        }

        const aliases = this.getAliases();
        const matchedProduct = matchProduct(parsed.productName, currentProducts, aliases);

        return {
            ...parsed,
            product: matchedProduct,
            success: !!matchedProduct
        };
    },

    /**
     * Text-to-Speech feedback in Vietnamese.
     */
    speak(text) {
        if (!window.speechSynthesis) return;

        // Cancel any ongoing speech to avoid overlap
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 1.0; // Normal speed
        utterance.pitch = 1.0;

        // Attempt to find a native Vietnamese voice
        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find(v => v.lang.includes('vi') || v.name.includes('Vietnamese'));
        if (viVoice) {
            utterance.voice = viVoice;
        }

        window.speechSynthesis.speak(utterance);
    }
};


