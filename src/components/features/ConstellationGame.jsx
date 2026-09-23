import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import content from '../../content.json';

// Couleurs exactes des pierres d'infinité (MCU)
const STONES = [
  { name: 'Space', color: '#3B82F6', text: 'Espace' }, // Bleu
  { name: 'Mind', color: '#EAB308', text: 'Esprit' },  // Jaune
  { name: 'Reality', color: '#EF4444', text: 'Réalité' }, // Rouge
  { name: 'Power', color: '#A855F7', text: 'Pouvoir' },  // Violet
  { name: 'Time', color: '#22C55E', text: 'Temps' },   // Vert
  { name: 'Soul', color: '#F97316', text: 'Âme' }     // Orange
];

function TimelineBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="timeStream" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.4" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      
      {/* Background timeline flow */}
      <motion.path
        d="M -10,50 Q 25,60 50,50 T 110,50"
        fill="none"
        stroke="url(#timeStream)"
        strokeWidth="0.5"
        filter="url(#glow)"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 3, ease: 'easeInOut' }}
      />
      <motion.path
        d="M -10,50 Q 25,40 50,50 T 110,50"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="0.2"
        strokeOpacity="0.8"
        filter="url(#glow)"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 3, ease: 'easeInOut', delay: 0.5 }}
      />
    </svg>
  );
}

function TraitModal({ trait, stone, onClose }) {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm p-8 rounded-3xl relative overflow-hidden"
        style={{
          background: 'rgba(10,5,20,0.9)',
          border: `1px solid ${stone.color}40`,
          boxShadow: `0 0 60px ${stone.color}30, inset 0 0 20px ${stone.color}20`,
        }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: -10 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${stone.color}, transparent)` }} />
        
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center relative" style={{ background: `${stone.color}20`, border: `1px solid ${stone.color}80` }}>
             <motion.div className="absolute inset-0 rounded-full" style={{ background: stone.color, filter: 'blur(8px)' }} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
          </div>
          <div>
            <p className="text-[10px] tracking-widest uppercase font-mono" style={{ color: stone.color }}>Pierre de l'{stone.text}</p>
            <h3 className="text-white text-xl font-bold font-syne tracking-tight mt-1">{trait.title}</h3>
          </div>
        </div>
        
        <p className="text-white/70 text-sm leading-relaxed font-sans">{trait.desc}</p>
        
        <button onClick={onClose} className="mt-8 w-full py-3 rounded-xl text-xs uppercase tracking-widest font-mono text-white/50 hover:text-white hover:bg-white/5 transition-all">
          Assimiler
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── 3D Gauntlet Component ─────────────────────────────────────────────────────
function NanoGauntlet({ onSnapStart, onSnapComplete }) {
  const [phase, setPhase] = useState('idle'); // idle, surge, snap
  const surgeAudioRef = useRef(null);
  const snapAudioRef = useRef(null);
  const voiceAudioRef = useRef(null);

  useEffect(() => {
    surgeAudioRef.current = new Audio('/audio/inception_braam.mp3');
    snapAudioRef.current = new Audio('/audio/snap.mp3');
    voiceAudioRef.current = new Audio('/audio/iamuriel.mp3'); // Fichier que l'utilisateur va fournir
  }, []);

  const triggerSequence = () => {
    if (phase !== 'idle') return;
    setPhase('surge');
    
    if (surgeAudioRef.current) {
      surgeAudioRef.current.volume = 0.5;
      surgeAudioRef.current.play().catch(() => {});
    }
    if (voiceAudioRef.current) {
      voiceAudioRef.current.play().catch(() => {});
    }

    // Sequence timing
    setTimeout(() => {
      setPhase('snap');
      if (snapAudioRef.current) {
        snapAudioRef.current.play().catch(() => {});
      }
      onSnapStart(); // Triggers the white flash
      
      setTimeout(() => {
        setPhase('dust');
        onSnapComplete(); // Tells parent the snap is done
      }, 1500);
    }, 4500); // 4.5 seconds for the dialogue "And me... I am Uriel"
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/80 backdrop-blur-md">
      
      {/* Dialogue Subtitles */}
      <AnimatePresence>
        {phase === 'surge' && (
          <motion.div className="absolute top-32 flex flex-col items-center z-50">
             <motion.p 
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
               className="text-white/60 text-lg font-serif italic mb-2 tracking-widest"
             >
               And me...
             </motion.p>
             <motion.h2 
               initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }} 
               animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} 
               transition={{ delay: 2, duration: 0.5 }}
               className="text-white text-5xl font-black font-syne tracking-tighter uppercase"
               style={{ textShadow: '0 0 40px rgba(139,92,246,0.8)' }}
             >
               I AM URIEL.
             </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Gauntlet Rendering */}
      <div 
        className="relative w-64 h-96 cursor-pointer" 
        style={{ perspective: '1000px' }}
        onClick={triggerSequence}
      >
        <motion.div 
          className="w-full h-full relative"
          style={{ transformStyle: 'preserve-3d' }}
          initial={{ rotateX: 20, rotateY: 0, y: 100, opacity: 0 }}
          animate={{ 
            rotateX: phase === 'idle' ? [20, 25, 20] : 10, 
            rotateY: phase === 'idle' ? [-5, 5, -5] : 0, 
            y: phase === 'dust' ? 200 : 0,
            opacity: phase === 'dust' ? 0 : 1 
          }}
          transition={{ 
            rotateX: { repeat: Infinity, duration: 4, ease: 'easeInOut' },
            rotateY: { repeat: Infinity, duration: 5, ease: 'easeInOut' },
            y: phase !== 'idle' ? { duration: 1 } : { duration: 0.8 },
            opacity: { duration: phase === 'dust' ? 1.5 : 0.8 }
          }}
        >
          {/* Forearm (Base) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-48 rounded-t-3xl"
               style={{ 
                 background: 'linear-gradient(145deg, #1A1025, #0D0514)', 
                 boxShadow: 'inset 0 0 20px rgba(139,92,246,0.3), 0 0 30px rgba(0,0,0,0.8)',
                 transform: 'translateZ(-20px)'
               }}>
             {/* Energy Veins */}
             <motion.div 
               className="absolute inset-0 rounded-t-3xl opacity-0"
               style={{ background: 'linear-gradient(0deg, transparent, rgba(139,92,246,0.5), transparent)' }}
               animate={{ opacity: phase === 'surge' ? [0, 1, 0.5, 1] : 0, backgroundPositionY: ['100%', '0%'] }}
               transition={{ duration: 1.5, repeat: phase === 'surge' ? Infinity : 0 }}
             />
          </div>

          {/* Palm/Back of Hand */}
          <div className="absolute bottom-40 left-1/2 -translate-x-1/2 w-48 h-40 rounded-3xl"
               style={{ 
                 background: 'linear-gradient(135deg, #2A1B38, #11071A)', 
                 boxShadow: 'inset 0 2px 1px rgba(255,255,255,0.2), inset 0 0 30px rgba(139,92,246,0.4)',
                 transform: 'translateZ(10px)'
               }}>
            
            {/* The 6 Stones */}
            {STONES.map((stone, i) => {
              // Mind stone is huge in center, others are on knuckles
              const isMind = i === 1;
              const size = isMind ? 28 : 16;
              const xPos = isMind ? 50 : 15 + (i > 1 ? (i-1)*18 : i*18);
              const yPos = isMind ? 60 : 15;
              
              return (
                <motion.div 
                  key={stone.name}
                  className="absolute rounded-full"
                  style={{
                    width: size, height: size,
                    left: `${xPos}%`, top: `${yPos}%`,
                    transform: 'translate(-50%, -50%)',
                    background: stone.color,
                    boxShadow: `0 0 10px ${stone.color}, inset 0 0 5px rgba(255,255,255,0.8)`
                  }}
                  animate={{
                    boxShadow: phase === 'surge' 
                      ? [`0 0 20px ${stone.color}`, `0 0 60px ${stone.color}`, `0 0 20px ${stone.color}`]
                      : `0 0 10px ${stone.color}`
                  }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              );
            })}
          </div>

          {/* Fingers */}
          {/* Thumb */}
          <motion.div className="absolute bottom-52 left-4 w-12 h-32 rounded-full origin-bottom"
               style={{ background: 'linear-gradient(to top, #2A1B38, #1A1025)', transform: 'rotate(-30deg) translateZ(15px)' }}
               animate={{ rotate: phase === 'snap' ? -10 : -30 }} transition={{ duration: 0.1 }} />
          {/* Index */}
          <div className="absolute bottom-72 left-12 w-10 h-28 rounded-full" style={{ background: 'linear-gradient(to top, #2A1B38, #1A1025)', transform: 'translateZ(5px)' }} />
          {/* Middle (Snapping finger) */}
          <motion.div className="absolute bottom-76 left-24 w-10 h-32 rounded-full origin-bottom"
               style={{ background: 'linear-gradient(to top, #2A1B38, #1A1025)', transform: 'translateZ(20px)' }}
               animate={{ rotateX: phase === 'snap' ? 60 : 0, y: phase === 'snap' ? 20 : 0 }} transition={{ duration: 0.1 }} />
          {/* Ring */}
          <div className="absolute bottom-72 left-36 w-10 h-28 rounded-full" style={{ background: 'linear-gradient(to top, #2A1B38, #1A1025)', transform: 'translateZ(5px)' }} />
          {/* Pinky */}
          <div className="absolute bottom-68 left-48 w-8 h-24 rounded-full" style={{ background: 'linear-gradient(to top, #2A1B38, #1A1025)', transform: 'rotate(10deg) translateZ(0px)' }} />
        </motion.div>

        {phase === 'idle' && (
          <p className="absolute -bottom-10 w-full text-center text-white/40 text-xs uppercase tracking-widest font-mono animate-pulse">
            Appuyez pour initier la séquence
          </p>
        )}
      </div>
    </div>
  );
}

// ── Particle Dust Effect ──────────────────────────────────────────────────────
function DustOverlay({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    for (let i = 0; i < 300; i++) {
      particles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 300,
        y: window.innerHeight / 2 + (Math.random() - 0.5) * 300,
        vx: (Math.random() - 0.5) * 15 + 5, // Blow towards right
        vy: (Math.random() - 0.5) * 15 - 5, // Blow upwards
        size: Math.random() * 4 + 1,
        life: 1,
        decay: Math.random() * 0.02 + 0.01,
        color: Math.random() > 0.5 ? '#8B5CF6' : '#2A1B38'
      });
    }

    let raf;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        if (p.life <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      
      if (alive) raf = requestAnimationFrame(render);
    };
    render();
    
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 z-50 pointer-events-none" style={{ display: active ? 'block' : 'none' }} />
  );
}


// ── Main Component ─────────────────────────────────────────────────────────────
export default function ConstellationGame({ onUnlockNext }) {
  const [discoveredStones, setDiscoveredStones] = useState([]);
  const [activeStoneIdx, setActiveStoneIdx] = useState(null);
  
  const [showGauntlet, setShowGauntlet] = useState(false);
  const [flash, setFlash] = useState(false);
  const [dust, setDust] = useState(false);
  
  const traits = content.constellationTraits; // Should be at least 6

  const handleStoneClick = (index) => {
    if (discoveredStones.includes(index)) return;
    setActiveStoneIdx(index);
  };

  const closeTraitModal = () => {
    if (activeStoneIdx !== null) {
      const newStones = [...discoveredStones, activeStoneIdx];
      setDiscoveredStones(newStones);
      setActiveStoneIdx(null);
      
      if (newStones.length === 6) {
        setTimeout(() => setShowGauntlet(true), 1500);
      }
    }
  };

  const handleSnapStart = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 800);
    setTimeout(() => setDust(true), 100);
  };

  const handleSnapComplete = () => {
    // Notify parent to unlock scroll and auto-scroll to next section
    if (onUnlockNext) onUnlockNext();
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col bg-[#05020A]">
      
      {/* Snap Flash */}
      <AnimatePresence>
        {flash && (
          <motion.div 
            className="absolute inset-0 z-[100] bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      <DustOverlay active={dust} />

      {/* The Gauntlet Cinematic Overlay */}
      <AnimatePresence>
        {showGauntlet && !dust && (
          <NanoGauntlet onSnapStart={handleSnapStart} onSnapComplete={handleSnapComplete} />
        )}
      </AnimatePresence>

      {/* The Ancient One Timeline View */}
      <div className="relative flex-1 w-full flex flex-col items-center justify-center">
        <TimelineBackground />

        <div className="absolute top-12 text-center z-10 w-full px-6">
          <p className="text-[#F59E0B] text-xs tracking-[0.3em] uppercase font-bold mb-2 font-mono">
            {discoveredStones.length === 6 ? 'Flux temporel stabilisé' : 'Recherche des fragments'}
          </p>
          <h1 className="text-white text-3xl font-black font-syne tracking-tighter" style={{ textShadow: '0 0 20px rgba(245,158,11,0.5)' }}>
            CHRONOLOGIE
          </h1>
          <p className="text-white/50 text-sm mt-2 font-sans">
            {discoveredStones.length === 6 ? 'Glissez pour forger le gantelet.' : 'Rassemblez les 6 pierres pour restaurer la réalité.'}
          </p>
        </div>

        {/* Timeline Stones Container */}
        <div className="relative z-20 w-full h-32 flex items-center justify-between px-8 max-w-lg mx-auto">
          {/* Horizontal connecting line */}
          <div className="absolute left-8 right-8 h-[2px] bg-white/10" />

          {STONES.map((stone, i) => {
            const isDiscovered = discoveredStones.includes(i);
            const isCurrent = activeStoneIdx === i;
            
            return (
              <div key={stone.name} className="relative flex flex-col items-center group">
                <motion.button
                  className="w-10 h-10 rounded-full relative flex items-center justify-center transition-transform hover:scale-110"
                  style={{
                    background: isDiscovered ? stone.color : '#111',
                    border: `2px solid ${isDiscovered ? stone.color : '#333'}`,
                    boxShadow: isDiscovered ? `0 0 20px ${stone.color}, inset 0 0 10px rgba(255,255,255,0.5)` : 'none'
                  }}
                  onClick={() => handleStoneClick(i)}
                  whileTap={{ scale: 0.9 }}
                  disabled={isDiscovered}
                >
                  {!isDiscovered && <div className="w-2 h-2 rounded-full bg-white/20" />}
                  {isDiscovered && (
                    <motion.div className="absolute inset-0 rounded-full border border-white" animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
                  )}
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {activeStoneIdx !== null && (
          <TraitModal 
            trait={traits[activeStoneIdx]} 
            stone={STONES[activeStoneIdx]} 
            onClose={closeTraitModal} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
