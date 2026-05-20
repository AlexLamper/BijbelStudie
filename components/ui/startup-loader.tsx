'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export function StartupLoader() {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if we've already shown the loader in this session
    const hasShown = sessionStorage.getItem('startup-loader-shown');
    if (hasShown) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem('startup-loader-shown', 'true');
    }, 1500); // 1.5 seconds for animation

    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f8f9fa] dark:bg-background"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              ease: "easeOut",
              delay: 0.1
            }}
            className="relative w-64 h-24 sm:w-80 sm:h-32 mb-8"
          >
            <div className="relative w-full h-full dark:hidden">
              <Image
                src="/images/logo-text.svg"
                alt="BijbelStudie"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="relative w-full h-full hidden dark:block">
              <Image
                src="/images/Logo-text-dark-mode.svg"
                alt="BijbelStudie"
                fill
                className="object-contain"
                priority
              />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="flex space-x-2"
          >
            <div className="w-2 h-2 bg-[#0D9488] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-[#0D9488] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-[#0D9488] rounded-full animate-bounce"></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
