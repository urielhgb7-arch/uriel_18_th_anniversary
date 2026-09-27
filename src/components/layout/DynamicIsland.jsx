import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Map, Fingerprint } from 'lucide-react';
import { haptic, HAPTIC, playClick } from '../../lib/audio';

// activeApp peut être 'MAP', 'SELF', ou 'CONTACT'
export default function DynamicIsland({ muted, onToggleMute, activeApp, onNavigate }) {
  const [slide, setSlide] = useState(0); // 0 = Shortcut, 1 = Son

  const toggleSlide = (e) => {
    e.stopPropagation();
    setSlide(s => (s === 0 ? 1 : 0));
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
      <motion.div
        layout
        initial={{ borderRadius: 32 }}
        animate={{
          width: 140,
          height: 44,
          borderRadius: 22,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="glass-nexus bg-black/80 shadow-2xl flex items-center justify-center overflow-hidden cursor-pointer"
        style={{ 
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
        onClick={toggleSlide}
      >
        <AnimatePresence mode="wait">
          {slide === 0 ? (
            <motion.div
              key="shortcut"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center gap-2 w-full px-4 h-full"
              onClick={handleNavigate}
            >
              {activeApp === 'MAP' ? (
                <>
                  <Fingerprint size={16} className="text-gold" />
                  <span className="text-xs text-white/80 uppercase tracking-wider font-sans">Identité</span>
                </>
              ) : (
                <>
                  <Map size={16} className="text-blue-400" />
                  <span className="text-xs text-white/80 uppercase tracking-wider font-sans">Carte</span>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="sound"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center gap-3 w-full px-4 h-full"
              onClick={handleMute}
            >
              {muted ? <VolumeX size={16} className="text-white/40" /> : <Volume2 size={16} className="text-gold" />}
              <span className="text-xs text-white/80 uppercase tracking-wider font-sans">
                {muted ? 'Muet' : 'Audio'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Dots for pagination inside island */}
      <div className="flex gap-1.5 mt-2">
        <div className={`w-1 h-1 rounded-full transition-colors ${slide === 0 ? 'bg-white' : 'bg-white/30'}`} />
        <div className={`w-1 h-1 rounded-full transition-colors ${slide === 1 ? 'bg-white' : 'bg-white/30'}`} />
      </div>
    </div>
  );
}
