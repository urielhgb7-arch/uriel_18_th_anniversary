import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConstellationGame from './ConstellationGame';
import MiniEnigmas from './MiniEnigmas';
import PassionWheel from './PassionWheel';

// ── Multiverse Background ─────────────────────────────────────────────────────
function MultiverseBackground() {
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

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2 + 1,
      c: Math.random() > 0.5 ? '#8B5CF6' : '#0EA5E9',
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      alpha: Math.random()
    }));

    const draw = () => {
      ctx.fillStyle = 'rgba(5, 2, 10, 0.2)';
      ctx.fillRect(0, 0, W, H);
      
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.c;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}

function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="text-center mb-8 relative z-10">
      {eyebrow && (
        <p className="text-[#8B5CF6] text-[10px] tracking-[0.4em] uppercase font-bold mb-2 font-mono">
          {eyebrow}
        </p>
      )}
      <h2 className="text-white text-4xl font-black mb-2 font-syne tracking-tighter uppercase" style={{ textShadow: '0 0 20px rgba(139,92,246,0.5)' }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-white/60 text-sm font-sans">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function FinalCTA() {
  const waNumber = '22901449902086';
  const waMsg = encodeURIComponent('Salut Uriel ! Je suis prêt(e) à vivre cette expérience pour ton 18ème anniversaire ! 🚀');

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#05020A] opacity-80" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15)_0%,transparent_60%)] pointer-events-none" />

      <motion.div 
        className="relative z-10 w-full max-w-md p-8 rounded-3xl"
        style={{
          background: 'rgba(20,10,40,0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139,92,246,0.3)',
          boxShadow: '0 0 60px rgba(139,92,246,0.2), inset 0 0 20px rgba(139,92,246,0.1)'
        }}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent" />
        
        <h1 className="text-white text-3xl font-black mb-4 font-syne uppercase tracking-tighter leading-none">
          Rejoindre le <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] to-[#0EA5E9]">
            Multivers
          </span>
        </h1>
        
        <p className="text-white/70 text-sm mb-10 font-sans leading-relaxed">
          La réalité a été réécrite. <br/>
          La suite de l'histoire t'appartient.
        </p>

        <motion.a
          href={`https://wa.me/${waNumber}?text=${waMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-white uppercase tracking-widest text-sm relative overflow-hidden group font-mono"
          style={{
            background: 'linear-gradient(135deg, #4C1D95 0%, #1D4ED8 100%)',
            boxShadow: '0 0 30px rgba(139,92,246,0.4)',
          }}
          whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(139,92,246,0.6)' }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span>Confirmer l'Accès</span>
        </motion.a>
      </motion.div>
    </div>
  );
}

function ScrollProgress({ sections, current }) {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
      {sections.map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: 3,
            background: i === current ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
            boxShadow: i === current ? '0 0 10px #8B5CF6' : 'none',
          }}
          animate={{ height: i === current ? 24 : 8, opacity: i === current ? 1 : 0.5 }}
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );
}

export default function ExperienceScroll() {
  const containerRef = useRef(null);
  const secondSectionRef = useRef(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const sectionCount = 4;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isUnlocked) return;
    const handler = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setCurrentSection(Math.min(idx, sectionCount - 1));
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [isUnlocked]);

  const handleUnlockNext = () => {
    setIsUnlocked(true);
    // Smooth scroll to second section after unlocking
    setTimeout(() => {
      if (secondSectionRef.current) {
        secondSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 500);
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
      
      <AnimatePresence>
        {isUnlocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ScrollProgress sections={Array(sectionCount).fill(0)} current={currentSection} />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={containerRef}
        className={`relative w-full h-[100dvh] snap-y snap-mandatory bg-[#05020A] ${isUnlocked ? 'overflow-y-scroll' : 'overflow-hidden'}`}
      >
        <div className="fixed inset-0 z-0">
          <MultiverseBackground />
        </div>

        {/* ── 1: Infinity Stones (Constellation / Snap) ── */}
        <section className="relative z-10 w-full h-[100dvh] snap-start">
          <ConstellationGame onUnlockNext={handleUnlockNext} />
        </section>

        {/* ── 2: Énigmes ── */}
        <section ref={secondSectionRef} className="relative z-10 w-full h-[100dvh] snap-start flex flex-col items-center justify-center pt-12">
          <div className="absolute inset-0 bg-[#05020A]/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md px-4">
            <SectionHeader eyebrow="Security Check" title="Déchiffrement" subtitle="Protocole de vérification d'identité." />
            <MiniEnigmas />
          </div>
        </section>

        {/* ── 3: Passions ── */}
        <section className="relative z-10 w-full h-[100dvh] snap-start flex flex-col items-center justify-center pt-12">
          <div className="absolute inset-0 bg-[#05020A]/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md px-4">
            <SectionHeader eyebrow="Nexus Core" title="Multivers" subtitle="Les fragments de ma réalité." />
            <PassionWheel />
          </div>
        </section>

        {/* ── 4: CTA Final ── */}
        <section className="relative z-10 w-full h-[100dvh] snap-start">
          <FinalCTA />
        </section>
      </div>
    </>
  );
}
