import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint } from 'lucide-react';
import { playBraam, playSnap, haptic, HAPTIC } from '../../lib/audio';

const SEEN_KEY = 'uriel.snap.seen';

function CircularText({ text, radius, speed, reverse }) {
  const pathId = `circle-${radius}`;
  const d = `M ${radius + 20}, ${radius + 20} m -${radius}, 0 a ${radius},${radius} 0 1,1 ${radius * 2},0 a ${radius},${radius} 0 1,1 -${radius * 2},0`;
  
  return (
    <motion.svg 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      width={radius * 2 + 40} 
      height={radius * 2 + 40}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
    >
      <defs>
        <path id={pathId} d={d} />
      </defs>
      <text fill="rgba(255,255,255,0.25)" style={{ fontSize: '13px', letterSpacing: '0.15em', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
        <textPath href={`#${pathId}`} startOffset="0%">
          {(text + ' • ').repeat(8)}
        </textPath>
      </text>
    </motion.svg>
  );
}

export default function Gauntlet({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [flash, setFlash] = useState(false);
  const intervalRef = useRef(null);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  // Option: accélérer si déjà vu
  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) === '1') {
        // Optionnel : modifier la logique pour les utilisateurs récurrents
      }
    } catch {}
  }, []);

  const handlePointerDown = () => {
    if (done) return;
    haptic(HAPTIC.tap);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + 2.5; // ~2 secondes
        if (next >= 100) {
          clearInterval(intervalRef.current);
          triggerComplete();
          return 100;
        }
        return next;
      });
    }, 50);
  };

  const handlePointerUp = () => {
    if (done) return;
    clearInterval(intervalRef.current);
    if (progress < 100) {
      setProgress(0);
      haptic(HAPTIC.soft);
    }
  };

  const triggerComplete = () => {
    if (done) return;
    setDone(true);
    setFlash(true);
    playSnap();
    haptic(HAPTIC.snap);
    
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {}

    setTimeout(() => {
      setFlash(false);
      completeRef.current?.();
    }, 900);
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[80vh] flex flex-col items-center justify-center overflow-hidden">
      
      {/* Fond galaxie 3D CSS ultra-léger (ne laggera pas sur mobile) */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,106,0.15)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(91,143,212,0.1)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(144,104,196,0.1)_0%,transparent_50%)]" />
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div
            className="fixed inset-0 z-[90] bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            transition={{ duration: 0.12 }}
          />
        )}
      </AnimatePresence>

      <div className="text-center mb-16 px-6 z-10">
        <h2 className="text-ink text-[clamp(30px,9vw,42px)] leading-[1.05]">
          Empreinte
        </h2>
        <p className="text-muted text-[13.5px] mt-3 max-w-[290px] mx-auto leading-relaxed">
          Maintenez l'empreinte pour révéler mes facettes sous forme de galaxies.
        </p>
      </div>

      {/* Zone centrale : Textes circulaires + Bouton */}
      <div className="relative w-[320px] h-[320px] flex items-center justify-center z-10 mt-8">
        
        {/* Cercles de textes concentriques (réplique du design demandé) */}
        <CircularText text="ESPRIT CRÉATIF ET ANALYTIQUE" radius={100} speed={30} reverse={false} />
        <CircularText text="PASSIONNÉ D'INNOVATION" radius={135} speed={40} reverse={true} />
        <CircularText text="EN QUÊTE DE NOUVELLES DÉCOUVERTES" radius={170} speed={50} reverse={false} />

        {/* Bouton Empreinte */}
        <motion.div
          className="relative z-20 w-24 h-24 rounded-full flex items-center justify-center cursor-pointer touch-none"
          style={{ background: 'rgba(20,20,27,0.9)', border: '1px solid rgba(201,168,106,0.3)', boxShadow: '0 0 40px rgba(201,168,106,0.15)' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* L'empreinte de base */}
          <Fingerprint size={42} className="text-white/20 absolute" />
          
          {/* L'empreinte qui se remplit (dorée) */}
          <div 
            className="absolute inset-0 flex items-center justify-center overflow-hidden transition-all duration-75"
            style={{ clipPath: `inset(${100 - progress}% 0 0 0)` }}
          >
            <Fingerprint size={42} style={{ color: 'var(--color-accent)' }} />
          </div>

          {/* Halo externe de progression */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
            <circle
              cx="48"
              cy="48"
              r="46"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2"
              strokeDasharray="289"
              strokeDashoffset={289 - (289 * progress) / 100}
              className="transition-all duration-75"
            />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}
