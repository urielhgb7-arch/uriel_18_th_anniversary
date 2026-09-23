import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import content from '../../content.json';
import { playWhoosh, haptic, HAPTIC } from '../../lib/audio';

/**
 * Le dernier écran : l'invitation elle-même.
 *
 * Verrouillé jusqu'au claquement. C'est volontaire : tout ce qui précède est
 * une mise en scène, et la récompense doit être la seule chose qui reste à
 * l'écran quand la 3D s'est désintégrée. Le lien WhatsApp est l'unique action
 * du site — il n'a donc aucun concurrent visuel ici.
 */

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** "2026-10-15" → "15 octobre 2026". Parsé à la main : `new Date('...')`
 *  décale d'un jour selon le fuseau, ce qui pourrait afficher la mauvaise date. */
function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!m) return iso ?? '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

function Detail({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-white/35 text-[9px] uppercase tracking-[0.3em]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </span>
      <span className="text-white/90 text-[15px]">{value}</span>
    </div>
  );
}

export default function FinalCTA({ unlocked = false }) {
  const { event, whatsapp, finalMessage } = content;

  const waHref = useMemo(
    () => `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(whatsapp.message)}`,
    [whatsapp.number, whatsapp.message],
  );

  return (
    <div className="relative w-full max-w-md">
      <AnimatePresence mode="wait">
        {!unlocked ? (
          <motion.div
            key="locked"
            className="flex flex-col items-center gap-4 py-20 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.6">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </motion.div>
            <p
              className="text-white/40 text-[10px] uppercase tracking-[0.34em]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Invitation scellée
            </p>
            <p className="text-white/25 text-[13px] max-w-[240px]">
              Le gantelet doit d'abord être utilisé.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, y: 40, filter: 'blur(14px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Halo derrière la carte : le seul point lumineux de l'écran. */}
            <div
              className="absolute -inset-16 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 50% 45%, rgba(139,92,246,0.28) 0%, rgba(14,165,233,0.1) 38%, transparent 70%)',
              }}
            />

            <div className="relative glass-nexus rounded-[28px] p-7 overflow-hidden">
              <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-vibranium to-transparent" />

              <p
                className="text-infinity/80 text-[9px] uppercase tracking-[0.36em] mb-5"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Invitation · 001
              </p>

              <h2
                className="text-white text-[clamp(28px,8.5vw,38px)] font-extrabold uppercase leading-[0.95] tracking-tight mb-4"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {finalMessage.title}
              </h2>

              <p className="text-white/60 text-[14px] leading-relaxed mb-8">
                {finalMessage.subtitle}
              </p>

              <div className="grid grid-cols-2 gap-5 mb-9">
                <Detail label="Date" value={formatDate(event.date)} />
                <Detail label="Lieu" value={event.location.name} />
                <Detail label="Hôte" value={event.caller.name} />
                <Detail label="Adresse" value={event.location.venue} />
              </div>

              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  playWhoosh();
                  haptic(HAPTIC.impact);
                }}
                className="group relative flex items-center justify-center gap-3 w-full h-14 rounded-2xl overflow-hidden
                           text-white font-semibold text-[16px] transition-transform active:scale-[0.98]"
                style={{ background: 'linear-gradient(120deg, #8b5cf6 0%, #0ea5e9 100%)' }}
              >
                {/* Reflet qui traverse le bouton : attire l'œil vers la seule action. */}
                <motion.span
                  className="absolute inset-y-0 w-1/3 pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }}
                  animate={{ x: ['-140%', '380%'] }}
                  transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
                />
                <svg viewBox="0 0 24 24" className="relative w-5 h-5" fill="currentColor">
                  <path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.2-.2.4-.5.6-.7.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.2-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.2 3.2.2.2 2.1 3.4 5.2 4.6 3.1 1.2 3.1.8 3.7.8.6-.1 1.8-.7 2.1-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.2-.6-.3Z" />
                  <path d="M12 2a10 10 0 0 0-8.4 15.4L2 22l4.7-1.5A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.4-1.3l-.3-.2-2.8.9.9-2.7-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
                </svg>
                <span className="relative">Confirmer ma présence</span>
              </a>

              <p className="text-center text-white/25 text-[11px] mt-4">
                Réponse par WhatsApp · {event.title}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
