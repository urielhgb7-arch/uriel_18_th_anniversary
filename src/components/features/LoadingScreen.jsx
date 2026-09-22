import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function LoadingScreen({ onComplete }) {
  const [stage, setStage] = useState('drawing'); // drawing -> glowing -> fading

  useEffect(() => {
    // Séquence d'animation temporelle
    const t1 = setTimeout(() => setStage('glowing'), 1200);
    const t2 = setTimeout(() => setStage('fading'), 2000);
    const t3 = setTimeout(() => onComplete(), 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1c]"
      initial={{ opacity: 1 }}
      animate={{ opacity: stage === 'fading' ? 0 : 1 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      <div className="relative flex flex-col items-center">
        <svg
          width="120"
          height="120"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mb-6"
        >
          {/* Logo "U" stylisé avec le chiffre 18 caché dans la géométrie */}
          <motion.path
            d="M 20 20 L 20 60 C 20 80, 80 80, 80 60 L 80 20"
            stroke="url(#gradient)"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: 1, 
              opacity: 1,
              filter: stage === 'glowing' ? 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.8))' : 'drop-shadow(0 0 0px rgba(255, 215, 0, 0))'
            }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
          {/* Point décoratif (or) */}
          <motion.circle 
            cx="50" 
            cy="40" 
            r="4" 
            fill="#ffd700"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4, type: 'spring' }}
          />
          
          <defs>
            <linearGradient id="gradient" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
              <stop stopColor="#facc15" /> {/* Jaune */}
              <stop offset="1" stopColor="#10b981" /> {/* Vert émeraude */}
            </linearGradient>
          </defs>
        </svg>

        <motion.div 
          className="text-white/50 text-sm tracking-[0.3em] font-light uppercase"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Expérience VIP
        </motion.div>
      </div>
    </motion.div>
  );
}
