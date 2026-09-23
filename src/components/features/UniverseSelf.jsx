import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { Activity, Film, Music, Rocket, PenTool, Cpu, Sparkles, ArrowLeft, Map } from 'lucide-react';
import content from '../../content.json';
import { mountNebula } from '../../lib/nebula';
import { useReducedMotion, usePerfTier, useTilt } from '../../lib/hooks';
import { startDrone, stopDrone, playWhoosh, playClick, haptic, HAPTIC } from '../../lib/audio';
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

const FRAGMENT_HUES = ['#3b82f6', '#eab308', '#ef4444', '#a855f7', '#22c55e', '#f97316'];

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

/** Face visible du monolithe. Isolée pour servir aussi le rendu reduced-motion. */
function FragmentCard({ passion, index, total, hue, Icon, shine }) {
  return (
    <div
      className="relative rounded-[28px] p-8 overflow-hidden"
      style={{
        background: 'linear-gradient(155deg, rgba(28,16,52,0.88), rgba(8,4,18,0.94))',
        border: `1px solid ${hue}44`,
        boxShadow: `0 30px 80px -24px ${hue}55, inset 0 1px 0 rgba(255,255,255,0.08)`,
        backdropFilter: 'blur(18px)',
      }}
    >
      {/* Reflet piloté par le gyroscope. */}
      {shine && <motion.div className="absolute inset-0 pointer-events-none" style={{ background: shine }} />}

      {/* Arête supérieure lumineuse : donne l'épaisseur du verre. */}
      <div
        className="absolute top-0 left-6 right-6 h-px"
        style={{ background: `linear-gradient(90deg,transparent,${hue},transparent)` }}
      />

      <div className="relative flex items-center justify-between mb-7">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
          style={{ background: `${hue}18`, border: `1px solid ${hue}55` }}
        >
          <motion.span
            className="absolute inset-0 rounded-2xl"
            style={{ background: hue, filter: 'blur(14px)' }}
            animate={{ opacity: [0.2, 0.42, 0.2] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <Icon size={24} color={hue} className="relative" />
        </div>

        <span
          className="text-[10px] tracking-[0.3em] text-white/30"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>

      <h3
        className="text-white text-[30px] leading-[1.05] font-bold uppercase mb-3"
        style={{ fontFamily: 'var(--font-display)', textShadow: `0 0 28px ${hue}44` }}
      >
        {passion.name}
      </h3>

      <p className="text-white/62 text-[14px] leading-relaxed">{passion.desc}</p>

      {/* Barre d'accent : rappel discret de la couleur du fragment. */}
      <div className="mt-7 flex items-center gap-2">
        <span className="h-px flex-1" style={{ background: `linear-gradient(90deg,${hue}88,transparent)` }} />
        <span className="w-1 h-1 rounded-full" style={{ background: hue, boxShadow: `0 0 8px ${hue}` }} />
      </div>
    </div>
  );
}

/** Titre d'ouverture de l'univers. */
function SelfIntro() {
  return (
    <section className="relative h-[100dvh] flex flex-col items-center justify-center px-8 text-center">
      <motion.p
        className="text-vibranium text-[10px] tracking-[0.42em] uppercase font-bold mb-5"
        style={{ fontFamily: 'var(--font-mono)' }}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        Nexus — Archive personnelle
      </motion.p>

      <motion.h1
        className="text-[clamp(44px,13vw,68px)] leading-[0.9] font-bold uppercase text-nexus-gradient"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ opacity: 0, y: 22, filter: 'blur(14px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        Me
        <br />
        connaître
      </motion.h1>

      <motion.p
        className="text-white/50 text-[14px] mt-6 max-w-[290px] leading-relaxed"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.45, duration: 0.9 }}
      >
        Six fragments dérivent dans ce vide. Descendez pour les traverser.
      </motion.p>

      <motion.div
        className="absolute bottom-[calc(var(--safe-b)+2.5rem)] flex flex-col items-center gap-2"
        animate={{ opacity: [0.3, 0.9, 0.3], y: [0, 7, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-[9px] tracking-[0.34em] uppercase text-white/45" style={{ fontFamily: 'var(--font-mono)' }}>
          Défiler
        </span>
        <span className="w-px h-8 bg-gradient-to-b from-vibranium to-transparent" />
      </motion.div>
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
            style={{ background: active ? '#8b5cf6' : 'rgba(255,255,255,0.12)' }}
            animate={{
              height: active ? 22 : 7,
              boxShadow: active ? '0 0 9px #8b5cf6' : 'none',
            }}
            transition={{ duration: 0.3 }}
          />
        );
      })}
    </div>
  );
}

export default function UniverseSelf({ onSwitch, onBack }) {
  const scroller = useRef(null);
  const ctaRef = useRef(null);
  const nebulaCanvas = useRef(null);
  // Progression brute, lue par la nébuleuse sans passer par React.
  const scrollRatio = useRef(0);
  const [railProgress, setRailProgress] = useState(0);
  const [snapped, setSnapped] = useState(false);

  const reduced = useReducedMotion();
  const tier = usePerfTier();
  const { tilt } = useTilt({ enabled: !reduced });
  const { mx, my } = useTiltMotion(tilt, !reduced);

  const { passions } = content;
  const SECTIONS = passions.length + 4; // intro + fragments + énigmes + snap + cta

  useEffect(() => {
    startDrone(48);
    return () => stopDrone();
  }, []);

  useEffect(() => {
    if (!nebulaCanvas.current || reduced) return;
    const handle = mountNebula(nebulaCanvas.current, { tier, tilt, scroll: scrollRatio });
    return () => handle?.destroy();
  }, [tier, tilt, reduced]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      // rAF : le scroll émet plus vite que les frames, on n'en garde qu'une.
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
  }, []);

  /** Après le snap, on amène le visiteur au CTA sans bloquer son scroll. */
  const handleSnapComplete = () => {
    setSnapped(true);
    setTimeout(() => {
      ctaRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }, 900);
  };

  return (
    <div className="fixed inset-0 bg-void overflow-hidden">
      {/* Fond fixe : la nébuleuse réagit au scroll mais ne défile pas. */}
      {!reduced && <canvas ref={nebulaCanvas} className="absolute inset-0 w-full h-full z-0 pointer-events-none" />}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 40%,rgba(76,29,149,0.22),transparent 62%)' }}
      />

      <ScrollRail progress={railProgress} count={SECTIONS} />

      <div
        ref={scroller}
        className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <SelfIntro />

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

        {/* Énigmes : contenu interactif, donc stable à l'écran — pas de vol en Z
            qui rendrait les boutons difficiles à viser. */}
        <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-5 py-16">
          <Enigmas />
        </section>

        {/* Climax : les six pierres puis le claquement. */}
        <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-5 py-16">
          <Gauntlet onComplete={handleSnapComplete} />
        </section>

        <section ref={ctaRef} className="relative min-h-[100dvh] flex items-center justify-center px-5">
          <FinalCTA unlocked={snapped} />
        </section>
      </div>

      {/* Navigation : retour au hub, bascule vers l'autre univers. */}
      <div className="absolute z-40 left-4 bottom-[calc(var(--safe-b)+1rem)] flex gap-2">
        <button
          onClick={() => {
            playWhoosh();
            onBack();
          }}
          className="w-10 h-10 rounded-full glass-nexus flex items-center justify-center text-white/60 active:text-white"
          aria-label="Retour au nexus"
        >
          <ArrowLeft size={17} />
        </button>
        <button
          onClick={() => {
            playClick();
            haptic(HAPTIC.soft);
            onSwitch();
          }}
          className="w-10 h-10 rounded-full glass-nexus flex items-center justify-center text-white/60 active:text-white"
          aria-label="Voir la localisation"
        >
          <Map size={17} />
        </button>
      </div>
    </div>
  );
}

