import { useEffect } from 'react';
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

/**
 * Épingle de localisation → Univers A.
 * Rupture volontaire avec iOS : c'est ce décalage qui annonce le multivers.
 * Le glyphe remplace le combiné vert, la place et la taille restent iOS.
 */
const PinIcon = () => (
  <svg width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21.5c4.3-4.9 6.5-8.4 6.5-11.4A6.5 6.5 0 0 0 5.5 10c0 3 2.2 6.5 6.5 11.5Z" />
    <circle cx="12" cy="9.8" r="2.4" />
  </svg>
);

/** Empreinte digitale → Univers B. */
const FingerprintIcon = () => (
  <svg width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <path d="M12 3.5a8.5 8.5 0 0 0-8.5 8.5c0 1.3.2 2.5.7 3.6" />
    <path d="M20.5 12A8.5 8.5 0 0 0 12 3.5" />
    <path d="M19.9 16.4c.4-1.4.6-2.9.6-4.4a8.5 8.5 0 0 0-.6-3.1" />
    <path d="M12 7a5 5 0 0 0-5 5c0 2.4.4 4.3 1.2 6.1" />
    <path d="M17 12a5 5 0 0 0-5-5" />
    <path d="M16.6 19.3c.7-2 1-4.3 1-7.3" />
    <path d="M12 10.5a1.5 1.5 0 0 0-1.5 1.5c0 3 .4 5.6 1.1 7.8" />
    <path d="M13.9 20.4c-.3-1.3-.4-2.8-.4-4.4v-4" />
  </svg>
);

/**
 * Les deux chemins, au diamètre réel iOS (76px) et à l'écart réel (96px).
 * Ni vert ni rouge : ce n'est plus accepter/refuser mais un embranchement, donc
 * les deux portent exactement le même poids visuel. Le halo respire des deux
 * côtés, décalé, pour qu'aucun des deux ne se lise comme l'action par défaut.
 */
import { LiquidButton } from '../ui/liquid-glass-button';
import { useMotionValue, useTransform } from 'framer-motion';

function SlideAction({ onPick }) {
  const x = useMotionValue(0);

  const handleDragEnd = (event, info) => {
    if (info.offset.x < -90) {
      onPick('MAP');
    } else if (info.offset.x > 90) {
      onPick('SELF');
    }
  };

  const pinOpacity = useTransform(x, [0, -60], [0, 1]);
  const fingerOpacity = useTransform(x, [0, 60], [0, 1]);
  const defaultOpacity = useTransform(x, [-40, 0, 40], [0, 1, 0]);

  return (
    <div className="relative w-[300px] h-[86px] flex items-center justify-center">
      {/* Background track */}
      <div className="absolute w-[300px] h-[76px] rounded-full bg-white/5 backdrop-blur-md border border-white/10 shadow-inner flex items-center justify-between px-6">
        <div className="opacity-40 flex items-center justify-center">
          <PinIcon />
        </div>
        <div className="opacity-40 flex items-center justify-center">
          <FingerprintIcon />
        </div>
      </div>
      
      {/* Draggable button */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="z-10 absolute flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <LiquidButton variant="default" size="icon" className="w-[76px] h-[76px] rounded-full p-0">
          <div className="relative w-full h-full flex items-center justify-center">
             <motion.div style={{ opacity: defaultOpacity }} className="absolute flex items-center justify-center">
               <div className="w-[12px] h-[12px] rounded-full bg-white/60" />
             </motion.div>
             <motion.div style={{ opacity: pinOpacity }} className="absolute flex items-center justify-center text-primary">
               <PinIcon />
             </motion.div>
             <motion.div style={{ opacity: fingerOpacity }} className="absolute flex items-center justify-center text-primary">
               <FingerprintIcon />
             </motion.div>
          </div>
        </LiquidButton>
      </motion.div>
    </div>
  );
}

export default function IncomingCall({ onPick }) {
  const { caller } = content.event;

  useEffect(() => {
    startRingtone();
    haptic(HAPTIC.ring);
    // Relance la vibration en phase avec le cycle de sonnerie (3,2 s).
    const buzz = setInterval(() => haptic(HAPTIC.ring), 3200);

    return () => {
      clearInterval(buzz);
      stopRingtone();
      haptic(0);
    };
  }, []);

  /**
   * Les deux glyphes mènent au même plongeon, avec une destination différente.
   * Plus de refus : l'écran n'est plus un appel à accepter mais le carrefour du
   * récit, donc il n'y a pas de sortie « non ».
   */
  const pick = (universe) => {
    stopRingtone();
    haptic(HAPTIC.impact);
    playClick();
    onPick(universe);
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
          className="flex flex-col items-center w-full px-8 pb-safe mb-[8vh]"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <SlideAction onPick={pick} />
        </motion.div>
      </div>
    </motion.div>
  );
}

