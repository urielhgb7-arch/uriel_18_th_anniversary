import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, MapPin, Fingerprint } from 'lucide-react';
import { haptic, HAPTIC, playClick } from '../../lib/audio';

export default function DynamicIsland({ muted, onToggleMute, activeApp, onNavigate }) {
  const [slide, setSlide] = useState(0); // 0 = Shortcut, 1 = Son

  const toggleSlide = (e) => {
    e.stopPropagation();
    setSlide((s) => (s === 0 ? 1 : 0));
    haptic(HAPTIC.light);
  };

  const handleMute = (e) => {
    e.stopPropagation();
    onToggleMute();
  };

  const handleNavigate = (e) => {
    e.stopPropagation();
    playClick();
    if (activeApp === 'MAP') {
      onNavigate('SELF');
    } else {
      onNavigate('MAP');
    }
  };

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center">
      {/* The pure black Dynamic Island pill */}
      <motion.div
        layout
        onClick={toggleSlide}
        className="bg-black flex flex-col items-center justify-center overflow-hidden cursor-pointer"
        style={{
          borderRadius: 24, // High border radius for pill shape
        }}
        initial={{ width: 140, height: 40 }}
        animate={{
          width: 150,
          height: 48,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <AnimatePresence mode="wait">
          {slide === 0 ? (
            <motion.div
              key="shortcut"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center gap-3 w-full h-full px-4"
              onClick={handleNavigate}
            >
              {activeApp === 'MAP' ? (
                <>
                  <Fingerprint size={18} className="text-[#c9a86a]" />
                  <span className="text-[11px] text-white/90 uppercase tracking-widest font-sans font-medium">
                    Identité
                  </span>
                </>
              ) : (
                <>
                  <MapPin size={18} className="text-[#60a5fa]" />
                  <span className="text-[11px] text-white/90 uppercase tracking-widest font-sans font-medium">
                    Localisation
                  </span>
                </>
              )}
            </motion.div>
          ) : (
             <motion.div
              key="sound"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center gap-3 w-full h-full px-4"
              onClick={handleMute}
            >
              {muted ? (
                <VolumeX size={18} className="text-white/40" />
              ) : (
                <Volume2 size={18} className="text-[#c9a86a]" />
              )}
              <span className="text-[11px] text-white/90 uppercase tracking-widest font-sans font-medium">
                {muted ? 'Muet' : 'Audio'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Pagination dots below the island */}
      <div className="flex gap-1.5 mt-2">
        <div
          className={`w-[4px] h-[4px] rounded-full transition-colors duration-300 ${
            slide === 0 ? 'bg-white' : 'bg-white/30'
          }`}
        />
        <div
          className={`w-[4px] h-[4px] rounded-full transition-colors duration-300 ${
            slide === 1 ? 'bg-white' : 'bg-white/30'
          }`}
        />
      </div>
    </div>
  );
}
