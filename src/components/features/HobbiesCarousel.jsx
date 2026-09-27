import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Film, Music, Rocket, PenTool, Cpu, Sparkles, ArrowUp } from 'lucide-react';
import { haptic, HAPTIC, playWhoosh } from '../../lib/audio';
import content from '../../content.json';
import HobbyBackgrounds from './HobbyBackgrounds';

const ICONS = {
  activity: Activity,
  film: Film,
  music: Music,
  rocket: Rocket,
  'pen-tool': PenTool,
  cpu: Cpu,
};

const FRAGMENT_HUES = ['#5b8fd4', '#d6b64a', '#d45b52', '#9068c4', '#4fae74', '#d98a4a'];

// Animation des cartes au swipe
const cardVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    rotate: direction > 0 ? 120 : -120,
    scale: 0.5
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    rotate: 0,
    scale: 1,
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    rotate: direction < 0 ? 120 : -120,
    scale: 0.5
  })
};

export default function HobbiesCarousel({ onComplete }) {
  const { passions } = content;
  const [[page, direction], setPage] = useState([0, 0]);
  const [swipedCount, setSwipedCount] = useState(0);

  const activeIndex = Math.abs(page % passions.length);
  const activePassion = passions[activeIndex];
  const hue = FRAGMENT_HUES[activeIndex];
  const Icon = ICONS[activePassion.icon] || Sparkles;

  const paginate = (newDirection) => {
    playWhoosh();
    haptic(HAPTIC.soft);
    setPage([page + newDirection, newDirection]);
    setSwipedCount((prev) => prev + 1);
  };

  const handleDragEnd = (e, { offset, velocity }) => {
    const swipe = Math.abs(offset.x) * velocity.x;
    if (swipe < -10000) paginate(1); // Swipe gauche -> page suivante
    else if (swipe > 10000) paginate(-1); // Swipe droite -> page précédente
  };

  // L'utilisateur peut scroller vers le bas à tout moment pour passer au Quiz
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.deltaY > 50) { // Scroll vers le bas pour descendre au Quiz
        onComplete();
      }
    };
    // Sur mobile, on écoute le touchmove
    let touchStartY = 0;
    const handleTouchStart = (e) => touchStartY = e.touches[0].clientY;
    const handleTouchEnd = (e) => {
      if (touchStartY - e.changedTouches[0].clientY > 80) { // Swipe vers le haut (scroll vers le bas)
        onComplete();
      }
    };

    window.addEventListener('wheel', handleWheel);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-void flex items-center justify-center touch-none">
      
      {/* Composant gérant les fonds animés et les transitions thématiques */}
      <HobbyBackgrounds activeIndex={activeIndex} direction={direction} />

      {/* Le Carrousel Central (1 carte circulaire à la fois) */}
      <div className="relative w-[340px] h-[340px] z-20 flex items-center justify-center perspective-[1000px]">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 }, rotate: { type: "spring", stiffness: 200, damping: 20 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={handleDragEnd}
            className="absolute cursor-grab active:cursor-grabbing w-[320px] h-[320px] rounded-full p-10 flex flex-col items-center justify-center text-center shadow-2xl"
            style={{
              background: `radial-gradient(circle at center, ${hue}22 0%, rgba(10,10,15,0.9) 80%)`,
              border: `1px solid ${hue}55`,
              boxShadow: `0 0 60px ${hue}33, inset 0 0 40px ${hue}22`,
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Cœur galactique de la carte */}
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-full"
              style={{ background: `radial-gradient(circle at center, ${hue}44 0%, transparent 60%)`, filter: 'blur(15px)' }}
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative z-10 flex flex-col items-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center relative mb-4"
                style={{ background: `${hue}33`, border: `1px solid ${hue}88`, boxShadow: `0 0 25px ${hue}66` }}
              >
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ background: hue, filter: 'blur(12px)' }}
                  animate={{ opacity: [0.4, 0.8, 0.4], rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                />
                <Icon size={28} color="#fff" className="relative drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
              </div>

              <span className="label-mono tabular-nums mb-3" style={{ color: hue }}>
                {String(activeIndex + 1).padStart(2, '0')} / {String(passions.length).padStart(2, '0')}
              </span>

              <h3 className="text-white text-[26px] leading-[1.1] mb-3 drop-shadow-md">{activePassion.name}</h3>
              <p className="text-white/85 text-[14px] leading-relaxed">{activePassion.desc}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Guide utilisateur (Swipe pour explorer, puis Scroll pour Quiz) */}
      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center justify-center pointer-events-none z-30">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 mb-6"
          >
            <span className="label-mono text-white/60">Scrollez pour le Quiz</span>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-4">
          <span className="text-[12px] uppercase tracking-widest text-white/30">&larr; Swipe</span>
          <div className="flex gap-2">
            {passions.map((_, i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                animate={{
                  backgroundColor: i === activeIndex ? FRAGMENT_HUES[i] : 'rgba(255,255,255,0.1)',
                  scale: i === activeIndex ? 1.5 : 1
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
          <span className="text-[12px] uppercase tracking-widest text-white/30">Swipe &rarr;</span>
        </div>
      </div>
    </div>
  );
}
