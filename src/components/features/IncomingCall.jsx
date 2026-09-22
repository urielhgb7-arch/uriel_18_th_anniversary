import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { MapPin, Phone, Sparkles } from 'lucide-react';

export default function IncomingCall({ onSelectPath }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Effet d'inclinaison 3D (souris + gyroscope)
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * -20;
      setTilt({ x: y, y: x });
    };

    const handleDeviceOrientation = (e) => {
      if (e.beta && e.gamma) {
        const x = Math.min(Math.max(e.beta - 45, -20), 20);
        const y = Math.min(Math.max(e.gamma, -20), 20);
        setTilt({ x: -x, y });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleDeviceOrientation);

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-zinc-900 overflow-hidden flex flex-col items-center justify-between py-12 px-6 font-inter select-none">
      {/* Fond flouté façon iOS */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#120b2e] to-black opacity-80" />
        <div className="absolute top-1/4 left-1/4 w-[60vw] h-[60vw] bg-purple-600/30 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[70vw] h-[70vw] bg-emerald-500/20 rounded-full blur-[120px]" style={{ animationDuration: '4s' }} />
        {/* iOS Glass overlay */}
        <div className="absolute inset-0 backdrop-blur-3xl bg-black/10" />
      </div>

      {/* Header : Titre de l'appel iOS */}
      <div className="z-10 flex flex-col items-center mt-12 w-full">
        <motion.p 
          className="text-white/70 text-[17px] tracking-wide mb-1 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          mobile
        </motion.p>
        <motion.h1 
          className="text-5xl font-light text-white tracking-tight"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          Uriel
        </motion.h1>
      </div>

      {/* Avatar Central Antigravity */}
      <motion.div 
        className="z-10 relative flex items-center justify-center mt-8 mb-auto"
        style={{ perspective: 1000 }}
      >
        <motion.div 
          className="w-44 h-44 rounded-full bg-white/5 border border-white/20 backdrop-blur-2xl flex items-center justify-center shadow-2xl"
          animate={{ 
            rotateX: tilt.x,
            rotateY: tilt.y,
            boxShadow: `${-tilt.y}px ${-tilt.x}px 40px rgba(107,33,168,0.3)`
          }}
          transition={{ type: 'spring', stiffness: 100, damping: 30 }}
        >
          <div className="w-36 h-36 rounded-full bg-gradient-to-br from-purple-600 to-emerald-500 flex items-center justify-center shadow-inner">
            <span className="text-white text-6xl font-light">U</span>
          </div>
        </motion.div>
        
        {/* Cercles de pulsation externes (Ringing effect) */}
        <div className="absolute inset-[-20px] rounded-full border border-white/20 animate-[ping_3s_ease-out_infinite]" />
        <div className="absolute inset-[-40px] rounded-full border border-white/10 animate-[ping_3s_ease-out_infinite]" style={{ animationDelay: '1s' }} />
      </motion.div>

      {/* Actions (Swipes iOS Style) */}
      <div className="z-10 w-full flex flex-col gap-5 mb-10 max-w-sm mx-auto">
        {/* Swipe Right : Constellation (Answer call style) */}
        <IosSwipeButton 
          icon={<Phone className="text-emerald-500" size={24} fill="currentColor" />}
          label="glisser pour me découvrir"
          color="bg-white/10"
          buttonColor="bg-white"
          onUnlock={() => onSelectPath('constellation')}
        />

        {/* Swipe Right : Lieu */}
        <IosSwipeButton 
          icon={<MapPin className="text-blue-500" size={24} fill="currentColor" />}
          label="glisser pour le lieu"
          color="bg-white/10"
          buttonColor="bg-white"
          onUnlock={() => onSelectPath('map')}
        />
      </div>
    </div>
  );
}

// Composant iOS exact
function IosSwipeButton({ icon, label, color, buttonColor, onUnlock }) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 150], [1, 0]);
  
  const handleDragEnd = (event, info) => {
    const threshold = 180;
    if (info.offset.x > threshold) {
      onUnlock();
    }
  };

  return (
    <div className={`relative w-full h-[76px] rounded-full backdrop-blur-xl flex items-center px-2 ${color} border border-white/10`}>
      {/* Texte indicatif iOS style */}
      <motion.div 
        className="absolute w-full text-center pointer-events-none"
        style={{ opacity }}
      >
        <span className="text-white/80 text-[17px] font-medium tracking-wide shimmer-text">{label}</span>
      </motion.div>

      {/* Bouton draggable */}
      <motion.div
        className={`relative z-10 w-[60px] h-[60px] rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[0_4px_12px_rgba(0,0,0,0.1)] ${buttonColor}`}
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 260 }} // À ajuster selon la largeur d'écran
        dragElastic={0.05}
        dragSnapToOrigin
        onDragEnd={handleDragEnd}
      >
        {icon}
      </motion.div>

      {/* Shimmer effect style */}
      <style dangerouslySetInnerHTML={{__html: `
        .shimmer-text {
          background: linear-gradient(90deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.4) 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}} />
    </div>
  );
}
