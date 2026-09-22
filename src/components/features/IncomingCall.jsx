import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

// ─── Starfield Canvas ─────────────────────────────────────────────────────────
function StarfieldCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random(),
      da: (Math.random() - 0.5) * 0.004,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        s.a += s.da;
        if (s.a <= 0 || s.a >= 1) s.da *= -1;
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, s.a))})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

function RippleRing({ delay = 0 }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-full border border-white/20"
      initial={{ scale: 1, opacity: 0.6 }}
      animate={{ scale: 2.2, opacity: 0 }}
      transition={{ duration: 2.4, repeat: Infinity, delay, ease: 'easeOut' }}
    />
  );
}

function SwipeToAnswer({ label, onUnlock }) {
  const x = useMotionValue(0);
  const [trackWidth, setTrackWidth] = useState(300);
  const trackRef = useRef(null);

  useEffect(() => {
    if (trackRef.current) setTrackWidth(trackRef.current.offsetWidth);
  }, []);

  const buttonMax = trackWidth - 72;
  const textOpacity = useTransform(x, [0, buttonMax * 0.5], [1, 0]);
  const arrowOpacity = useTransform(x, [0, buttonMax * 0.3], [1, 0]);
  const trackGlow = useTransform(x, [0, buttonMax], ['rgba(255,255,255,0)', 'rgba(52,199,89,0.3)']);
  const buttonBg = useTransform(x, [0, buttonMax * 0.8], ['rgba(255,255,255,1)', 'rgba(52,199,89,1)']);

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
      className="relative w-full h-[76px] rounded-full flex items-center px-[6px]"
      style={{
        background: 'rgba(80,80,80,0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      <motion.div className="absolute inset-0 rounded-full" style={{ background: trackGlow }} />
      <motion.span
        className="absolute w-full text-center pointer-events-none text-base font-medium tracking-wide"
        style={{ opacity: textOpacity, color: 'rgba(255,255,255,0.72)' }}
      >
        {label}
      </motion.span>
      <motion.div
        className="relative z-10 w-[64px] h-[64px] rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
        style={{ x, background: buttonBg }}
        drag="x"
        dragConstraints={{ left: 0, right: buttonMax }}
        dragElastic={0.02}
        onDragEnd={handleDragEnd}
      >
        <motion.svg style={{ opacity: arrowOpacity }} width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M9 18l6-6-6-6" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.div>
    </div>
  );
}

function SecondaryBtn({ icon, label }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-[64px] h-[64px] rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(80,80,80,0.40)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        {icon}
      </div>
      <span className="text-white/75 text-[13px]">{label}</span>
    </div>
  );
}

export default function IncomingCall({ onSelectPath }) {
  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400]);
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 overflow-hidden flex flex-col select-none"
      style={{
        background: 'linear-gradient(180deg, #3a3d42 0%, #2c2f33 35%, #1c1e21 65%, #111214 100%)',
      }}
    >
      <StarfieldCanvas />
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)' }}
      />

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center pt-20">
        <motion.div
          className="flex items-center gap-1.5 mb-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="20" fill="#25D366" />
            <path d="M28.7 11.3A11.9 11.9 0 0 0 20 8C13.4 8 8 13.4 8 20c0 2.1.5 4.1 1.5 5.9L8 32l6.3-1.6c1.7.9 3.7 1.4 5.7 1.4 6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.3-8.5zm-8.7 18.4c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.3-.4a9.9 9.9 0 0 1-1.5-5.3c0-5.5 4.5-10 10-10 2.7 0 5.2 1 7 2.9 1.9 1.9 2.9 4.3 2.9 7 0 5.5-4.5 10-10 10zm5.5-7.5c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-1-.5-2-1-2.7-2-.6-.7-1.3-1.6-1.4-1.9-.1-.3 0-.5.1-.7l.5-.5c.1-.2.2-.4.3-.6.1-.2 0-.4 0-.6-.1-.2-.7-1.8-.9-2.4-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.1 3.1 1.3 3.3c.2.2 2.2 3.4 5.3 4.7.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.2-.6-.4z" fill="white" />
          </svg>
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '17px' }}>Audio WhatsApp...</span>
        </motion.div>

        <motion.h1
          style={{ fontSize: 'clamp(2rem, 7vw, 2.8rem)', fontWeight: '300', color: '#fff', letterSpacing: '-0.02em' }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          Associé Uriel 😊✨
        </motion.h1>
      </div>

      {/* Center ripple */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <motion.div
          className="relative w-20 h-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <RippleRing delay={0} />
          <RippleRing delay={0.8} />
          <RippleRing delay={1.6} />
          <div className="w-full h-full rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }} />
        </motion.div>
      </div>

      {/* Bottom */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 pb-14 px-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex w-full max-w-xs justify-between px-4">
          <SecondaryBtn
            label="Message"
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            }
          />
          <SecondaryBtn
            label="Rappeler plus tard"
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.8" />
                <polyline points="12 7 12 12 15 15" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            }
          />
        </div>

        <div className="w-full max-w-sm flex flex-col gap-4">
          <SwipeToAnswer label="Glisser pour le lieu" onUnlock={() => onSelectPath('map')} />
          <SwipeToAnswer label="Glisser pour me découvrir" onUnlock={() => onSelectPath('constellation')} />
        </div>
      </motion.div>
    </div>
  );
}
