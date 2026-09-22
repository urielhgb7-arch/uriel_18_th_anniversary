import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronDown } from 'lucide-react';
import { toPng } from 'html-to-image';
import content from '../../content.json';

// ── Real star positions (named stars that feel authentic) ──────────────────────
const BACKGROUND_STARS = Array.from({ length: 240 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  // A few "bright" personality stars scattered in background
  r: i < 12 ? Math.random() * 2 + 2 : Math.random() * 1.2 + 0.3,
  bright: i < 12,
  twinkleOffset: Math.random() * Math.PI * 2,
  twinklePeriod: Math.random() * 2500 + 2000,
}));

// ── Stardust Particle Trail ────────────────────────────────────────────────────
function StardustTrail({ x1, y1, x2, y2, visible }) {
  const numParticles = 12;
  return (
    <g>
      {Array.from({ length: numParticles }).map((_, i) => {
        const t = i / (numParticles - 1);
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        const delay = t * 0.8;
        const size = (1 - Math.abs(t - 0.5) * 2) * 1.5 + 0.3;
        return (
          <motion.circle
            key={i}
            cx={px}
            cy={py}
            r={size}
            fill="url(#stardust)"
            initial={{ opacity: 0, scale: 0 }}
            animate={visible
              ? { opacity: [0, 0.9, 0.5], scale: [0, 1.2, 1] }
              : { opacity: 0, scale: 0 }
            }
            transition={{
              duration: 1.2,
              delay: visible ? delay : 0,
              ease: 'easeOut',
            }}
            style={{ filter: 'blur(0.3px)' }}
          />
        );
      })}
      {/* Core glow line */}
      <motion.line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="url(#lineGrad)"
        strokeWidth="0.3"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={visible ? { pathLength: 1, opacity: 0.4 } : { pathLength: 0, opacity: 0 }}
        transition={{ duration: 1, ease: 'easeInOut', delay: 0.3 }}
      />
    </g>
  );
}

// ── Background Star Field ──────────────────────────────────────────────────────
function BackgroundField() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="brightStar" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff9e0" stopOpacity="1" />
          <stop offset="40%" stopColor="#ffd700" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dimStar" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e0e8ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#7c9eff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="stardust" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd700" stopOpacity="1" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffd700" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.6" />
        </linearGradient>
        {/* Nebula filters */}
        <filter id="nebula1">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="nebula2">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* Nebula clouds */}
      <ellipse cx="25" cy="30" rx="20" ry="15" fill="rgba(100,60,220,0.07)" filter="url(#nebula1)" />
      <ellipse cx="75" cy="65" rx="22" ry="16" fill="rgba(60,180,160,0.05)" filter="url(#nebula2)" />
      <ellipse cx="50" cy="80" rx="18" ry="12" fill="rgba(180,80,220,0.06)" filter="url(#nebula1)" />

      {/* Background stars */}
      {BACKGROUND_STARS.map((s) => {
        const tNow = Date.now();
        const brightness = 0.4 + 0.6 * Math.sin((tNow / s.twinklePeriod) * Math.PI * 2 + s.twinkleOffset);
        return (
          <g key={s.id}>
            {s.bright && (
              <circle
                cx={s.x}
                cy={s.y}
                r={s.r * 3.5}
                fill="url(#brightStar)"
                opacity={brightness * 0.3}
              />
            )}
            <circle
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill={s.bright ? '#fff9d0' : '#e0e8ff'}
              opacity={s.bright ? brightness : brightness * 0.6}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ── Trait Card ─────────────────────────────────────────────────────────────────
function TraitCard({ trait, onClose }) {
  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 z-50"
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '80%', opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
    >
      {/* Click-away overlay */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="relative z-50 mx-4 mb-8 p-6 rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(15,10,35,0.80)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,215,0,0.25)',
          boxShadow: '0 0 60px rgba(167,139,250,0.25), 0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />

        {/* Star icon */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffd700">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </div>
          <div>
            <p className="text-yellow-400/70 text-[10px] uppercase tracking-[0.2em] font-medium">Trait de caractère</p>
            <h3
              className="text-white text-xl font-bold"
              style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.03em' }}
            >
              {trait.title}
            </h3>
          </div>
        </div>

        <p className="text-white/65 text-[15px] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {trait.desc}
        </p>

        {/* Close hint */}
        <p className="text-white/25 text-[11px] text-center mt-5 uppercase tracking-widest">
          Toucher ailleurs pour continuer
        </p>
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ConstellationGame() {
  const [discovered, setDiscovered] = useState(0);
  const [activeCard, setActiveCard] = useState(null); // trait object or null
  const [showExport, setShowExport] = useState(false);
  const [cardClosed, setCardClosed] = useState(false);
  const containerRef = useRef(null);

  const traits = content.constellationTraits;
  const isComplete = discovered === traits.length;

  // Connection path data between consecutive stars
  const connections = traits.slice(0, -1).map((t, i) => ({
    x1: traits[i].x,
    y1: traits[i].y,
    x2: traits[i + 1].x,
    y2: traits[i + 1].y,
    visible: discovered > i + 1,
  }));

  const handleStarClick = useCallback((trait, index) => {
    if (index !== discovered) return;
    setActiveCard(trait);
    setCardClosed(false);
  }, [discovered]);

  const handleCardClose = useCallback(() => {
    setCardClosed(true);
    setActiveCard(null);
    const next = discovered + 1;
    setDiscovered(next);
    if (next === traits.length) {
      setTimeout(() => setShowExport(true), 1500);
    }
  }, [discovered, traits.length]);

  const exportImage = async () => {
    if (containerRef.current) {
      const dataUrl = await toPng(containerRef.current, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'uriel-constellation-vouh.png';
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      <div className="relative w-full h-full overflow-hidden flex flex-col">
        {/* Exportable container */}
        <div
          ref={containerRef}
          className="relative flex-1 w-full flex flex-col items-center justify-start overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #050714 0%, #0a0520 40%, #090222 100%)' }}
        >
          {/* Background starfield */}
          <div className="absolute inset-0">
            <BackgroundField />
          </div>

          {/* Header */}
          <motion.div
            className="relative z-10 text-center mt-10 mb-4"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-yellow-400/50 text-[10px] tracking-[0.3em] uppercase font-medium mb-1"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {isComplete ? 'Constellation complète' : `Étoile ${discovered + 1} / ${traits.length}`}
            </p>
            <h1
              className="text-white text-3xl font-black"
              style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.04em' }}
            >
              VOUH
            </h1>
            <p className="text-white/30 text-[11px] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {isComplete ? 'Tu me connais maintenant.' : "Touche l'étoile qui pulse"}
            </p>
          </motion.div>

          {/* SVG constellation area */}
          <div className="relative w-full max-w-md flex-1 min-h-0 px-4">
            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <radialGradient id="stardust" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffd700" stopOpacity="1" />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffd700" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.6" />
                </linearGradient>
                <filter id="starGlow">
                  <feGaussianBlur stdDeviation="1.5" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="bigGlow">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Stardust trails between stars */}
              {connections.map((c, i) => (
                <StardustTrail key={i} {...c} />
              ))}

              {/* Trait star nodes */}
              {traits.map((trait, i) => {
                const isDiscovered = discovered > i;
                const isCurrent = discovered === i;
                const isNextUp = discovered === i;

                return (
                  <g
                    key={`star-node-${i}`}
                    onClick={() => handleStarClick(trait, i)}
                    style={{ cursor: isCurrent ? 'pointer' : 'default' }}
                  >
                    {/* Outer pulse halo for current star */}
                    {isNextUp && (
                      <>
                        <motion.circle
                          cx={trait.x} cy={trait.y} r="6"
                          fill="rgba(255,215,0,0.08)"
                          animate={{ r: [4, 9, 4], opacity: [0.5, 0.1, 0.5] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <motion.circle
                          cx={trait.x} cy={trait.y} r="3.5"
                          fill="rgba(255,215,0,0.2)"
                          animate={{ r: [2.5, 5.5, 2.5], opacity: [0.8, 0.2, 0.8] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                        />
                      </>
                    )}

                    {/* Star body */}
                    <motion.circle
                      cx={trait.x}
                      cy={trait.y}
                      r={isDiscovered ? 2.2 : isCurrent ? 2 : 1}
                      fill={isDiscovered ? '#ffd700' : isCurrent ? '#fff9a0' : 'rgba(255,255,255,0.25)'}
                      animate={{
                        r: isDiscovered ? 2.2 : isCurrent ? 2 : 1,
                        filter: (isDiscovered || isCurrent)
                          ? 'drop-shadow(0 0 4px #ffd700)'
                          : 'none',
                      }}
                      transition={{ duration: 0.5 }}
                      filter={isDiscovered || isCurrent ? 'url(#starGlow)' : undefined}
                    />

                    {/* Discovered star inner glow */}
                    {isDiscovered && (
                      <circle
                        cx={trait.x} cy={trait.y} r={5}
                        fill="rgba(255,215,0,0.07)"
                        filter="url(#bigGlow)"
                      />
                    )}

                    {/* Star label (show after discovered) */}
                    {isDiscovered && (
                      <motion.text
                        x={trait.x + (trait.x > 60 ? -2.5 : 2.5)}
                        y={trait.y - 3}
                        textAnchor={trait.x > 60 ? 'end' : 'start'}
                        fill="rgba(255,215,0,0.75)"
                        fontSize="3"
                        fontFamily="'DM Sans', sans-serif"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        {trait.title}
                      </motion.text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Export button */}
          <AnimatePresence>
            {showExport && (
              <motion.button
                onClick={exportImage}
                className="relative z-20 mb-8 flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-black"
                style={{
                  background: 'linear-gradient(135deg, #ffd700, #f0a500)',
                  boxShadow: '0 0 40px rgba(255,215,0,0.5), 0 8px 24px rgba(0,0,0,0.4)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                whileTap={{ scale: 0.95 }}
              >
                <Download size={16} />
                Sauvegarder ma constellation
              </motion.button>
            )}
          </AnimatePresence>

          {/* Scroll indicator */}
          <AnimatePresence>
            {isComplete && !showExport && (
              <motion.div
                className="absolute bottom-6 flex flex-col items-center text-white/40 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                <span className="text-[9px] uppercase tracking-[0.25em] mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Continuer
                </span>
                <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <ChevronDown size={20} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trait Card overlay */}
        <AnimatePresence>
          {activeCard && (
            <TraitCard key="trait-card" trait={activeCard} onClose={handleCardClose} />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
