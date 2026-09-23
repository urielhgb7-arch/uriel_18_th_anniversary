import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import content from '../../content.json';
import { useReducedMotion, usePerfTier, useTilt } from '../../lib/hooks';
import { playChime, playBraam, playSnap, playClick, haptic, HAPTIC } from '../../lib/audio';

/**
 * Le climax : rassembler les six pierres, puis claquer des doigts.
 *
 * Deux étapes :
 *  1. COLLECT — timeline 2D, une pierre par trait de caractère. Chaque pierre
 *     ouvre une fiche ; la lire la « sertit ».
 *  2. FORGE   — la main 3D apparaît (three.js, cf. lib/gauntlet.js). Un tap
 *     lance la charge, le claquement, puis la désintégration.
 *
 * three.js n'est chargé qu'à l'entrée en FORGE : inutile de le payer pour
 * quelqu'un qui n'arrive jamais jusqu'ici.
 */

/* `of` porte l'article correct par pierre : « de l' » ne marche pas pour
   Réalité, Pouvoir ni Temps, et une élision automatique sur la voyelle initiale
   se tromperait quand même sur le genre. Six entrées écrites à la main. */
const STONES = [
  { name: 'Espace', of: "de l'Espace", color: '#3b82f6' },
  { name: 'Esprit', of: "de l'Esprit", color: '#eab308' },
  { name: 'Réalité', of: 'de la Réalité', color: '#ef4444' },
  { name: 'Pouvoir', of: 'du Pouvoir', color: '#a855f7' },
  { name: 'Temps', of: 'du Temps', color: '#22c55e' },
  { name: 'Âme', of: "de l'Âme", color: '#f97316' },
];

/**
 * Fiche d'un trait.
 *
 * Fermer par le fond sertit la pierre, exactement comme le bouton : la fiche a
 * été ouverte, donc le fragment est acquis. Distinguer les deux gestes créerait
 * une impasse — une pierre ouverte puis « annulée » que l'invité croirait faite,
 * et un gantelet qui refuse de se forger sans qu'il comprenne pourquoi.
 */
function TraitSheet({ trait, stone, onClose }) {
  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <motion.div
        className="relative w-full max-w-sm rounded-3xl p-7 overflow-hidden"
        style={{
          background: 'rgba(10,5,20,0.94)',
          border: `1px solid ${stone.color}44`,
          boxShadow: `0 0 70px ${stone.color}33, inset 0 0 26px ${stone.color}1a`,
        }}
        initial={{ y: 40, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 24, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg,transparent,${stone.color},transparent)` }}
        />

        <div className="flex items-center gap-4 mb-6">
          <div
            className="relative w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: `${stone.color}22`, border: `1px solid ${stone.color}88` }}
          >
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ background: stone.color, filter: 'blur(9px)' }}
              animate={{ opacity: [0.3, 0.65, 0.3] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.26em] uppercase" style={{ color: stone.color, fontFamily: 'var(--font-mono)' }}>
              Pierre {stone.of}
            </p>
            <h3 className="text-white text-[20px] font-bold mt-1 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              {trait.title}
            </h3>
          </div>
        </div>

        <p className="text-white/70 text-[14px] leading-relaxed">{trait.desc}</p>

        <button
          onClick={onClose}
          className="mt-8 w-full py-3.5 rounded-2xl text-[11px] uppercase tracking-[0.24em] text-white/70 bg-white/5 active:bg-white/10 transition-colors"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Sertir la pierre
        </button>
      </motion.div>
    </motion.div>
  );
}

/** Étape 1 : la timeline des six pierres. */
function Collect({ traits, found, onPick }) {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10">
        <p className="text-infinity text-[10px] tracking-[0.42em] uppercase font-bold mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
          {found.length === 6 ? 'Flux temporel stabilisé' : `Fragments — ${found.length}/6`}
        </p>
        <h2
          className="text-white text-[34px] font-bold uppercase leading-none"
          style={{ fontFamily: 'var(--font-display)', textShadow: '0 0 24px rgba(212,175,55,0.4)' }}
        >
          Chronologie
        </h2>
        <p className="text-white/45 text-[13px] mt-2.5 max-w-[280px] mx-auto leading-relaxed">
          {found.length === 6
            ? 'Les six pierres sont réunies. Le gantelet peut être forgé.'
            : 'Touche chaque pierre pour révéler un fragment de qui je suis.'}
        </p>
      </div>

      <div className="relative flex items-center justify-between px-1">
        {/* Rail : se remplit au fil des découvertes. */}
        <div className="absolute left-5 right-5 top-1/2 -translate-y-1/2 h-px bg-white/10" />
        <motion.div
          className="absolute left-5 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-infinity to-vibranium"
          style={{ boxShadow: '0 0 8px rgba(212,175,55,0.6)' }}
          animate={{ width: `${(found.length / 6) * 88}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />

        {STONES.map((stone, i) => {
          const got = found.includes(i);
          return (
            <motion.button
              key={stone.name}
              onClick={() => onPick(i)}
              disabled={got}
              className="relative w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: got ? stone.color : '#120b20',
                border: `2px solid ${got ? stone.color : 'rgba(255,255,255,0.14)'}`,
                boxShadow: got ? `0 0 22px ${stone.color}, inset 0 0 9px rgba(255,255,255,0.5)` : 'none',
              }}
              whileTap={got ? undefined : { scale: 0.88 }}
              /* Le titre du trait est annoncé quand la pierre est sertie, sinon
                 le lecteur d'écran ne lit qu'une couleur sans contenu. */
              aria-label={
                got
                  ? `Pierre ${stone.of} — sertie : ${traits[i].title}`
                  : `Pierre ${stone.of} — révéler le fragment`
              }
            >
              {!got && <span className="w-1.5 h-1.5 rounded-full bg-white/25" />}
              {got && (
                <motion.span
                  className="absolute inset-0 rounded-full border border-white/70"
                  animate={{ scale: [1, 1.65], opacity: [0.6, 0] }}
                  transition={{ duration: 1.7, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Compteur textuel : redondance utile pour les lecteurs d'écran. */}
      <p className="sr-only" aria-live="polite">
        {found.length} pierres sur 6 rassemblées.
      </p>
    </div>
  );
}

/** Étape 2 : la main 3D et le claquement. */
function Forge({ onComplete }) {
  const canvasRef = useRef(null);
  const handleRef = useRef(null);
  const [state, setState] = useState('loading'); // loading | ready | running | gone
  const [flash, setFlash] = useState(false);
  const [line, setLine] = useState(0); // avancée du sous-titre

  const reduced = useReducedMotion();
  const tier = usePerfTier();
  const { tilt } = useTilt({ enabled: !reduced });

  /* Le parent recrée onComplete à chaque rendu. On le garde dans une ref :
     l'effet ci-dessous n'a donc pas à en dépendre — sinon la scène three.js
     serait démontée et reconstruite au moindre rendu du parent — tout en
     appelant toujours la version à jour. */
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  /* Les minuteries de mise en scène sont regroupées ici pour être annulées au
     démontage : sans ça, quitter l'écran pendant la charge laisse des timers
     qui réveillent un composant mort. */
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    let cancelled = false;

    import('../../lib/gauntlet')
      .then(({ mountGauntlet }) => {
        if (cancelled || !canvasRef.current) return;
        const handle = mountGauntlet(canvasRef.current, {
          tier,
          reduced,
          tilt,
          onFlash: () => {
            setFlash(true);
            playSnap();
            haptic(HAPTIC.snap);
            timers.current.push(setTimeout(() => setFlash(false), 900));
          },
          onDissolved: () => {
            setState('gone');
            completeRef.current?.();
          },
        });
        if (!handle) {
          // Sans WebGL : on ne bloque pas la fin du récit.
          setState('gone');
          completeRef.current?.();
          return;
        }
        handleRef.current = handle;
        setState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        // Le chunk three.js n'a pas pu être chargé (réseau coupé) : on délivre
        // quand même l'invitation plutôt que de laisser l'invité bloqué ici.
        setState('gone');
        completeRef.current?.();
      });

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
    };
  }, [tier, reduced, tilt]);

  const trigger = () => {
    if (state !== 'ready') return;
    setState('running');
    playBraam(3.4);
    haptic(HAPTIC.impact);
    handleRef.current?.snap();

    // Sous-titres calés sur la charge (2,6 s) : « Et moi… » puis la révélation.
    setLine(1);
    timers.current.push(setTimeout(() => setLine(2), 1300));
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Flash du claquement, au-dessus de tout. */}
      <AnimatePresence>
        {flash && (
          <motion.div
            className="fixed inset-0 z-[90] bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            /* Montée quasi instantanée, retombée lente : c'est ce contraste qui
               fait lire un flash plutôt qu'un fondu. */
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            transition={{ duration: 0.12 }}
          />
        )}
      </AnimatePresence>

      {/* Sous-titres */}
      <div className="h-24 flex flex-col items-center justify-center text-center px-6">
        <AnimatePresence mode="wait">
          {line === 1 && (
            <motion.p
              key="l1"
              className="text-white/55 text-[17px] italic tracking-wide"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              Et moi…
            </motion.p>
          )}
          {line === 2 && (
            <motion.h2
              key="l2"
              className="text-white text-[clamp(34px,11vw,50px)] font-bold uppercase leading-none"
              style={{ fontFamily: 'var(--font-display)', textShadow: '0 0 44px rgba(139,92,246,0.85)' }}
              initial={{ opacity: 0, scale: 0.92, filter: 'blur(12px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              Je suis Uriel.
            </motion.h2>
          )}
        </AnimatePresence>
      </div>

      {/* Scène 3D */}
      <button
        onClick={trigger}
        disabled={state !== 'ready'}
        className="relative w-full max-w-[340px] aspect-[3/4] cursor-pointer disabled:cursor-default"
        aria-label="Déclencher le claquement de doigts"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {state === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              className="w-8 h-8 rounded-full border-2 border-vibranium/30 border-t-vibranium"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}
      </button>

      <div className="h-12 flex items-center">
        <AnimatePresence>
          {state === 'ready' && (
            <motion.p
              className="text-white/45 text-[10px] uppercase tracking-[0.34em]"
              style={{ fontFamily: 'var(--font-mono)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.85, 0.3] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              Touchez le gantelet
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Gauntlet({ onComplete }) {
  const traits = content.constellationTraits;
  const [found, setFound] = useState([]);
  const [openIdx, setOpenIdx] = useState(null);
  const [stage, setStage] = useState('COLLECT');

  const stageTimer = useRef(0);
  useEffect(() => () => clearTimeout(stageTimer.current), []);

  const pick = (i) => {
    if (found.includes(i)) return;
    playClick();
    haptic(HAPTIC.tap);
    setOpenIdx(i);
  };

  const seal = () => {
    if (openIdx === null) return;
    const next = [...found, openIdx];
    setFound(next);
    setOpenIdx(null);
    playChime(523.25 + next.length * 55);
    haptic(HAPTIC.soft);

    // Les six pierres réunies : on passe à la forge après une courte respiration.
    if (next.length === 6) stageTimer.current = setTimeout(() => setStage('FORGE'), 1200);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <AnimatePresence mode="wait">
        {stage === 'COLLECT' ? (
          <motion.div key="collect" className="w-full flex justify-center" exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}>
            <Collect traits={traits} found={found} onPick={pick} />
          </motion.div>
        ) : (
          <motion.div
            key="forge"
            className="w-full flex justify-center"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <Forge onComplete={onComplete} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openIdx !== null && <TraitSheet trait={traits[openIdx]} stone={STONES[openIdx]} onClose={seal} />}
      </AnimatePresence>
    </div>
  );
}

