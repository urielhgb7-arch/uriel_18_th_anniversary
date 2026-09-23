import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import content from '../../content.json';
import { useReducedMotion, usePerfTier, useTilt } from '../../lib/hooks';
import { playWhoosh, playClick, haptic, HAPTIC } from '../../lib/audio';

/**
 * Le carrefour, juste après le plongeon : deux univers, un choix.
 *
 * Pourquoi un hub plutôt qu'un enchaînement linéaire ? Parce que le tunnel
 * dépose l'invité dans un endroit qu'il ne comprend pas encore. Lui donner la
 * main tout de suite transforme la désorientation en curiosité. Et les deux
 * univers n'ont pas le même public : certains veulent l'adresse, d'autres
 * veulent l'histoire. On ne force ni l'un ni l'autre, et chaque univers permet
 * de revenir ici.
 */

/** Champ d'étoiles en canvas : une seule surface, aucun DOM par étoile. */
function Starfield({ tier, reduced }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const count = reduced ? 60 : { low: 70, mid: 130, high: 200 }[tier] ?? 130;
    const dprCap = { low: 1, mid: 1.5, high: 2 }[tier] ?? 1.5;
    let stars = [];
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      // setTransform (et non scale) : idempotent, donc un resize répété ne cumule pas.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + Math.random() * 1.1,
        a: 0.2 + Math.random() * 0.6,
        // Vitesse de scintillement propre à chaque étoile : sinon tout clignote en cadence.
        tw: 0.6 + Math.random() * 1.8,
        ph: Math.random() * Math.PI * 2,
      }));
    };

    resize();
    window.addEventListener('resize', resize);

    if (reduced) {
      // Rendu statique : pas d'animation, mais le ciel existe quand même.
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        ctx.globalAlpha = s.a;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return () => window.removeEventListener('resize', resize);
    }

    const start = performance.now();
    const loop = (now) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      for (const s of stars) {
        ctx.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(t * s.tw + s.ph));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [tier, reduced]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

/** Vignette d'un univers. */
function Portal({ index, label, title, desc, hue, glyph, onPick, reduced, tiltRef }) {
  const cardRef = useRef(null);

  // Le gyroscope pilote directement le style du noeud DOM : passer par un state
  // à 60 Hz ferait re-rendre la page en continu pour un simple reflet.
  useEffect(() => {
    if (reduced || !tiltRef) return;
    let raf = 0;
    const loop = () => {
      const el = cardRef.current;
      if (el) {
        const { x = 0, y = 0 } = tiltRef.current ?? {};
        el.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 5}deg)`;
        el.style.setProperty('--shine-x', `${50 + x * 40}%`);
        el.style.setProperty('--shine-y', `${50 + y * 40}%`);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, tiltRef]);

  return (
    <motion.button
      onClick={() => {
        playWhoosh();
        haptic(HAPTIC.impact);
        onPick();
      }}
      onPointerEnter={() => playClick()}
      className="group relative w-full text-left"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5 + index * 0.16, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-[26px] p-6 glass-nexus transition-[box-shadow] duration-500"
        style={{
          transformStyle: 'preserve-3d',
          boxShadow: `0 20px 60px -30px ${hue}55`,
        }}
      >
        {/* Reflet suivant l'inclinaison du téléphone. */}
        <div
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            background: `radial-gradient(circle at var(--shine-x,50%) var(--shine-y,50%), ${hue}30 0%, transparent 58%)`,
          }}
        />
        <div
          className="absolute top-0 left-6 right-6 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${hue}, transparent)` }}
        />

        <div className="relative flex items-start gap-4">
          <div
            className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: `${hue}1f`, border: `1px solid ${hue}55`, color: hue }}
          >
            {glyph}
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="text-[9px] uppercase tracking-[0.34em] mb-1.5"
              style={{ fontFamily: 'var(--font-mono)', color: `${hue}cc` }}
            >
              {label}
            </p>
            <h3
              className="text-white text-[22px] font-bold uppercase leading-none tracking-tight mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h3>
            <p className="text-white/50 text-[13px] leading-snug">{desc}</p>
          </div>

          <svg
            viewBox="0 0 24 24"
            className="shrink-0 w-5 h-5 mt-1 text-white/30 transition-transform duration-500 group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
      </div>
    </motion.button>
  );
}

const MapGlyph = (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
  </svg>
);

const SelfGlyph = (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 2.5 20 7v10l-8 4.5L4 17V7l8-4.5Z" />
    <path d="M12 7.5 16 10v4l-4 2.5L8 14v-4l4-2.5Z" />
  </svg>
);

export default function NexusHub({ onPickMap, onPickSelf }) {
  const reduced = useReducedMotion();
  const tier = usePerfTier();
  const { tilt, needsPermission, request } = useTilt({ enabled: !reduced });
  const [asked, setAsked] = useState(false);

  const portals = useMemo(
    () => [
      {
        label: 'Univers A',
        title: 'Coordonnées',
        desc: "Le point exact où tout se passe. Orbite, descente, atterrissage.",
        hue: '#0ea5e9',
        glyph: MapGlyph,
        onPick: onPickMap,
      },
      {
        label: 'Univers B',
        title: 'Me connaître',
        desc: 'Six fragments, six énigmes, et un gantelet au bout du couloir.',
        hue: '#8b5cf6',
        glyph: SelfGlyph,
        onPick: onPickSelf,
      },
    ],
    [onPickMap, onPickSelf],
  );

  return (
    <div className="relative w-full min-h-[100dvh] overflow-hidden bg-void flex flex-col">
      <Starfield tier={tier} reduced={reduced} />

      {/* Nébuleuse de fond, deux teintes pour annoncer les deux univers. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 20% 25%, rgba(14,165,233,0.16) 0%, transparent 60%),' +
            'radial-gradient(ellipse 70% 50% at 80% 70%, rgba(139,92,246,0.18) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col justify-center px-5 pt-[calc(var(--safe-t)+2rem)] pb-[calc(var(--safe-b)+2rem)] max-w-md mx-auto w-full">
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <p
            className="text-infinity/70 text-[9px] uppercase tracking-[0.4em] mb-3"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Nexus · ligne temporelle stabilisée
          </p>
          <h1
            className="text-[clamp(32px,10vw,46px)] font-extrabold uppercase leading-[0.92] tracking-tight text-nexus-gradient"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {content.event.title}
          </h1>
          <p className="text-white/45 text-[14px] mt-3 leading-relaxed">
            Deux chemins partent d'ici. Tu peux prendre les deux.
          </p>
        </motion.div>

        <div className="flex flex-col gap-4">
          {portals.map((p, i) => (
            <Portal key={p.label} index={i} reduced={reduced} tiltRef={tilt} {...p} />
          ))}
        </div>

        {/* iOS exige un geste pour autoriser le gyroscope : on le demande ici,
            où l'effet est immédiatement visible sur les deux cartes. */}
        {needsPermission && !asked && !reduced && (
          <motion.button
            onClick={() => {
              setAsked(true);
              request();
            }}
            className="mt-7 mx-auto text-white/40 text-[10px] uppercase tracking-[0.28em] underline underline-offset-4"
            style={{ fontFamily: 'var(--font-mono)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
          >
            Activer les reflets (inclinaison)
          </motion.button>
        )}
      </div>
    </div>
  );
}
