import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Fingerprint, Zap, X } from 'lucide-react';
import { playClick, playWhoosh, haptic, HAPTIC } from '../../lib/audio';

const CARDS = [
  {
    id: 'MAP',
    label: 'Localisation',
    sub: 'Carte & itinéraire',
    Icon: MapPin,
    accent: '#60a5fa',        // blue-400
    bg: 'from-blue-900/40 to-void',
  },
  {
    id: 'SELF',
    label: 'Identité',
    sub: 'L\'univers d\'Uriel',
    Icon: Fingerprint,
    accent: '#c9a86a',        // gold
    bg: 'from-amber-900/30 to-void',
  },
  {
    id: 'CONTACT',
    label: 'Événement',
    sub: 'Créer mon expérience',
    Icon: Zap,
    accent: '#a78bfa',        // purple-400
    bg: 'from-purple-900/30 to-void',
  },
];

export default function AppSwitcher({ activeApp, onSelect, onClose }) {
  const scrollRef = useRef(null);

  const handleSelect = (id) => {
    playClick();
    haptic(HAPTIC.medium);
    onSelect(id);
  };

  const handleClose = () => {
    playWhoosh();
    haptic(HAPTIC.soft);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[90] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-14 pb-4 shrink-0">
        <span
          className="text-white/40 text-xs tracking-[0.2em] uppercase"
          style={{ fontFamily: 'var(--font-mono, monospace)' }}
        >
          Multitâche
        </span>
        <button
          onClick={handleClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform"
        >
          <X size={16} className="text-white/70" />
        </button>
      </div>

      {/* Scroll horizontale des fenêtres */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center overflow-x-auto snap-x snap-mandatory no-scrollbar px-8 gap-5"
        style={{ scrollPaddingLeft: '2rem' }}
      >
        {CARDS.map((card, i) => {
          const isActive = card.id === activeApp;
          return (
            <motion.div
              key={card.id}
              initial={{ scale: 0.85, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 340, damping: 28 }}
              onClick={() => handleSelect(card.id)}
              className="snap-center shrink-0 relative flex flex-col cursor-pointer group"
              style={{ width: 'clamp(200px, 65vw, 280px)' }}
            >
              {/* App window card */}
              <div
                className={`
                  w-full aspect-[9/16] rounded-[2rem] overflow-hidden relative
                  border transition-all duration-300
                  ${isActive
                    ? 'border-white/40 shadow-[0_0_0_2px_rgba(255,255,255,0.2)]'
                    : 'border-white/10 group-hover:border-white/20'
                  }
                `}
                style={{
                  background: `linear-gradient(160deg, var(--bg-start, #0a0a0a), #030303)`,
                }}
              >
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-b ${card.bg} pointer-events-none`} />

                {/* Content preview */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: `${card.accent}18`, border: `1px solid ${card.accent}30` }}
                  >
                    <card.Icon size={28} style={{ color: card.accent }} />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-white text-sm font-medium tracking-wide">{card.label}</p>
                    <p className="text-white/40 text-xs mt-1">{card.sub}</p>
                  </div>
                </div>

                {/* Active indicator dot at top */}
                {isActive && (
                  <motion.div
                    layoutId="active-dot"
                    className="absolute top-3 right-3 w-2 h-2 rounded-full bg-white"
                  />
                )}
              </div>

              {/* Label below card (iOS style) */}
              <p className="mt-3 text-center text-xs text-white/50 tracking-wider uppercase">
                {card.label}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="shrink-0 pb-10 pt-4 flex justify-center">
        <span className="text-white/20 text-[10px] tracking-[0.25em] uppercase">
          Glissez · Sélectionnez
        </span>
      </div>
    </motion.div>
  );
}
