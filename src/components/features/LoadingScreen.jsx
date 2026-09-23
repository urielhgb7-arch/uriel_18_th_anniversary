import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const bootSequence = [
  "SYSTEM_BOOT: WAKANDA_OS v18.0",
  "ESTABLISHING MULTIVERSE LINK...",
  "BYPASSING DR. DOOM FIREWALL...",
  "ACCESSING INFINITY CORE...",
  "URIEL PROTOCOL: ENGAGED."
];

export default function LoadingScreen({ onComplete }) {
  const [stage, setStage] = useState('booting'); // booting -> snap -> fading
  const [lines, setLines] = useState([]);

  useEffect(() => {
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < bootSequence.length) {
        setLines(prev => [...prev, bootSequence[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
        setTimeout(() => setStage('snap'), 800);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (stage === 'snap') {
      // Simulate the "Snap" whiteout effect before fading
      setTimeout(() => setStage('fading'), 1500);
      setTimeout(() => onComplete(), 2000);
    }
  }, [stage, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#0A0514' }} // Very deep purple/black
      initial={{ opacity: 1 }}
      animate={{ opacity: stage === 'fading' ? 0 : 1 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.2) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
        }}
      />

      <div className="relative z-10 w-full max-w-md px-8 flex flex-col items-center">
        {/* Terminal Boot Sequence */}
        <AnimatePresence>
          {stage === 'booting' && (
            <motion.div 
              className="w-full mb-12 font-mono text-left"
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.5 }}
            >
              {lines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs mb-2 tracking-widest text-[#8B5CF6]"
                  style={{ textShadow: '0 0 8px rgba(139, 92, 246, 0.6)' }}
                >
                  {'>'} {line}
                </motion.div>
              ))}
              {lines.length < bootSequence.length && (
                <motion.div
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block w-2 h-4 bg-[#8B5CF6] mt-1"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Central Element / The Core */}
        <AnimatePresence>
          {stage === 'snap' && (
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, exit: { duration: 0.5, ease: 'easeIn' } }}
              className="relative flex items-center justify-center"
            >
              {/* Outer Rings */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="absolute w-32 h-32 rounded-full border-t-2 border-r-2 border-[#D4AF37] opacity-60"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute w-24 h-24 rounded-full border-b-2 border-l-2 border-[#0EA5E9] opacity-80"
              />
              
              {/* Core Glow */}
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center relative shadow-[0_0_60px_rgba(255,255,255,1)]">
                <span className="text-[#0A0514] font-black text-lg tracking-tighter" style={{ fontFamily: "'Syne', sans-serif" }}>18</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Snap Flash Effect */}
      <AnimatePresence>
        {stage === 'fading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 bg-white z-50 mix-blend-overlay"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
