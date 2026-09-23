import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

// ── Background Hex Grid / Wakanda Vibe ──────────────────────────────────────
function HexGridBackground() {
  return (
    <div 
      className="absolute inset-0 z-0 opacity-10 pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='69.2820323027551' viewBox='0 0 40 69.2820323027551' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 17.3205081L20 5.77350269 0 17.3205081v23.0940108L20 51.9615242l20-11.5470054V17.3205081zM20 63.5085296L0 51.9615242v-23.0940108L20 17.3205081l20 11.5470054v23.0940108L20 63.5085296z' fill='%238B5CF6' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        backgroundSize: '40px'
      }}
    />
  );
}

function RippleRing({ delay = 0, color = 'rgba(139,92,246,0.5)' }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-full border-2"
      style={{ borderColor: color }}
      initial={{ scale: 1, opacity: 0.8 }}
      animate={{ scale: 2.5, opacity: 0 }}
      transition={{ duration: 2, repeat: Infinity, delay, ease: 'easeOut' }}
    />
  );
}

function SwipeToUnlock({ label, onUnlock, accentColor = '#8B5CF6' }) {
  const x = useMotionValue(0);
  const [trackWidth, setTrackWidth] = useState(300);
  const trackRef = useRef(null);

  useEffect(() => {
    if (trackRef.current) setTrackWidth(trackRef.current.offsetWidth);
  }, []);

  const buttonMax = trackWidth - 64;
  const textOpacity = useTransform(x, [0, buttonMax * 0.5], [1, 0]);
  const trackGlow = useTransform(x, [0, buttonMax], ['rgba(0,0,0,0)', `rgba(139,92,246,0.3)`]); // using vibranium color
  const buttonBg = useTransform(x, [0, buttonMax * 0.8], ['rgba(20,10,40,1)', accentColor]);

  const handleDragEnd = (_, info) => {
    if (info.offset.x > buttonMax * 0.75) {
      animate(x, buttonMax, { duration: 0.2 });
      setTimeout(onUnlock, 300);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
    }
  };

  return (
    <div
      ref={trackRef}
      className="relative w-full h-[64px] rounded-full flex items-center px-1 overflow-hidden"
      style={{
        background: 'rgba(20,10,40,0.6)',
        backdropFilter: 'blur(20px)',
        border: `1px solid rgba(139,92,246,0.3)`,
        boxShadow: `inset 0 0 20px rgba(139,92,246,0.1)`,
      }}
    >
      <motion.div className="absolute inset-0 rounded-full" style={{ background: trackGlow }} />
      
      {/* Scan line effect inside track */}
      <motion.div 
        className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
        animate={{ left: ['-20%', '120%'] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
      />

      <motion.span
        className="absolute w-full text-center pointer-events-none text-sm font-medium tracking-[0.15em] uppercase text-[#8B5CF6]"
        style={{ opacity: textOpacity, fontFamily: "'DM Sans', sans-serif" }}
      >
        {label}
      </motion.span>

      <motion.div
        className="relative z-10 w-[56px] h-[56px] rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ x, background: buttonBg, border: `1px solid ${accentColor}` }}
        drag="x"
        dragConstraints={{ left: 0, right: buttonMax }}
        dragElastic={0.02}
        onDragEnd={handleDragEnd}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
    </div>
  );
}

export default function IncomingCall({ onSelectPath }) {
  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200, 1000]);
  }, []);

  // Audio elements (will play if browser allows, requires user interaction which they had on previous screen if we add a "start" button, but for now we autoPlay and hope or rely on the global mute button)
  return (
    <div
      className="fixed inset-0 z-40 overflow-hidden flex flex-col select-none"
      style={{
        backgroundColor: '#0A0514', // Very deep space/wakanda background
      }}
    >
      {/* Audio for incoming transmission */}
      <audio src="/audio/transmission_incoming.mp3" autoPlay loop />

      <HexGridBackground />
      
      <div className="absolute inset-0 pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(10,5,20,0.9) 100%)' }} />

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center pt-24">
        <motion.div
          className="flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <motion.div 
            className="w-2 h-2 rounded-full bg-red-500"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-red-400 text-xs tracking-[0.2em] uppercase font-bold font-mono">
            Transmission Sécurisée
          </span>
        </motion.div>

        <motion.h1
          className="text-white text-4xl font-black text-center"
          style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.02em', textShadow: '0 0 20px rgba(139,92,246,0.5)' }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          PROTOCOLE URIEL
        </motion.h1>
        
        <motion.p
          className="text-[#8B5CF6] mt-2 font-mono text-xs tracking-widest opacity-70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          EN ATTENTE DE DÉCHIFFREMENT...
        </motion.p>
      </div>

      {/* Center Hologram Core */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <motion.div
          className="relative w-32 h-32 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring' }}
        >
          <RippleRing delay={0} color="#8B5CF6" />
          <RippleRing delay={0.6} color="#0EA5E9" />
          
          <div className="w-20 h-20 rounded-full relative flex items-center justify-center z-10"
               style={{ background: 'linear-gradient(135deg, #1B0B2E 0%, #4C1D95 100%)', boxShadow: '0 0 40px rgba(139,92,246,0.6)' }}>
            <motion.div 
              className="w-16 h-16 rounded-full border border-white/20 border-t-white/80"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            {/* Core icon / logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Actions */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-6 pb-16 px-6 w-full max-w-sm mx-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <SwipeToUnlock 
          label="Déchiffrer les Coordonnées" 
          accentColor="#0EA5E9" // Stark Blue for map
          onUnlock={() => onSelectPath('map')} 
        />
        <SwipeToUnlock 
          label="Accéder à l'Univers" 
          accentColor="#D4AF37" // Infinity Gold for constellation
          onUnlock={() => onSelectPath('constellation')} 
        />
      </motion.div>
    </div>
  );
}
