import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useAnimation } from 'framer-motion';
import { Fingerprint } from 'lucide-react';
import { playSnap, haptic, HAPTIC } from '../../lib/audio';

const SEEN_KEY = 'uriel.snap.seen';
const RING_TEXT = "URIEL • 18TH • ANNIVERSARY • ";

function CircularText({ text, radius, baseSpeed, reverse, scaleMV, speedMultiplierMV }) {
  const pathId = `circle-${radius}`;
  const d = `M ${radius + 20}, ${radius + 20} m -${radius}, 0 a ${radius},${radius} 0 1,1 ${radius * 2},0 a ${radius},${radius} 0 1,1 -${radius * 2},0`;
  
  const rotateMV = useMotionValue(0);

  useEffect(() => {
    let raf;
    let currentRotate = 0;
    const loop = () => {
      const dir = reverse ? -1 : 1;
      // baseSpeed is degrees per frame (approx)
      const speed = (baseSpeed * speedMultiplierMV.get()) * dir;
      currentRotate += speed;
      rotateMV.set(currentRotate);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [baseSpeed, reverse, speedMultiplierMV, rotateMV]);

  return (
    <motion.svg 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      width={radius * 2 + 40} 
      height={radius * 2 + 40}
      style={{ rotate: rotateMV, scale: scaleMV }}
    >
      <defs>
        <path id={pathId} d={d} />
      </defs>
      <text fill="rgba(201,168,106,0.12)" style={{ fontSize: '13px', letterSpacing: '0.25em', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
        <textPath href={`#${pathId}`} startOffset="0%">
          {text.repeat(15)}
        </textPath>
      </text>
    </motion.svg>
  );
}

export default function Gauntlet({ onComplete }) {
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Motion values pour une fluidité absolue (60fps hors cycle React)
  const progressMV = useMotionValue(0);
  const scaleMV = useTransform(progressMV, [0, 1], [1, 15]); // Les anneaux grandissent jusqu'à être aspirés hors champ
  const speedMultiplierMV = useTransform(progressMV, [0, 1], [1, 30]); // L'accélération vertigineuse
  
  // Clip path pour le remplissage doré de l'empreinte
  const fillClipPath = useTransform(progressMV, [0, 1], ["inset(100% 0 0 0)", "inset(0% 0 0 0)"]);
  const dashOffset = useTransform(progressMV, [0, 1], [289, 0]);

  // Contrôleurs pour l'animation d'ouverture (Portes de donjon)
  const leftDoor = useAnimation();
  const rightDoor = useAnimation();
  const contentFade = useAnimation();
  
  const animationRef = useRef(null);

  const handlePointerDown = () => {
    if (isCompleted) return;
    haptic(HAPTIC.tap);
    
    // Animation extrêmement fluide de 0 à 1 (environ 2.2 secondes)
    animationRef.current = animate(progressMV, 1, {
      duration: 2.2,
      ease: "easeIn",
      onComplete: () => {
        triggerDungeonDoors();
      }
    });
  };

  const handlePointerUp = () => {
    if (isCompleted) return;
    if (animationRef.current) {
      animationRef.current.stop();
    }
    // Si pas terminé, on redescend doucement
    if (progressMV.get() < 1) {
      animate(progressMV, 0, { duration: 0.6, ease: "easeOut" });
      haptic(HAPTIC.soft);
    }
  };

  const triggerDungeonDoors = () => {
    if (isCompleted) return;
    setIsCompleted(true);
    playSnap();
    haptic(HAPTIC.snap);
    
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {}

    // 1. Disparition du contenu central (aspiration)
    contentFade.start({ 
      opacity: 0, 
      scale: 1.5,
      transition: { duration: 0.4, ease: "easeIn" }
    });

    // 2. Ouverture des portes lourdes
    leftDoor.start({ 
      x: "-100%", 
      transition: { duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 } 
    });
    rightDoor.start({ 
      x: "100%", 
      transition: { duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 } 
    });

    // 3. Notifier le parent pour afficher la suite sous les portes
    setTimeout(() => {
      onComplete?.();
    }, 600); // Déclenché pendant l'ouverture des portes
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-transparent touch-none flex items-center justify-center">
      
      {/* Portes de Donjon (Fond Noir qui s'ouvre en deux) */}
      <motion.div 
        animate={leftDoor}
        className="absolute top-0 left-0 bottom-0 w-1/2 bg-[#0b0e13] border-r border-white/5 z-0"
      />
      <motion.div 
        animate={rightDoor}
        className="absolute top-0 right-0 bottom-0 w-1/2 bg-[#0b0e13] border-l border-white/5 z-0"
      />

      <motion.div animate={contentFade} className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none">
        
        <div className="text-center mb-16 px-6 z-20">
          <h2 className="text-ink text-[clamp(32px,9vw,46px)] leading-[1.05] drop-shadow-lg">
            Empreinte
          </h2>
          <p className="text-muted text-[14px] mt-3 max-w-[300px] mx-auto leading-relaxed">
            Maintenez pour ouvrir la porte et révéler les galaxies.
          </p>
        </div>

        <div className="relative w-[320px] h-[320px] flex items-center justify-center z-20 mt-8 pointer-events-auto">
          
          {/* 5 Anneaux concentriques */}
          <CircularText text={RING_TEXT} radius={110} baseSpeed={0.25} reverse={false} scaleMV={scaleMV} speedMultiplierMV={speedMultiplierMV} />
          <CircularText text={RING_TEXT} radius={150} baseSpeed={0.20} reverse={true} scaleMV={scaleMV} speedMultiplierMV={speedMultiplierMV} />
          <CircularText text={RING_TEXT} radius={195} baseSpeed={0.16} reverse={false} scaleMV={scaleMV} speedMultiplierMV={speedMultiplierMV} />
          <CircularText text={RING_TEXT} radius={245} baseSpeed={0.13} reverse={true} scaleMV={scaleMV} speedMultiplierMV={speedMultiplierMV} />
          <CircularText text={RING_TEXT} radius={300} baseSpeed={0.10} reverse={false} scaleMV={scaleMV} speedMultiplierMV={speedMultiplierMV} />

          {/* Bouton Empreinte */}
          <motion.div
            className="relative z-30 w-28 h-28 rounded-full flex items-center justify-center cursor-pointer"
            style={{ 
              background: 'rgba(11, 14, 19, 0.85)', 
              border: '1px solid rgba(201,168,106,0.4)', 
              boxShadow: '0 0 50px rgba(201,168,106,0.15)',
              backdropFilter: 'blur(10px)'
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* L'empreinte de base */}
            <Fingerprint size={48} className="text-white/20 absolute" />
            
            {/* L'empreinte qui se remplit (dorée) pilotée par motion */}
            <motion.div 
              className="absolute inset-0 flex items-center justify-center overflow-hidden"
              style={{ clipPath: fillClipPath }}
            >
              <Fingerprint size={48} style={{ color: 'var(--color-accent)' }} />
            </motion.div>

            {/* Halo externe de progression */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
              <motion.circle
                cx="56"
                cy="56"
                r="54"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="2.5"
                strokeDasharray="339.29"
                strokeDashoffset={dashOffset}
              />
            </svg>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
