import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import ConstellationGame from './ConstellationGame';
import MiniEnigmas from './MiniEnigmas';
import PassionWheel from './PassionWheel';

export default function ExperienceScroll() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  
  // Parallax effects for the starry background
  const yBg = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);

  return (
    <div ref={containerRef} className="relative w-full h-[100dvh] overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth font-inter">
      
      {/* Ciel étoilé fixé avec léger parallax */}
      <motion.div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ y: yBg }}
      >
        <StarryBackground />
      </motion.div>

      {/* Section 1 : Constellation (VOUH) */}
      <section className="relative z-10 w-full h-[100dvh] snap-start flex flex-col justify-center">
        <ConstellationGame />
      </section>

      {/* Section 2 : Mini Énigmes */}
      <section className="relative z-10 w-full h-[100dvh] snap-start bg-black/40 backdrop-blur-sm">
        <MiniEnigmas />
      </section>

      {/* Section 3 : Roue des Passions */}
      <section className="relative z-10 w-full h-[100dvh] snap-start bg-black/60 backdrop-blur-md">
        <PassionWheel />
      </section>

      {/* Section 4 : Final CTA */}
      <section className="relative z-10 w-full h-[100dvh] snap-start flex flex-col items-center justify-center p-6 bg-black/80">
        <div className="w-full max-w-md p-8 rounded-[2rem] glass-panel flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
          
          <h1 className="text-4xl font-space font-bold text-white mb-4">
            Bienvenue dans mon Univers.
          </h1>
          <p className="text-white/70 text-lg mb-10 leading-relaxed font-light">
            Profitez bien de cette expérience conçue sur mesure. L'aventure ne fait que commencer.
          </p>

          <a 
            href={`https://wa.me/22901449902086?text=${encodeURIComponent("Salut Uriel ! Je suis prêt(e) à vivre cette expérience pour ton 18ème anniversaire ! 🚀")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-xl bg-white text-black font-semibold text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(255,255,255,0.3)]"
          >
            Je veux cette expérience
          </a>
        </div>
      </section>

    </div>
  );
}

// Sous-composant : Ciel Étoilé Animé
function StarryBackground() {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    // Générer 100 étoiles aléatoires
    const generated = Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2
    }));
    setStars(generated);
  }, []);

  return (
    <div className="w-full h-[120vh] absolute top-[-10vh] left-0">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [star.opacity * 0.2, star.opacity, star.opacity * 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut"
          }}
        />
      ))}
      {/* Nébuleuses (Gradients flous) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 blur-[100px] rounded-full mix-blend-screen" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-emerald-500/10 blur-[120px] rounded-full mix-blend-screen" />
    </div>
  );
}
