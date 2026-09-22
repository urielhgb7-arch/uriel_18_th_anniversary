import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import ConstellationGame from './ConstellationGame';
import MiniEnigmas from './MiniEnigmas';
import PassionWheel from './PassionWheel';

// ── Deep Starry Background ─────────────────────────────────────────────────────
function CosmicBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    // Three layers of stars (depth simulation)
    const layers = [
      Array.from({ length: 120 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 0.8 + 0.1, s: 0.02, opacity: Math.random() * 0.5 + 0.1 })),
      Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + 0.3, s: 0.05, opacity: Math.random() * 0.7 + 0.2 })),
      Array.from({ length: 20 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 0.8, s: 0.1, opacity: Math.random() * 0.9 + 0.1, bright: true })),
    ];
    const allStars = layers.flat();

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += 0.012;
      for (const s of allStars) {
        const twinkle = 0.6 + 0.4 * Math.sin(t * s.s * 60 + s.x);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        if (s.bright) {
          // Add glow
          const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
          grd.addColorStop(0, `rgba(255,240,180,${s.opacity * twinkle})`);
          grd.addColorStop(0.4, `rgba(200,180,255,${s.opacity * twinkle * 0.3})`);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grd;
          ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        }
        ctx.fillStyle = `rgba(220,230,255,${s.opacity * twinkle})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.85 }}
    />
  );
}

// ── Section wrapper with reveal animation ─────────────────────────────────────
function RevealSection({ children, className = '' }) {
  const ref = useRef(null);
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="text-center mb-8">
      {eyebrow && (
        <p className="text-yellow-400/60 text-[10px] tracking-[0.3em] uppercase font-medium mb-2"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {eyebrow}
        </p>
      )}
      <h2
        className="text-white text-3xl font-black mb-2"
        style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.03em' }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-white/45 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ── CTA Section ────────────────────────────────────────────────────────────────
function FinalCTA() {
  const waNumber = '22901449902086';
  const waMsg = encodeURIComponent('Salut Uriel ! Je suis prêt(e) à vivre cette expérience pour ton 18ème anniversaire ! 🚀');

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
      />

      {/* Ambient glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(120,80,200,0.25) 0%, transparent 70%)' }} />

      <RevealSection className="w-full max-w-md">
        <div
          className="relative p-8 rounded-[2.5rem] overflow-hidden"
          style={{
            background: 'rgba(12,8,30,0.75)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(255,215,0,0.15)',
            boxShadow: '0 0 80px rgba(100,60,200,0.2), 0 30px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Top line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />

          {/* Welcome tag */}
          <motion.div
            className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-1.5 mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-yellow-400 text-[11px] tracking-[0.2em] uppercase font-semibold"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              ✦ Expérience VIP
            </span>
          </motion.div>

          <h1
            className="text-white text-4xl font-black mb-4 leading-tight"
            style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.04em' }}
          >
            Bienvenue dans<br />
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #ffd700 0%, #a78bfa 100%)' }}>
              mon Univers.
            </span>
          </h1>

          <p className="text-white/55 text-base leading-relaxed mb-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Profitez bien de cette expérience conçue sur mesure.<br />
            L'aventure ne fait que commencer ce soir.
          </p>

          {/* CTA Button */}
          <motion.a
            href={`https://wa.me/${waNumber}?text=${waMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-semibold text-black text-base relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #ffd700 0%, #f0a500 100%)',
              boxShadow: '0 0 40px rgba(255,215,0,0.35), 0 8px 24px rgba(0,0,0,0.3)',
              fontFamily: "'DM Sans', sans-serif",
            }}
            whileHover={{ scale: 1.02, boxShadow: '0 0 60px rgba(255,215,0,0.5), 0 12px 30px rgba(0,0,0,0.4)' }}
            whileTap={{ scale: 0.97 }}
          >
            {/* Shimmer sweep */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)', backgroundSize: '200% 100%', animation: 'sweep 1.5s ease infinite' }} />
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none" className="relative z-10">
              <circle cx="20" cy="20" r="20" fill="#25D366" />
              <path d="M28.7 11.3A11.9 11.9 0 0 0 20 8C13.4 8 8 13.4 8 20c0 2.1.5 4.1 1.5 5.9L8 32l6.3-1.6c1.7.9 3.7 1.4 5.7 1.4 6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.3-8.5zm-8.7 18.4c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.3-.4a9.9 9.9 0 0 1-1.5-5.3c0-5.5 4.5-10 10-10 2.7 0 5.2 1 7 2.9 1.9 1.9 2.9 4.3 2.9 7 0 5.5-4.5 10-10 10z" fill="white" />
            </svg>
            <span className="relative z-10">Je veux cette expérience</span>
          </motion.a>

          {/* Bottom watermark */}
          <p className="text-white/20 text-[10px] text-center mt-5 tracking-widest uppercase"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            VIP Experience · Uriel 18th Anniversary
          </p>

          {/* Bottom line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
        </div>
      </RevealSection>

      <style>{`
        @keyframes sweep {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// ── Scroll progress indicator ─────────────────────────────────────────────────
function ScrollProgress({ sections, current }) {
  return (
    <div className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2.5">
      {sections.map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: 4,
            background: i === current ? '#ffd700' : 'rgba(255,255,255,0.2)',
            boxShadow: i === current ? '0 0 8px rgba(255,215,0,0.8)' : 'none',
          }}
          animate={{ height: i === current ? 20 : 6, opacity: i === current ? 1 : 0.5 }}
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ExperienceScroll() {
  const containerRef = useRef(null);
  const [currentSection, setCurrentSection] = useState(0);
  const sectionCount = 4;

  // Track active section on scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setCurrentSection(Math.min(idx, sectionCount - 1));
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* Section pill indicator */}
      <ScrollProgress sections={Array(sectionCount).fill(0)} current={currentSection} />

      <div
        ref={containerRef}
        className="relative w-full h-[100dvh] overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Persistent cosmic background */}
        <div className="fixed inset-0 z-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, #050714 0%, #0a0320 50%, #07021a 100%)' }}>
          <CosmicBackground />
          {/* Persistent vignette */}
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />
        </div>

        {/* ── Section 1: Constellation ── */}
        <section className="relative z-10 w-full h-[100dvh] snap-start">
          <ConstellationGame />
        </section>

        {/* ── Section 2: Mini Enigmes ── */}
        <section className="relative z-10 w-full h-[100dvh] snap-start flex flex-col items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(5,3,20,0.65)', backdropFilter: 'blur(2px)' }}
          />
          <div className="relative z-10 w-full max-w-md px-4">
            <SectionHeader
              eyebrow="Test VIP"
              title="Vous connaissez Uriel ?"
              subtitle="3 questions pour le savoir vraiment."
            />
            <MiniEnigmas />
          </div>
        </section>

        {/* ── Section 3: Passions ── */}
        <section className="relative z-10 w-full h-[100dvh] snap-start flex flex-col items-center justify-center">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(8,4,25,0.70)', backdropFilter: 'blur(3px)' }}
          />
          <div className="relative z-10 w-full max-w-md px-4">
            <SectionHeader
              eyebrow="Univers"
              title="Mes Passions"
              subtitle="Ce qui me fait vivre chaque jour."
            />
            <PassionWheel />
          </div>
        </section>

        {/* ── Section 4: CTA Final ── */}
        <section className="relative z-10 w-full h-[100dvh] snap-start">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(4,2,15,0.80)' }}
          />
          <div className="relative z-10 w-full h-full">
            <FinalCTA />
          </div>
        </section>
      </div>
    </>
  );
}
