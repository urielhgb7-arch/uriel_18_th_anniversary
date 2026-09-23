import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import content from '../../content.json';
import { startRingtone, stopRingtone, haptic, HAPTIC, playClick } from '../../lib/audio';

/**
 * Acte I — Appel entrant iOS.
 *
 * L'illusion tient à trois détails que les imitations ratent d'habitude :
 *  - la typo système réelle (SF Pro sur iPhone) via --font-ios, pas une webfont ;
 *  - le nom en poids 300 et non en gras, comme le vrai écran d'appel ;
 *  - "Refuser" et "Accepter" en 400, taille 17px, à 96px d'écart exact.
 *
 * Le bouton rouge est présent et fonctionnel : un écran d'appel sans refus se
 * repère immédiatement. Refuser rappelle simplement l'appel quelques secondes
 * plus tard — on ne peut pas laisser un cul-de-sac sur la porte d'entrée.
 */

const AcceptIcon = () => (
  <svg width="33" height="33" viewBox="0 0 24 24" fill="white" aria-hidden="true">
    <path d="M6.6 10.8c1.5 2.9 3.7 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1l-2.2 2.3Z" />
  </svg>
);

/** Même glyphe, pivoté : exactement ce que fait iOS pour le bouton refuser. */
const DeclineIcon = () => (
  <svg
    width="33"
    height="33"
    viewBox="0 0 24 24"
    fill="white"
    style={{ transform: 'rotate(135deg)' }}
    aria-hidden="true"
  >
    <path d="M6.6 10.8c1.5 2.9 3.7 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1l-2.2 2.3Z" />
  </svg>
);

const RemindIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9.5V13l2.5 1.6M5 4.2 7 2.4M19 4.2 17 2.4" strokeLinecap="round" />
  </svg>
);

const MessageIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="white" aria-hidden="true">
    <path d="M12 3C6.9 3 2.8 6.4 2.8 10.6c0 2.4 1.3 4.5 3.4 5.9-.2 1.5-.9 2.7-1.6 3.4 1.6-.2 3.4-1 4.6-1.9 .9.2 1.8.3 2.8.3 5.1 0 9.2-3.4 9.2-7.7S17.1 3 12 3Z" />
  </svg>
);

/** Action secondaire : rond translucide + label 13px, comme iOS. */
function SecondaryAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-[9px] w-[84px] transition-opacity active:opacity-55"
    >
      <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center bg-white/[0.18] backdrop-blur-xl">
        {icon}
      </div>
      <span className="text-white/95 text-[13px]" style={{ fontFamily: 'var(--font-ios)' }}>
        {label}
      </span>
    </button>
  );
}

/** Bouton d'appel principal : 76px, le diamètre réel iOS. */
function CallButton({ variant, label, onClick, pulse = false }) {
  const isAccept = variant === 'accept';
  return (
    <div className="flex flex-col items-center gap-[11px]">
      <div className="relative">
        {/* Halo respirant : attire l'œil sur "Accepter" sans être voyant. */}
        {pulse && (
          <motion.span
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'var(--color-ios-green)' }}
            animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <motion.button
          onClick={onClick}
          aria-label={label}
          className="relative w-[76px] h-[76px] rounded-full flex items-center justify-center"
          style={{
            background: isAccept ? 'var(--color-ios-green)' : 'var(--color-ios-red)',
            boxShadow: `0 6px 22px ${isAccept ? 'rgba(52,199,89,0.42)' : 'rgba(255,59,48,0.38)'}`,
          }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 520, damping: 26 }}
        >
          {isAccept ? <AcceptIcon /> : <DeclineIcon />}
        </motion.button>
      </div>
      <span className="text-white/95 text-[17px]" style={{ fontFamily: 'var(--font-ios)' }}>
        {label}
      </span>
    </div>
  );
}

export default function IncomingCall({ onAccept }) {
  const { caller } = content.event;
  // Un timer de rappel peut être en vol au démontage : il faut pouvoir l'annuler.
  const recallTimer = useRef(null);

  useEffect(() => {
    startRingtone();
    haptic(HAPTIC.ring);
    // Relance la vibration en phase avec le cycle de sonnerie (3,2 s).
    const buzz = setInterval(() => haptic(HAPTIC.ring), 3200);

    return () => {
      clearInterval(buzz);
      clearTimeout(recallTimer.current);
      stopRingtone();
      haptic(0);
    };
  }, []);

  const handleAccept = () => {
    stopRingtone();
    haptic(HAPTIC.impact);
    onAccept();
  };

  /**
   * Refuser coupe la sonnerie puis rappelle. Le bouton doit exister pour que
   * l'écran soit crédible, mais il ne peut pas être une sortie définitive.
   */
  const handleDecline = () => {
    stopRingtone();
    haptic(HAPTIC.soft);
    playClick();
    recallTimer.current = setTimeout(() => {
      startRingtone();
      haptic(HAPTIC.ring);
    }, 2600);
  };

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      {/* Fond très sombre et flou : le rendu d'un appel sans photo de contact. */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#1a1d23 0%,#0d0f13 55%,#07080b 100%)' }} />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 22%,rgba(120,135,160,0.22),transparent 62%)', filter: 'blur(30px)' }}
      />

      <div className="relative z-10 flex flex-col w-full h-full">
        <div className="pt-safe" />

        {/* Identité de l'appelant */}
        <motion.div
          className="flex flex-col items-center mt-[13vh] px-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Monogramme : ce qu'affiche iOS quand le contact n'a pas de photo. */}
          <div
            className="w-[92px] h-[92px] rounded-full flex items-center justify-center mb-6"
            style={{
              background: 'linear-gradient(160deg,#8e9199,#5c6069)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.28)',
            }}
          >
            <span
              className="text-white text-[40px]"
              style={{ fontFamily: 'var(--font-ios)', fontWeight: 400 }}
            >
              {caller.initials}
            </span>
          </div>

          {/* Poids 300, pas gras : détail décisif pour la crédibilité. */}
          <h1
            className="text-white text-center"
            style={{
              fontFamily: 'var(--font-ios)',
              fontSize: 'clamp(34px,9.5vw,42px)',
              fontWeight: 300,
              letterSpacing: '-0.015em',
              lineHeight: 1.1,
            }}
          >
            {caller.name}
          </h1>

          <motion.p
            className="text-white/62 text-[19px] mt-[9px]"
            style={{ fontFamily: 'var(--font-ios)', fontWeight: 400 }}
            animate={{ opacity: [0.62, 0.95, 0.62] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {caller.label}
          </motion.p>
        </motion.div>

        <div className="flex-1" />

        {/* Actions */}
        <motion.div
          className="flex flex-col items-center w-full px-8 pb-safe"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex justify-center gap-[74px] mb-11">
            <SecondaryAction icon={<RemindIcon />} label="Rappel" onClick={handleDecline} />
            <SecondaryAction icon={<MessageIcon />} label="Message" onClick={handleDecline} />
          </div>

          <div className="flex justify-center gap-[96px] mb-7">
            <CallButton variant="decline" label="Refuser" onClick={handleDecline} />
            <CallButton variant="accept" label="Accepter" onClick={handleAccept} pulse />
          </div>

          <div className="w-[135px] h-[5px] rounded-full bg-white/70 mb-1" />
        </motion.div>
      </div>
    </motion.div>
  );
}

