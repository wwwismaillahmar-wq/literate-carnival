import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';

interface CinematicIntroProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export function CinematicIntro({ forceShow = false, onClose }: CinematicIntroProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      return;
    }
    const hasSeen = sessionStorage.getItem('aslan-intro-seen');
    if (!hasSeen) {
      setVisible(true);
      sessionStorage.setItem('aslan-intro-seen', 'true');
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3800);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleDismiss = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d0f12] text-center px-4 overflow-hidden"
          dir="rtl"
        >
          {/* Subtle Ambient Gold Glow */}
          <div className="absolute w-[500px] h-[500px] rounded-full bg-[#c5a059]/15 blur-[140px] pointer-events-none animate-pulse-gold" />

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-6 left-6 p-2 text-[#a8abad] hover:text-[#c5a059] transition-colors rounded-full hover:bg-white/5"
            aria-label="تخطي المقدمة"
          >
            <X className="w-6 h-6" />
          </button>

          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="relative z-10 flex flex-col items-center max-w-xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#c5a059]/30 bg-[#c5a059]/10 text-[#c5a059] text-xs font-semibold tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>علامة تجمع الحرفة والجودة</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold text-[#f5f2ea] tracking-wider mb-3">
              <span className="text-[#c5a059] font-latin-display">ASLAN</span> MODELLING
            </h1>

            <p className="text-lg md:text-xl text-[#c5a059] font-medium tracking-widest mb-6">
              تنجيد • خياطة • تفصيل
            </p>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 140 }}
              transition={{ delay: 0.6, duration: 0.9 }}
              className="h-[2px] bg-gradient-to-r from-transparent via-[#c5a059] to-transparent mb-6"
            />

            <p className="text-sm text-[#a8abad] max-w-md leading-relaxed mb-8">
              أهلاً بكم في المنصة الرسمية لـ ASLAN MODELLING بالجزائر — أثاث مخصص، تجهيز المساحات، وأكاديمية التكوين الحرفي.
            </p>

            <button
              onClick={handleDismiss}
              className="px-6 py-2.5 rounded-full bg-[#c5a059] text-[#111417] font-bold text-sm hover:bg-[#d6b36e] transition-transform active:scale-95 shadow-lg shadow-[#c5a059]/20"
            >
              دخول المنصة الرئيسية
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
