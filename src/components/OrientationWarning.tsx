import React, { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OrientationWarning: React.FC = () => {
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            // Check if it's a mobile device (width <= 1024) AND in landscape mode (width > height)
            if (window.innerWidth <= 1024 && window.innerWidth > window.innerHeight) {
                setShowWarning(true);
            } else {
                setShowWarning(false);
            }
        };

        // Initial check
        checkOrientation();

        // Listen for window resize and orientation change events
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    return (
        <AnimatePresence>
            {showWarning && (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
                    exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/80 text-white p-6 text-center overflow-hidden"
                >
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#04c1fa22_1px,transparent_1px),linear-gradient(to_bottom,#04c1fa22_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                    <motion.div
                        animate={{ rotate: [0, -90, -90, 0, 0] }}
                        transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
                        className="mb-8 relative z-10"
                    >
                        <Smartphone className="w-24 h-24 text-[#04c1fa] drop-shadow-[0_0_15px_rgba(4,193,250,0.5)]" />
                    </motion.div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="relative z-10 max-w-sm"
                    >
                        <h2 className="text-2xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                            PLEASE ROTATE DEVICE
                        </h2>
                        <p className="text-slate-300 font-mono text-sm leading-relaxed border border-[#04c1fa]/20 bg-[#020617]/50 p-4 rounded-lg">
                            The AlgoLib visualizer engine requires a <span className="text-[#04c1fa] font-bold">portrait</span> orientation for optimal viewing on mobile devices.
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OrientationWarning;
