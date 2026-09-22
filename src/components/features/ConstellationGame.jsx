import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, MapPin } from 'lucide-react';
import { toPng } from 'html-to-image';
import content from '../content.json';

export default function ConstellationGame({ onSwitchToMap }) {
  const [discovered, setDiscovered] = useState(0); // Index of current star
  const [showExport, setShowExport] = useState(false);
  const containerRef = useRef(null);
  
  const traits = content.constellationTraits;
  const isComplete = discovered === traits.length;

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
    <div className="fixed inset-0 bg-[#0a0f1c] overflow-hidden flex flex-col">
      {/* Container to be exported */}
      <div 
        ref={containerRef}
        className="relative flex-1 w-full h-full flex flex-col items-center justify-center p-6 bg-[#0a0f1c]"
      >
        {/* En-tête */}
        <div className="absolute top-10 left-0 w-full text-center z-10">
          <h2 className="text-white/60 text-xs tracking-[0.2em] uppercase mb-1">
            {isComplete ? 'Constellation Complète' : `Découverte : ${discovered}/${traits.length}`}
          </h2>
          <h1 className="text-2xl font-bold text-white tracking-widest" style={{ fontFamily: "'Syne', sans-serif" }}>
            URIEL
          </h1>
        </div>

        {/* SVG Drawing Area */}
        <div className="relative w-full max-w-md aspect-square mt-10">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            {/* Lignes de connexion (dessinées au fur et à mesure) */}
            {traits.map((trait, i) => {
              if (i === 0) return null;
              const prev = traits[i - 1];
              const isVisible = discovered > i - 1;
              return (
                <motion.line
                  key={`line-${i}`}
                  x1={prev.x}
                  y1={prev.y}
                  x2={trait.x}
                  y2={trait.y}
                  stroke="rgba(255,215,0,0.4)"
                  strokeWidth="0.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: isVisible ? 1 : 0 }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                />
              );
            })}

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
                      fill="rgba(255,215,0,0.2)"
                      animate={{ scale: [1, 2.5, 1], opacity: [0.5, 0, 0.5] }}
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
                    animate={{ r: isDiscovered ? 2 : 1.5 }}
                    style={{ filter: isDiscovered ? 'drop-shadow(0 0 4px #ffd700)' : 'none' }}
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
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg shadow-xl">
                    <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider">{trait.title}</p>
                    <p className="text-white/70 text-[10px] whitespace-nowrap">{trait.desc}</p>
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
              className="absolute bottom-24 z-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button 
                onClick={exportImage}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3 rounded-full text-sm font-medium shadow-[0_0_20px_rgba(74,0,224,0.4)]"
              >
                <Download size={16} />
                Sauvegarder ma carte VIP
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Watermark (visible uniquement sur export/écran) */}
        <div className="absolute bottom-6 w-full text-center opacity-30">
          <p className="text-white text-[10px] uppercase tracking-widest">VIP Experience • Uriel 18th</p>
        </div>
      </div>

      {/* Navigation Flottante */}
      <button 
        onClick={onSwitchToMap}
        className="absolute bottom-6 right-6 w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-white z-50 shadow-lg"
      >
        <MapPin size={20} />
      </button>
    </div>
  );
}
