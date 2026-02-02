import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Loader2, Droplets, Sprout, Wheat } from 'lucide-react';

import Portal from './Portal';

const LoadingOverlay = ({ isVisible, message = "Đang tải dữ liệu..." }) => {
    return (
        <Portal>
            <AnimatePresence>
                {isVisible && (
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}

                        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/20 dark:bg-slate-950/20 backdrop-blur-[2px]"
                    >
                        <m.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{
                                type: "spring",
                                damping: 25,
                                stiffness: 200,
                                mass: 0.8
                            }}
                            className="bg-white/90 dark:bg-slate-900/90 p-8 rounded-[2rem] shadow-2xl border-2 border-[#d4a574]/30 flex flex-col items-center gap-6 max-w-sm w-full mx-4 animate-shimmer-fast"
                        >
                            {/* Animated Icon System */}
                            <div className="relative w-24 h-24">
                                <m.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 border-t-4 border-r-4 border-transparent border-t-[#4a7c59] border-r-[#2d5016] rounded-full"
                                />
                                <m.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-2 border-b-4 border-l-4 border-transparent border-b-[#f4c430] border-l-[#d4a574] rounded-full opacity-60"
                                />

                                <div className="absolute inset-0 flex items-center justify-center">
                                    <m.div
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [0.5, 1, 0.5]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <Sprout size={32} className="text-[#4a7c59]" />
                                    </m.div>
                                </div>

                                {/* Floating particles */}
                                {[0, 1, 2].map((i) => (
                                    <m.div
                                        key={i}
                                        className="absolute w-2 h-2 rounded-full bg-[#f4c430]"
                                        animate={{
                                            x: [0, Math.cos(i * 120 * Math.PI / 180) * 40, 0],
                                            y: [0, Math.sin(i * 120 * Math.PI / 180) * 40, 0],
                                            opacity: [0, 1, 0],
                                            scale: [0, 1, 0]
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            delay: i * 0.5,
                                            ease: "easeInOut"
                                        }}
                                    />
                                ))}
                            </div>

                            <div className="text-center space-y-2">
                                <h3 className="text-[#2d5016] dark:text-[#4a7c59] font-black uppercase tracking-widest text-lg">
                                    Lyang POS
                                </h3>
                                <div className="flex items-center justify-center gap-2 animate-pulse-smooth">
                                    <Loader2 className="animate-spin text-[#d4a574]" size={16} />
                                    <p className="text-[#8b6f47] dark:text-[#d4a574]/80 font-bold text-sm uppercase tracking-tight">
                                        {message}
                                    </p>
                                </div>
                            </div>

                            {/* Progress line animation */}
                            <div className="w-full h-1 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <m.div
                                    className="h-full bg-gradient-to-r from-[#2d5016] via-[#f4c430] to-[#4a7c59]"
                                    animate={{
                                        x: ["-100%", "100%"]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                    style={{ width: "50%" }}
                                />
                            </div>
                        </m.div>
                    </m.div>
                )}
            </AnimatePresence>
        </Portal>
    );
};

export default LoadingOverlay;
