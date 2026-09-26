import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { Activity, Film, Music, Rocket, PenTool, Cpu, Sparkles, Map } from 'lucide-react';
import content from '../../content.json';
import { mountNebula } from '../../lib/nebula';
import { useReducedMotion, usePerfTier, useTilt } from '../../lib/hooks';
import { startDrone, stopDrone, playClick, haptic, HAPTIC } from '../../lib/audio';
import Enigmas from './Enigmas';
import Gauntlet from './Gauntlet';
import FinalCTA from './FinalCTA';

/**
 * Univers B — « Me connaître ».
 *
 * Doit dominer l'univers A visuellement, d'où la navigation en profondeur : les
 * fragments ne défilent pas, ils traversent l'axe Z. Chacun arrive du lointain,
 * passe au premier plan, puis sort par l'arrière du regard.
 *
 * Choix technique : transforms CSS 3D pour le contenu, pas de WebGL. Le texte
 * reste du DOM — net à tout zoom, sélectionnable, accessible — et le compositeur
 * traite translateZ/rotateY sur la carte graphique aussi bien qu'un shader.
 * Le WebGL du site est réservé au tunnel et au globe, là où il est irremplaçable.
 */

const ICONS = {
  activity: Activity,
  film: Film,
  music: Music,
  rocket: Rocket,
  'pen-tool': PenTool,
  cpu: Cpu,
};

/* Mêmes teintes que les six pierres (cf. lib/gauntlet.js) : un fragment est la
   face lisible d'une pierre, la correspondance doit être immédiate. Désaturées
   d'un cran — la chroma est réservée aux pierres elles-mêmes. */
const FRAGMENT_HUES = ['#5b8fd4', '#d6b64a', '#d45b52', '#9068c4', '#4fae74', '#d98a4a'];

/**
 * Expose l'inclinaison sous forme de MotionValues.
 *
 * Passer par des MotionValues plutôt que par un état React est ici essentiel :
 * le gyroscope émet ~60 fois par seconde, et autant de re-renders écrouleraient
 * la page. Framer écrit directement dans le style, hors cycle React.
 */
function useTiltMotion(tilt, enabled) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  useEffect(() => {
    if (!enabled) return;
    let raf;
    const loop = () => {
      const t = tilt?.current ?? { x: 0, y: 0 };
      mx.set(mx.get() + (t.x - mx.get()) * 0.06);
      my.set(my.get() + (t.y - my.get()) * 0.06);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tilt, enabled, mx, my]);

  return { mx, my };
}

/** Monolithe : un fragment de personnalité qui traverse l'axe Z. */
function Fragment({ passion, index, total, scroller, mx, my, reduced }) {
  const ref = useRef(null);
  const hue = FRAGMENT_HUES[index % FRAGMENT_HUES.length];
  const Icon = ICONS[passion.icon] ?? Sparkles;

  const { scrollYProgress } = useScroll({
    container: scroller,
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Ressort léger : donne de la masse au fragment sans retard perceptible.
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 });

  const z = useTransform(p, [0, 0.5, 1], [-1150, 0, 400]);
  const opacity = useTransform(p, [0, 0.27, 0.5, 0.73, 1], [0, 1, 1, 1, 0]);
  const rotateY = useTransform(p, [0, 0.5, 1], [24, 0, -24]);
  const blur = useTransform(p, [0, 0.28, 0.72, 1], [10, 0, 0, 10]);
  const filter = useTransform(blur, (v) => `blur(${v}px)`);

  // Le reflet suit l'inclinaison : la surface paraît réellement vitrée.
  const shine = useTransform([mx, my], ([x, y]) =>
    `radial-gradient(circle at ${50 + x * 40}% ${42 + y * 34}%, rgba(255,255,255,0.17), transparent 58%)`
  );
  const tiltY = useTransform(mx, (v) => v * 7);
  const tiltX = useTransform(my, (v) => -v * 5);

  if (reduced) {
    return (
      <section ref={ref} className="relative min-h-[70dvh] flex items-center justify-center px-6 py-10">
        <FragmentCard passion={passion} index={index} total={total} hue={hue} Icon={Icon} />
      </section>
    );
  }

  return (
    <section ref={ref} className="relative h-[100dvh] flex items-center justify-center px-6" style={{ perspective: '1100px' }}>
      <motion.div
        className="w-full max-w-[380px]"
        style={{
          z,
          opacity,
          rotateY,
          rotateX: tiltX,
          filter,
          transformStyle: 'preserve-3d',
        }}
      >
        <motion.div style={{ rotateY: tiltY }}>
          <FragmentCard passion={passion} index={index} total={total} hue={hue} Icon={Icon} shine={shine} />
        </motion.div>
      </motion.div>
    </section>
  );
}

/** Face visible du monolithe (désormais représenté comme une galaxie). Isolée pour servir aussi le rendu reduced-motion. */
function FragmentCard({ passion, index, total, hue, Icon, shine }) {
  return (
    <div
      className="relative rounded-full p-10 overflow-hidden flex flex-col items-center text-center aspect-square justify-center"
      style={{
        width: '320px',
        background: `radial-gradient(circle at center, ${hue}22 0%, rgba(10,10,15,0.95) 70%)`,
        border: `1px solid ${hue}44`,
        boxShadow: `0 0 60px ${hue}33, inset 0 0 40px ${hue}22`,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Cœur de la galaxie (lueur centrale) */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${hue}55 0%, transparent 50%)`,
          filter: 'blur(20px)',
        }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Reflet piloté par le gyroscope. */}
      {shine && <motion.div className="absolute inset-0 pointer-events-none rounded-full" style={{ background: shine }} />}

      <div className="relative z-10 flex flex-col items-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center relative mb-4"
          style={{ background: `${hue}33`, border: `1px solid ${hue}88`, boxShadow: `0 0 20px ${hue}55` }}
        >
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: hue, filter: 'blur(10px)' }}
            animate={{ opacity: [0.4, 0.8, 0.4], rotate: 360 }}
            transition={{ opacity: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }, rotate: { duration: 10, repeat: Infinity, ease: 'linear' } }}
          />
          <Icon size={28} color="#fff" className="relative drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        </div>

        <span className="label-mono tabular-nums mb-3" style={{ color: hue }}>
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>

        <h3 className="text-white text-[24px] leading-[1.1] mb-3 drop-shadow-md">{passion.name}</h3>

        <p className="text-white/80 text-[13px] leading-relaxed line-clamp-4">{passion.desc}</p>
      </div>
    </div>
  );
}

/**
 * Seuil d'entrée. Court par construction : le gantelet est juste en dessous, et
 * c'est lui qu'on doit voir presque tout de suite. 62dvh laisse l'amorce du
 * canvas dépasser en bas du premier écran — l'invité sait qu'il y a quelque
 * chose à atteindre sans qu'on ait besoin de le lui dire.
 */
function SelfIntro() {
  return (
    <section className="relative h-[62dvh] flex flex-col items-center justify-center px-8 text-center">
      <motion.p
        className="label-mono mb-5"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        Archive personnelle
      </motion.p>

      <motion.h1
        className="text-ink text-[clamp(44px,13vw,66px)] leading-[0.92]"
        initial={{ opacity: 0, y: 22, filter: 'blur(14px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        Me
        <br />
        connaître
      </motion.h1>

      <motion.p
        className="text-muted text-[14px] mt-6 max-w-[290px] leading-relaxed"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.45, duration: 0.9 }}
      >
        Six pierres sur des lignes de temps divergentes. Chacune en dit une part.
      </motion.p>
    </section>
  );
}

/** Indicateur de progression latéral. */
function ScrollRail({ progress, count }) {
  return (
    <div className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => {
        // Segment actif = tranche courante de la progression globale.
        const lo = i / count;
        const hi = (i + 1) / count;
        const active = progress >= lo && progress < hi;
        return (
          <motion.span
            key={i}
            className="w-[3px] rounded-full"
            style={{ background: active ? 'var(--color-accent)' : 'rgba(255,255,255,0.12)' }}
            animate={{
              height: active ? 22 : 7,
              boxShadow: active ? '0 0 9px rgba(201,168,106,0.8)' : 'none',
            }}
            transition={{ duration: 0.3 }}
          />
        );
      })}
    </div>
  );
}

export default function UniverseSelf({ onSwitch }) {
  const scroller = useRef(null);
  const fragmentsRef = useRef(null);
  const nebulaCanvas = useRef(null);
  const scrollRatio = useRef(0);
  const [railProgress, setRailProgress] = useState(0);
  
  // Nouveau state : on bloque le reste tant que Gauntlet n'est pas passé
  const [snapped, setSnapped] = useState(false);

  const reduced = useReducedMotion();
  const tier = usePerfTier();
  const { tilt } = useTilt({ enabled: !reduced });
  const { mx, my } = useTiltMotion(tilt, !reduced);

  const { passions } = content;
  // SECTIONS : intro + fragments + énigmes + cta
  const SECTIONS = passions.length + 3; 

  useEffect(() => {
    startDrone(48);
    return () => stopDrone();
  }, []);

  useEffect(() => {
    // Si on n'a pas encore passé le Gauntlet, pas de nébuleuse pour le moment
    if (!nebulaCanvas.current || reduced || !snapped) return;
    const handle = mountNebula(nebulaCanvas.current, { tier, tilt, scroll: scrollRatio });
    return () => handle?.destroy();
  }, [tier, tilt, reduced, snapped]);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !snapped) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = el.scrollHeight - el.clientHeight;
        const ratio = max > 0 ? el.scrollTop / max : 0;
        scrollRatio.current = ratio;
        setRailProgress(ratio);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [snapped]);

  const handleSnapComplete = () => {
    setSnapped(true);
  };

  return (
    <div className="fixed inset-0 bg-void overflow-hidden">
      
      {/* 
        Écran 1 : Le Gauntlet (Scanner d'empreinte et portes de donjon) 
        Il obstrue tout au début.
      */}
      {!snapped && (
        <Gauntlet onComplete={handleSnapComplete} />
      )}

      {/* Le reste du contenu n'est rendu/visible qu'une fois la porte ouverte */}
      {snapped && (
        <motion.div 
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {!reduced && <canvas ref={nebulaCanvas} className="absolute inset-0 w-full h-full z-0 pointer-events-none" />}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 38%,rgba(201,168,106,0.09),transparent 64%)' }}
          />

          <ScrollRail progress={railProgress} count={SECTIONS} />

          <div
            ref={scroller}
            className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <SelfIntro />

            <div ref={fragmentsRef} />

            {passions.map((passion, i) => (
              <Fragment
                key={passion.id}
                passion={passion}
                index={i}
                total={passions.length}
                scroller={scroller}
                mx={mx}
                my={my}
                reduced={reduced}
              />
            ))}

            <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-5 py-16">
              <Enigmas />
            </section>

            <section className="relative min-h-[100dvh] flex items-center justify-center px-5">
              <FinalCTA unlocked={true} />
            </section>
          </div>

          <div className="absolute z-40 left-4 bottom-[calc(var(--safe-b)+1rem)]">
            <button
              onClick={() => {
                playClick();
                haptic(HAPTIC.soft);
                onSwitch();
              }}
              className="px-4 h-10 rounded-full glass-nexus flex items-center justify-center gap-2 text-ink/80 active:text-ink transition-colors"
              aria-label="Voir la localisation"
            >
              <Map size={17} />
              <span className="text-[13px] font-medium" style={{ fontFamily: 'var(--font-sans)' }}>Localisation</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

