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

/** Face visible du monolithe. Isolée pour servir aussi le rendu reduced-motion. */
function FragmentCard({ passion, index, total, hue, Icon, shine }) {
  return (
    <div
      className="relative rounded-[28px] p-8 overflow-hidden"
      style={{
        background: 'linear-gradient(155deg, rgba(20,20,27,0.9), rgba(6,6,10,0.95))',
        border: `1px solid ${hue}33`,
        boxShadow: `0 30px 80px -26px ${hue}3d, inset 0 1px 0 rgba(255,255,255,0.06)`,
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

        <span className="label-mono tabular-nums">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>

      <h3 className="text-ink text-[31px] leading-[1.05] mb-3">{passion.name}</h3>

      <p className="text-ink/65 text-[14px] leading-relaxed">{passion.desc}</p>

      {/* Barre d'accent : rappel discret de la couleur du fragment. */}
      <div className="mt-7 flex items-center gap-2">
        <span className="h-px flex-1" style={{ background: `linear-gradient(90deg,${hue}88,transparent)` }} />
        <span className="w-1 h-1 rounded-full" style={{ background: hue, boxShadow: `0 0 8px ${hue}` }} />
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
  // Progression brute, lue par la nébuleuse sans passer par React.
  const scrollRatio = useRef(0);
  const [railProgress, setRailProgress] = useState(0);
  const [snapped, setSnapped] = useState(false);

  const reduced = useReducedMotion();
  const tier = usePerfTier();
  const { tilt } = useTilt({ enabled: !reduced });
  const { mx, my } = useTiltMotion(tilt, !reduced);

  const { passions } = content;
  const SECTIONS = passions.length + 4; // seuil + gantelet + fragments + énigmes + cta

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

  /* Le snap déverrouille le CTA mais n'y saute plus : le gantelet est désormais
     en haut, donc tout le contenu est encore à venir. On enchaîne sur les
     fragments — l'effondrement de la scène débouche sur la suite du récit. */
  const snapTimer = useRef(0);
  useEffect(() => () => clearTimeout(snapTimer.current), []);

  const handleSnapComplete = () => {
    setSnapped(true);
    snapTimer.current = setTimeout(() => {
      fragmentsRef.current?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'start',
      });
    }, 900);
  };

  return (
    <div className="fixed inset-0 bg-void overflow-hidden">
      {/* Fond fixe : la nébuleuse réagit au scroll mais ne défile pas. */}
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

        {/* Le gantelet EN HAUT. C'est la pièce maîtresse de cet univers : la
            reléguer en fin de scroll revenait à ne jamais la montrer. Les six
            pierres sont donc la première chose à faire, et ce qu'on y apprend
            sur moi cadre la lecture de tout ce qui suit. */}
        <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-5 py-14">
          <Gauntlet onComplete={handleSnapComplete} />
        </section>

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

        {/* Énigmes : contenu interactif, donc stable à l'écran — pas de vol en Z
            qui rendrait les boutons difficiles à viser. */}
        <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-5 py-16">
          <Enigmas />
        </section>

        <section className="relative min-h-[100dvh] flex items-center justify-center px-5">
          <FinalCTA unlocked={snapped} />
        </section>
      </div>

      {/* Bascule vers l'autre univers. Plus de « retour » : le hub n'existe
          plus, les deux univers communiquent directement. */}
      <div className="absolute z-40 left-4 bottom-[calc(var(--safe-b)+1rem)]">
        <button
          onClick={() => {
            playClick();
            haptic(HAPTIC.soft);
            onSwitch();
          }}
          className="w-10 h-10 rounded-full glass-nexus flex items-center justify-center text-ink/60 active:text-ink"
          aria-label="Voir la localisation"
        >
          <Map size={17} />
        </button>
      </div>
    </div>
  );
}

