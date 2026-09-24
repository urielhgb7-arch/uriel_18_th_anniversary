import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import content from '../../content.json';
import { useReducedMotion, usePerfTier, useTilt } from '../../lib/hooks';
import { playChime, playBraam, playSnap, playClick, haptic, HAPTIC } from '../../lib/audio';

/**
 * Le climax : six pierres posées sur des lignes de temps divergentes, puis le
 * claquement.
 *
 * Tout tient dans UNE scène three.js continue (cf. lib/gauntlet.js) — plus
 * d'étape 2D suivie d'une étape 3D. Les pierres sont de vraies formes 3D
 * touchées directement dans le canvas, et chaque pierre sertie fait avancer la
 * main d'un degré de réel. Le texte du claquement est rendu DANS la scène, sur
 * deux plans de profondeur : « Et moi… » derrière la main, « Je suis Uriel. »
 * devant.
 *
 * Le canvas est donc le contenu, pas un décor. Trois conséquences :
 *  - l'action principale est un tap sur une pierre, dans le canvas ;
 *  - un canvas n'expose rien aux lecteurs d'écran, d'où les six boutons
 *    équivalents en bas, masqués à l'œil mais focusables au clavier ;
 *  - three.js reste en import dynamique. Le gant est désormais en haut de la
 *    page, donc il se charge tôt, mais il ne retarde pas le premier rendu.
 */

const SEEN_KEY = 'uriel.snap.seen';

/* `of` porte l'article correct par pierre : « de l' » ne marche pas pour
   Réalité, Pouvoir ni Temps, et une élision automatique sur la voyelle initiale
   se tromperait quand même sur le genre. Six entrées écrites à la main.
   Les teintes reprennent exactement STONE_COLORS de lib/gauntlet.js. */
const STONES = [
  { name: 'Espace', of: "de l'Espace", color: '#5b8fd4' },
  { name: 'Esprit', of: "de l'Esprit", color: '#d6b64a' },
  { name: 'Réalité', of: 'de la Réalité', color: '#d45b52' },
  { name: 'Pouvoir', of: 'du Pouvoir', color: '#9068c4' },
  { name: 'Temps', of: 'du Temps', color: '#4fae74' },
  { name: 'Âme', of: "de l'Âme", color: '#d98a4a' },
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
          background: 'rgba(11,11,17,0.94)',
          border: `1px solid ${stone.color}33`,
          boxShadow: `0 0 70px ${stone.color}22`,
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
            className="relative w-11 h-11 rounded-full shrink-0"
            style={{ background: `${stone.color}1f`, border: `1px solid ${stone.color}66` }}
          >
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ background: stone.color, filter: 'blur(9px)' }}
              animate={{ opacity: [0.25, 0.55, 0.25] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
          </div>
          <div>
            <p className="label-mono" style={{ color: stone.color }}>
              Pierre {stone.of}
            </p>
            <h3 className="text-ink text-[21px] mt-1.5 leading-tight">{trait.title}</h3>
          </div>
        </div>

        <p className="text-ink/70 text-[14px] leading-relaxed">{trait.desc}</p>

        <button
          onClick={onClose}
          className="label-mono mt-8 w-full py-3.5 rounded-2xl bg-ink/5 active:bg-ink/10 transition-colors"
        >
          Sertir la pierre
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function Gauntlet({ onComplete }) {
  const traits = content.constellationTraits;

  const canvasRef = useRef(null);
  const handleRef = useRef(null);
  const doneRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [found, setFound] = useState([]);
  const [openIdx, setOpenIdx] = useState(null);
  const [cine, setCine] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [line, setLine] = useState(0);
  const [flash, setFlash] = useState(false);
  const [gone, setGone] = useState(false);

  const reduced = useReducedMotion();
  const tier = usePerfTier();
  const { tilt } = useTilt({ enabled: !reduced });

  /* Le parent recrée onComplete à chaque rendu. On le garde dans une ref :
     l'effet de montage n'a donc pas à en dépendre — sinon la scène three.js
     serait démontée et reconstruite au moindre rendu du parent — tout en
     appelant toujours la version à jour. */
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  /* Minuteries de mise en scène, annulées au démontage : sans ça, quitter
     l'écran pendant la charge laisse des timers qui réveillent un composant
     mort. */
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /** Idempotent : la scène et le bouton « passer » peuvent tous deux y mener. */
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setGone(true);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Navigation privée ou stockage refusé : on perd juste le raccourci.
    }
    completeRef.current?.();
  }, []);

  useEffect(() => {
    let cancelled = false;

    import('../../lib/gauntlet')
      .then(({ mountGauntlet }) => {
        if (cancelled || !canvasRef.current) return;

        const handle = mountGauntlet(canvasRef.current, {
          tier,
          reduced,
          tilt,
          // Un tap dans le canvas : la scène a déjà trouvé la pierre la plus
          // proche du doigt et vérifié qu'elle n'est pas sertie.
          onStoneTap: (i) => {
            playClick();
            haptic(HAPTIC.tap);
            setOpenIdx(i);
          },
          onFlash: () => {
            setFlash(true);
            playSnap();
            haptic(HAPTIC.snap);
            timers.current.push(setTimeout(() => setFlash(false), 900));
          },
          // Les répliques sont affichées dans la scène ; ici on ne tient que
          // l'équivalent textuel pour les lecteurs d'écran.
          onLine: setLine,
          onCollapse: () => haptic(HAPTIC.soft),
          onDone: finish,
        });

        if (!handle) {
          // Pas de WebGL : on ne bloque pas la fin du récit.
          setFailed(true);
          finish();
          return;
        }
        handleRef.current = handle;
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        // Le chunk three.js n'a pas pu être chargé (réseau coupé) : on délivre
        // quand même l'invitation plutôt que de laisser l'invité bloqué ici.
        setFailed(true);
        finish();
      });

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, [tier, reduced, tilt, finish]);

  /** La fiche se ferme : la pierre est sertie, la main gagne un degré de réel. */
  const seal = () => {
    if (openIdx === null) return;
    const i = openIdx;
    setOpenIdx(null);
    if (found.includes(i)) return;

    const next = [...found, i];
    setFound(next);
    handleRef.current?.collect(i);
    playChime(523.25 + next.length * 55);
    haptic(HAPTIC.soft);
  };

  const snap = () => {
    if (cine || found.length < 6) return;
    setCine(true);
    playBraam(3.4);
    haptic(HAPTIC.impact);
    handleRef.current?.snap();

    /* Non interruptible d'emblée : c'est la récompense. Le bouton « passer »
       n'apparaît qu'au bout de 2,5 s — et immédiatement si la cinématique a
       déjà été vue lors d'une visite précédente. */
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      // Stockage indisponible : on retombe sur le délai normal.
    }
    timers.current.push(setTimeout(() => setCanSkip(true), seen ? 0 : 2500));
  };

  const skip = () => {
    playClick();
    handleRef.current?.skip();
  };

  const complete = found.length === 6;

  return (
    <div className="w-full flex flex-col items-center">
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

      <div className="text-center mb-7 px-6">
        <p className="label-mono mb-3">
          {cine ? 'Flux temporel' : complete ? 'Les six pierres sont réunies' : `Pierres — ${found.length}/6`}
        </p>
        <h2 className="text-ink text-[clamp(30px,9vw,42px)] leading-[1.05]">
          {complete ? 'Le gantelet' : 'Lignes de temps'}
        </h2>
        <p className="text-muted text-[13.5px] mt-3 max-w-[290px] mx-auto leading-relaxed">
          {cine
            ? null
            : complete
              ? 'La main a pris forme. Claquez des doigts.'
              : 'Touchez une pierre sur les branches : chacune révèle un fragment de qui je suis, et la main gagne un degré de réel.'}
        </p>
      </div>

      {/* La scène : pierres, branches et main dans un seul canvas. */}
      <div
        className="relative w-full max-w-[380px] aspect-[3/4.2] rounded-[28px] overflow-hidden"
        style={{ background: '#06060a' }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          style={{ opacity: gone ? 0 : 1, transition: 'opacity 700ms var(--ease-signature)' }}
        />

        {!ready && !failed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              className="w-8 h-8 rounded-full border border-accent/25 border-t-accent"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}

        {failed && (
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <p className="text-muted text-[13px] text-center leading-relaxed">
              Votre navigateur ne peut pas afficher la scène 3D. Le reste de l'invitation
              vous attend plus bas.
            </p>
          </div>
        )}

        {/* Le bouton « passer », discret, en bas du cadre. */}
        <AnimatePresence>
          {cine && canSkip && !gone && (
            <motion.button
              onClick={skip}
              className="label-mono absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full glass-nexus"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              Passer
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Action principale : un seul élément en avant, et seulement quand il
          a un sens. Avant les six pierres, rien à cliquer ici. */}
      {/* Pas de mode="wait" ici : les deux états sont exclusifs, et surtout
          l'indice clignote en repeat:Infinity. En mode "wait", cette boucle
          s'appliquerait aussi à sa sortie — qui ne finirait donc jamais, et le
          bouton du claquement ne serait jamais monté. */}
      <div className="h-[72px] flex items-center justify-center">
        <AnimatePresence>
          {complete && !cine && ready && (
            <motion.button
              key="snap"
              onClick={snap}
              className="label-mono px-8 py-4 rounded-full text-void"
              style={{ background: 'var(--color-accent)', letterSpacing: '0.12em' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              Claquer des doigts
            </motion.button>
          )}

          {!complete && ready && (
            <motion.p
              key="hint"
              className="label-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              // Sortie explicitement finie : sans ça elle hériterait du
              // repeat:Infinity du clignotement et ne se terminerait jamais.
              exit={{ opacity: 0, transition: { duration: 0.3, repeat: 0 } }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              Touchez une pierre
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Un canvas n'expose rien : voici les mêmes six actions, invisibles à
          l'œil mais atteignables au clavier et par lecteur d'écran. Elles
          réapparaissent au focus pour que la navigation reste visible. */}
      <div className="flex flex-wrap justify-center gap-2">
        {STONES.map((stone, i) => (
          <button
            key={stone.name}
            onClick={() => {
              if (found.includes(i) || cine) return;
              playClick();
              haptic(HAPTIC.tap);
              setOpenIdx(i);
            }}
            disabled={found.includes(i) || cine || !ready}
            className="label-mono sr-only focus:not-sr-only focus:px-3 focus:py-2 focus:rounded-full focus:bg-ink/10"
          >
            {found.includes(i)
              ? `Pierre ${stone.of} — sertie : ${traits[i].title}`
              : `Pierre ${stone.of} — révéler le fragment`}
          </button>
        ))}
      </div>

      {/* Équivalent textuel de la progression et des répliques de la scène. */}
      <p className="sr-only" aria-live="polite">
        {cine
          ? line === 2
            ? 'Je suis Uriel.'
            : line === 1
              ? 'Et moi…'
              : 'Le gantelet se charge.'
          : `${found.length} pierres sur 6 serties.`}
      </p>

      <AnimatePresence>
        {openIdx !== null && (
          <TraitSheet trait={traits[openIdx]} stone={STONES[openIdx]} onClose={seal} />
        )}
      </AnimatePresence>
    </div>
  );
}
