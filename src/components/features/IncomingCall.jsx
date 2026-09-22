import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { MapPin, Sparkles, PhoneCall } from 'lucide-react';

export default function IncomingCall({ onSelectPath }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Effet d'inclinaison 3D (souris + gyroscope)
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20; // max 20deg
      const y = (e.clientY / window.innerHeight - 0.5) * -20;
      setTilt({ x: y, y: x });
    };

    const handleDeviceOrientation = (e) => {
      if (e.beta && e.gamma) {
        const x = Math.min(Math.max(e.beta - 45, -20), 20); // offset normal posture
        const y = Math.min(Math.max(e.gamma, -20), 20);
        setTilt({ x: -x, y });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleDeviceOrientation);

    // Essayer de vibrer au chargement
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-[#0a0f1c] overflow-hidden flex flex-col items-center justify-between py-12 px-6">
      {/* Fond flouté animé */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-violet-600/20 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[60vw] h-[60vw] bg-yellow-500/10 rounded-full blur-[100px]" style={{ animationDuration: '4s' }} />
      </div>

      {/* Header : Titre de l'appel */}
      <div className="z-10 flex flex-col items-center mt-10">
        <motion.p 
          className="text-white/60 text-sm tracking-widest uppercase mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Appel Entrant...
        </motion.p>
        <motion.h1 
          className="text-3xl font-bold text-white tracking-wide"
          style={{ fontFamily: "'Syne', sans-serif" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Uriel
        </motion.h1>
      </div>

      {/* Avatar Central avec effet 3D */}
      <motion.div 
        className="z-10 relative flex items-center justify-center"
        style={{ perspective: 1000 }}
      >
        <motion.div 
          className="w-40 h-40 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl"
          animate={{ 
            rotateX: tilt.x,
            rotateY: tilt.y,
            boxShadow: `${-tilt.y}px ${-tilt.x}px 30px rgba(255,215,0,0.15)`
          }}
          transition={{ type: 'spring', stiffness: 100, damping: 30 }}
        >
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-600 to-yellow-500 flex items-center justify-center animate-pulse">
            <span className="text-white text-5xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>U</span>
          </div>
        </motion.div>
        
        {/* Cercles de pulsation externes */}
        <div className="absolute inset-0 rounded-full border border-yellow-500/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
        <div className="absolute inset-[-20px] rounded-full border border-violet-500/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '1s' }} />
      </motion.div>

      {/* Actions (Swipes) */}
      <div className="z-10 w-full flex flex-col gap-6 mb-8">
        {/* Swipe Right : Lieu */}
        <SwipeButton 
          icon={<MapPin className="text-white" size={20} />}
          label="Glisser pour le Lieu"
          direction="right"
          color="bg-emerald-500/20 border-emerald-500/30"
          onUnlock={() => onSelectPath('map')}
        />

        {/* Swipe Left : Constellation */}
        <SwipeButton 
          icon={<Sparkles className="text-white" size={20} />}
          label="Me Découvrir"
          direction="left"
          color="bg-violet-500/20 border-violet-500/30"
          onUnlock={() => onSelectPath('constellation')}
        />
      </div>
    </div>
  );
}

// Composant Helper pour les boutons de Swipe
function SwipeButton({ icon, label, direction, color, onUnlock }) {
  const x = useMotionValue(0);
  const backgroundWidth = useTransform(x, 
    direction === 'right' ? [0, 200] : [0, -200], 
    ['0%', '100%']
  );
  
  const handleDragEnd = (event, info) => {
    const threshold = 120;
    if (direction === 'right' && info.offset.x > threshold) {
      onUnlock();
    } else if (direction === 'left' && info.offset.x < -threshold) {
      onUnlock();
    }
  };

  return (
    <div className={`relative w-full h-16 rounded-full border backdrop-blur-md overflow-hidden flex items-center ${color}`}>
      {/* Barre de progression visuelle */}
      <motion.div 
        className="absolute h-full bg-white/10"
        style={{ 
          width: backgroundWidth,
          left: direction === 'right' ? 0 : 'auto',
          right: direction === 'left' ? 0 : 'auto'
        }}
      />
      
      {/* Texte indicatif */}
      <div className="absolute w-full text-center pointer-events-none">
        <span className="text-white/60 text-sm font-medium tracking-wide">{label}</span>
      </div>

      {/* Bouton draggable */}
      <motion.div
        className="absolute w-14 h-14 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg"
        style={{ 
          x,
          left: direction === 'right' ? 4 : 'auto',
          right: direction === 'left' ? 4 : 'auto'
        }}
        drag="x"
        dragConstraints={{ 
          left: direction === 'right' ? 0 : -200, 
          right: direction === 'right' ? 200 : 0 
        }}
        dragElastic={0.1}
        dragSnapToOrigin
        onDragEnd={handleDragEnd}
      >
        {icon}
      </motion.div>
    </div>
  );
}
