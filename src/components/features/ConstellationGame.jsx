import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronDown } from 'lucide-react';
import { toPng } from 'html-to-image';
import content from '../content.json';

export default function ConstellationGame() {
  const [discovered, setDiscovered] = useState(0); // Index of current star
  const [showExport, setShowExport] = useState(false);
  const containerRef = useRef(null);
  
  const traits = content.constellationTraits;
  const isComplete = discovered === traits.length;

  const constellationPaths = [
    "M 5 30 L 15 70", // V left
    "M 15 70 L 25 30", // V right
    "M 40 30 A 10 20 0 1 0 40 70 A 10 20 0 1 0 40 30", // O full
    "M 55 30 L 55 60", // U left
    "M 55 60 A 10 10 0 0 0 75 60 L 75 30", // U arc & right
    "M 85 30 L 85 70", // H left
    "M 85 50 L 95 50 M 95 30 L 95 70" // H middle & right
  ];

  const handleStarClick = (index) => {
    if (index === discovered) {
      setDiscovered(prev => prev + 1);
      if (index === traits.length - 1) {
        setTimeout(() => setShowExport(true), 1500);
      }
    }
  };

  const exportImage = async () => {
    if (containerRef.current) {
      const dataUrl = await toPng(containerRef.current, { quality: 0.95 });
      const link = document.createElement('a');
      link.download = 'uriel-constellation.png';
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col">
      {/* Container to be exported */}
      <div 
        ref={containerRef}
        className="relative flex-1 w-full h-full flex flex-col items-center justify-center p-6 bg-transparent"
      >
        {/* En-tête */}
        <div className="absolute top-20 left-0 w-full text-center z-10 pointer-events-none">
          <h2 className="text-white/60 text-xs tracking-[0.2em] uppercase mb-1">
            {isComplete ? 'Constellation Complète' : `Découverte : ${discovered}/${traits.length}`}
          </h2>
          <h1 className="text-2xl font-bold text-white tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            URIEL
          </h1>
        </div>

        {/* SVG Drawing Area */}
        <div className="relative w-full max-w-lg aspect-square mt-10">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            {/* Lignes de connexion (dessinées au fur et à mesure) */}
            {constellationPaths.map((path, i) => {
              const isVisible = discovered > i;
              return (
                <motion.path
                  key={`path-${i}`}
                  d={path}
                  fill="transparent"
                  stroke="url(#glowGradient)"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ 
                    pathLength: isVisible ? 1 : 0, 
                    opacity: isVisible ? 1 : 0 
                  }}
                  transition={{ duration: 1.5, ease: 'easeInOut' }}
                  style={{ filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.8))' }}
                />
              );
            })}

            <defs>
              <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd700" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>

            {/* Étoiles (nœuds) */}
            {traits.map((trait, i) => {
              const isDiscovered = discovered > i;
              const isCurrent = discovered === i;
              return (
                <g key={`star-${i}`} onClick={() => handleStarClick(i)} className={isCurrent ? 'cursor-pointer' : 'pointer-events-none'}>
                  {/* Halo pulse si current */}
                  {isCurrent && (
                    <motion.circle
                      cx={trait.x}
                      cy={trait.y}
                      r="4"
                      fill="rgba(255,215,0,0.3)"
                      animate={{ scale: [1, 2.5, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  {/* L'étoile elle-même */}
                  <motion.circle
                    cx={trait.x}
                    cy={trait.y}
                    r="1.5"
                    fill={isDiscovered || isCurrent ? '#ffd700' : '#ffffff'}
                    opacity={isDiscovered || isCurrent ? 1 : 0.2}
                    animate={{ r: isDiscovered || isCurrent ? 2 : 1 }}
                    style={{ filter: (isDiscovered || isCurrent) ? 'drop-shadow(0 0 6px #ffd700)' : 'none' }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Textes des traits (affichés un par un) */}
          <AnimatePresence>
            {traits.map((trait, i) => (
              discovered > i && (
                <motion.div
                  key={`text-${i}`}
                  className="absolute"
                  style={{ left: `${trait.x}%`, top: `${trait.y}%`, marginLeft: '12px', marginTop: '-12px' }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                    <p className="text-yellow-400 text-[10px] font-bold uppercase tracking-wider">{trait.title}</p>
                    <p className="text-white/70 text-[9px]">{trait.desc}</p>
                  </div>
                </motion.div>
              )
            ))}
          </AnimatePresence>
        </div>

        {/* Bouton Export */}
        <AnimatePresence>
          {showExport && (
            <motion.div
              className="absolute bottom-32 z-20 flex flex-col items-center gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button 
                onClick={exportImage}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3 rounded-full text-sm font-medium shadow-[0_0_30px_rgba(74,0,224,0.6)] transition-transform hover:scale-105 active:scale-95"
              >
                <Download size={16} />
                Sauvegarder ma carte VIP
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Indicateur de Scroll */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              className="absolute bottom-8 text-white/50 animate-bounce flex flex-col items-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
            >
              <span className="text-[10px] uppercase tracking-widest mb-2 font-space">Continuer</span>
              <ChevronDown size={24} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Watermark (visible uniquement sur export/écran) */}
        <div className="absolute bottom-4 w-full text-center opacity-30 pointer-events-none">
          <p className="text-white text-[10px] uppercase tracking-widest font-space">VIP Experience • Uriel 18th</p>
        </div>
      </div>
    </div>
  );
}
