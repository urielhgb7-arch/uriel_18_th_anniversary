import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import UniverseMap from '../features/UniverseMap';
import UniverseSelf from '../features/UniverseSelf';
import { playClick, playWhoosh, haptic, HAPTIC } from '../../lib/audio';

export default function MultiverseContainer({ activeApp, isSwitcherOpen, setIsSwitcherOpen, setStage }) {
  const containerRef = useRef(null);

  const handleSelect = (appId) => {
    playClick();
    haptic(HAPTIC.medium);
    setIsSwitcherOpen(false);
    setStage(appId);
  };

  const handleCloseSwitcher = () => {
    playWhoosh();
    haptic(HAPTIC.soft);
    setIsSwitcherOpen(false);
  };

  // Les deux applications principales
  const APPS = [
    { id: 'MAP', Component: UniverseMap, name: 'Localisation' },
    { id: 'SELF', Component: UniverseSelf, name: 'Identité' }
  ];

  return (
    <div className="absolute inset-0 w-full h-full bg-black overflow-hidden">
      
      {/* Container de scroll horizontal du Switcher */}
      <div 
        ref={containerRef}
        className={`w-full h-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isSwitcherOpen 
            ? 'overflow-x-auto snap-x snap-mandatory flex items-center px-[10vw] gap-[5vw]' 
            : ''
        }`}
        style={{
          scrollPaddingLeft: '10vw'
        }}
      >
        {APPS.map(({ id, Component, name }) => {
          const isActive = activeApp === id;
          
          // Si on n'est pas dans le switcher, seule l'app active est affichée.
          // L'autre est cachée via CSS pour préserver son état (ex: WebGL, Vidéo, scroll).
          const isVisible = isSwitcherOpen || isActive;

          return (
            <motion.div
              key={id}
              
              onClick={() => isSwitcherOpen && handleSelect(id)}
              className={`
                shrink-0 relative overflow-hidden transition-all origin-center
                ${isSwitcherOpen 
                  ? 'snap-center w-[75vw] md:w-[35vw] max-w-[400px] h-[75dvh] rounded-[2.5rem] cursor-pointer shadow-2xl' 
                  : 'absolute inset-0 w-full h-screen rounded-none'
                }
              `}
              initial={false}
              animate={{
                opacity: 1,
                pointerEvents: isSwitcherOpen || isActive ? 'auto' : 'none',
                scale: isSwitcherOpen ? 1 : (isActive ? 1 : 0.95),
              }}
              style={{
                visibility: 'visible',
                zIndex: isActive && !isSwitcherOpen ? 10 : 1
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Scale child wrapper when in switcher so the 100vw/100vh app fits into the 75vw/75vh card */}
              <div 
                className="absolute origin-top-left"
                style={{
                  width: '100vw', 
                  height: '100vh',
                  transform: isSwitcherOpen ? 'scale(0.75)' : 'scale(1)', // 75vw / 100vw = 0.75
                  pointerEvents: isSwitcherOpen ? 'none' : 'auto'
                }}
              >
                <Component isActive={isActive} onSwitch={() => setIsSwitcherOpen(true)} />
              </div>

              {/* Overlay interactif quand on est dans le Switcher */}
              {isSwitcherOpen && (
                <div className="absolute inset-0 bg-black/10 hover:bg-black/0 transition-colors z-[50]" />
              )}
              
              {/* Indicateur de nom au-dessus dans le Switcher */}
              {isSwitcherOpen && (
                <div className="absolute top-4 left-0 w-full flex justify-center z-[60]">
                  <span className="bg-black/50 backdrop-blur-md text-white/90 px-4 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-medium">
                    {name}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Bouton Fermer (quand Switcher ouvert) */}
      <AnimatePresence>
        {isSwitcherOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-12 right-6 z-[100]"
          >
            <button
              onClick={handleCloseSwitcher}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 active:scale-95 transition-transform"
            >
              <X size={18} className="text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
