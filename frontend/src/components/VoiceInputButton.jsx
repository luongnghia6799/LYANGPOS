import React, { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X } from 'lucide-react';
import { VoiceService } from '../lib/voiceService';

const VoiceInputButton = ({ onCommand, currentProducts }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(true);
    const [showTranscript, setShowTranscript] = useState(false);

    // Initialize Speech Recognition
    const [recognition, setRecognition] = useState(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const reco = new SpeechRecognition();
        reco.continuous = false;
        reco.interimResults = true;
        reco.lang = 'vi-VN';

        reco.onstart = () => {
            setIsListening(true);
            setShowTranscript(true);
            setTranscript('Đang nghe...');
        };

        reco.onresult = (event) => {
            const current = event.resultIndex;
            const result = event.results[current];
            const text = result[0].transcript;
            setTranscript(text);

            if (result.isFinal) {
                // Process final result
                const resultData = VoiceService.processVoiceInput(text, currentProducts);
                if (onCommand) {
                    onCommand(resultData);
                }
                // Auto-close overlay after processing
                setTimeout(() => {
                    setShowTranscript(false);
                    setIsListening(false);
                }, 1500);
            }
        };

        reco.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setTranscript('Lỗi: ' + event.error);
            setIsListening(false);
            setTimeout(() => setShowTranscript(false), 2000);
        };

        reco.onend = () => {
            setIsListening(false);
        };

        setRecognition(reco);
    }, [currentProducts, onCommand]);

    const toggleListen = () => {
        if (isListening) {
            recognition?.stop();
        } else {
            setTranscript('');
            recognition?.start();
        }
    };

    if (!isSupported) return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center pointer-events-none">

            {/* Realtime Transcript Overlay */}
            <AnimatePresence>
                {showTranscript && (
                    <m.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="mb-8 px-8 py-4 rounded-3xl backdrop-blur-xl bg-white/70 border border-white/20 shadow-2xl flex flex-col items-center min-w-[300px] max-w-[80vw] pointer-events-auto"
                        style={{ boxShadow: '0 20px 40px -10px rgba(45, 80, 22, 0.3)' }}
                    >
                        {/* Waveform Animation */}
                        {isListening && (
                            <div className="flex items-center justify-center gap-1 h-8 mb-3">
                                {[...Array(8)].map((_, i) => (
                                    <m.div
                                        key={i}
                                        animate={{
                                            height: [10, Math.random() * 30 + 10, 10],
                                        }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 0.5 + Math.random() * 0.5,
                                            ease: "easeInOut"
                                        }}
                                        className="w-1 bg-leaf-green rounded-full"
                                        style={{ backgroundColor: 'var(--primary-color)' }}
                                    />
                                ))}
                            </div>
                        )}

                        <p className="text-2xl font-bold text-primary text-center leading-tight">
                            {transcript}
                        </p>

                        <button
                            onClick={() => setShowTranscript(false)}
                            className="mt-2 text-text-muted hover:text-red-500 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </m.div>
                )}
            </AnimatePresence>

            {/* Giant Mic Button */}
            <div className="relative pointer-events-auto">
                {/* Pulse Animations */}
                <AnimatePresence>
                    {isListening && (
                        <>
                            <m.div
                                initial={{ scale: 1, opacity: 0.5 }}
                                animate={{ scale: 1.8, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="absolute inset-0 rounded-full bg-primary/20"
                                style={{ backgroundColor: 'var(--primary-color)', opacity: 0.3 }}
                            />
                            <m.div
                                initial={{ scale: 1, opacity: 0.5 }}
                                animate={{ scale: 1.4, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                                className="absolute inset-0 rounded-full bg-primary/20"
                                style={{ backgroundColor: 'var(--primary-color)', opacity: 0.3 }}
                            />
                        </>
                    )}
                </AnimatePresence>

                <m.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleListen}
                    className={`
            w-20 h-20 rounded-full flex items-center justify-center shadow-xl
            transition-all duration-500 relative z-10
            ${isListening ? 'bg-accent-bright text-primary' : 'bg-primary text-white'}
          `}
                    style={{
                        backgroundColor: isListening ? 'var(--accent-bright)' : 'var(--primary-color)',
                        color: isListening ? 'var(--primary-color)' : 'white',
                        boxShadow: isListening ? '0 0 30px var(--accent-bright)' : '0 10px 25px rgba(45, 80, 22, 0.4)'
                    }}
                >
                    {isListening ? (
                        <div className="relative">
                            <Mic size={36} strokeWidth={2.5} />
                            <m.div
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-accent-bright"
                            />
                        </div>
                    ) : (
                        <Mic size={36} strokeWidth={2.5} />
                    )}
                </m.button>
            </div>
        </div>
    );
};

export default VoiceInputButton;
