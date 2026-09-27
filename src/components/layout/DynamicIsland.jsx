import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, MapPin, Fingerprint } from 'lucide-react';
import { haptic, HAPTIC, playClick } from '../../lib/audio';

export default function DynamicIsland({ muted, onToggleMute, activeApp, onNavigate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [slide, setSlide] = useState(0); // 0 = Shortcut, 1 = Son

  // Close island when clicking outside
  useEffect(() => {
    if (!isExpanded) return;
    const handleClick = () => setIsExpanded(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isExpanded]);

  const handleIslandClick = (e) => {
    e.stopPropagation();
    if (!isExpanded) {
      haptic(HAPTIC.medium);
      setIsExpanded(true);
    }
  };

  const handleMute = (e) => {
    e.stopPropagation();
    onToggleMute();
    haptic(HAPTIC.light);
  };

  const handleNavigate = (e) => {
    e.stopPropagation();
    playClick();
    setIsExpanded(false);
    if (activeApp === 'MAP') {
      onNavigate('SELF');
    } else {
      onNavigate('MAP');
    }
  };

  const handleDragEnd = (e, { offset, velocity }) => {
    e.stopPropagation();
    const swipe = offset.x;
    if (swipe < -20) {
      setSlide(1);
      haptic(HAPTIC.light);
    } else if (swipe > 20) {
      setSlide(0);
      haptic(HAPTIC.light);
    }
  };

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center">
      <motion.div
        layout
        onClick={handleIslandClick}
        className="bg-black flex flex-col items-center justify-center overflow-hidden cursor-pointer shadow-2xl relative"
        style={{
          borderRadius: 32,
        }}
        initial={false}
        animate={{
          width: isExpanded ? 240 : 120,
          height: isExpanded ? 90 : 36,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.div
              key="closed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="w-full h-full flex items-center justify-center gap-2"
            >
               {/* Petite indication visuelle quand c'est fermé */}
               <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
               <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="w-full h-full flex flex-col items-center justify-center relative"
            >
              {/* Conteneur glissable (Drag) */}
              <motion.div 
                className="w-full h-full flex items-center justify-center"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
              >
                <AnimatePresence mode="wait">
                  {slide === 0 ? (
                    <motion.div
                      key="shortcut"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center justify-center gap-2 w-full h-full"
                      onClick={handleNavigate}
                    >
                      {activeApp === 'MAP' ? (
                        <>
                          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <Fingerprint size={20} className="text-[#c9a86a]" />
                          </div>
                          <span className="text-[10px] text-white/90 uppercase tracking-widest font-sans font-medium">
                            Aller à l'Identité
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <MapPin size={20} className="text-red-500" />
                          </div>
                          <span className="text-[10px] text-white/90 uppercase tracking-widest font-sans font-medium">
                            Voir la Localisation
                          </span>
                        </>
                      )}
                    </motion.div>
                  ) : (
                     <motion.div
                      key="sound"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center justify-center gap-2 w-full h-full"
                      onClick={handleMute}
                    >
                      <div className={`w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center ${muted ? 'opacity-50' : ''}`}>
                        {muted ? (
                          <VolumeX size={20} className="text-white/40" />
                        ) : (
                          <Volume2 size={20} className="text-[#c9a86a]" />
                        )}
                      </div>
                      <span className="text-[10px] text-white/90 uppercase tracking-widest font-sans font-medium">
                        {muted ? 'Audio Désactivé' : 'Audio Activé'}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Pagination dots ONLY visible when expanded, placed below the island */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex gap-2 mt-3"
          >
            <button
              onClick={(e) => { e.stopPropagation(); setSlide(0); haptic(HAPTIC.light); }}
              className="p-1"
            >
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  slide === 0 ? 'bg-white' : 'bg-white/30'
                }`}
              />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setSlide(1); haptic(HAPTIC.light); }}
              className="p-1"
            >
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  slide === 1 ? 'bg-white' : 'bg-white/30'
                }`}
              />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
