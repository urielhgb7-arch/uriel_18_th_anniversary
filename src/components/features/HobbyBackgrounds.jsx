import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Fonds interactifs thématiques pour chaque hobby.
 * 0: Sport (Particules d'énergie)
 * 1: Animes (Slime + Magie Noire Black Clover)
 * 2: Musique (Ondes sonores)
 * 3: Projets (Grilles architecturales)
 * 4: Design (Blobs de peinture)
 * 5: Technologie (Matrice WebGL/CSS)
 */

// Fonds interactifs avec images générées
const HOBBY_IMAGES = {
  0: '/img/hobbies/hobby_sport_1790522620126.jpg', // Sport
  1: '/img/hobbies/hobby_anime_1790522648472.jpg', // Anime
  2: '/img/hobbies/hobby_music_1790522668115.jpg', // Music
  3: '/img/hobbies/hobby_projects_1790522686177.jpg', // Projets
  4: '/img/hobbies/hobby_design_1790522700207.jpg', // Design
  5: '/img/hobbies/hobby_tech_1790522718320.jpg', // Technologie
};

function ImageBackground({ src, children }) {
  return (
    <div className="absolute inset-0 bg-void overflow-hidden">
      <motion.img 
        src={src} 
        alt="Hobby Background" 
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        initial={{ scale: 1 }}
        animate={{ scale: 1.1 }}
        transition={{ duration: 15, repeat: Infinity, repeatType: 'reverse' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-void opacity-80" />
      <div className="absolute inset-0 bg-void/30" />
      {children}
    </div>
  );
}

// Anime avec particules interactives (Rimuru)
function AnimeBackground() {
  const slimeRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!slimeRef.current) return;
      const x = e.clientX;
      const y = e.clientY;
      slimeRef.current.style.transform = `translate(${x - 150}px, ${y - 150}px)`;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <ImageBackground src={HOBBY_IMAGES[1]}>
      {/* Rimuru Slime interactif (effet liquide) */}
      <div className="absolute inset-0" style={{ filter: "url('#goo')" }}>
        <div
          ref={slimeRef}
          className="absolute top-0 left-0 w-[300px] h-[300px] rounded-full transition-transform duration-700 ease-out pointer-events-none opacity-40"
          style={{ background: 'radial-gradient(circle at 30% 30%, #60A5FA, #2563EB)' }}
        >
           <motion.div 
             className="w-full h-full rounded-full"
             animate={{ scaleX: [1, 1.1, 0.9, 1], scaleY: [1, 0.9, 1.1, 1] }}
             transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
           />
        </div>
      </div>

      <svg className="hidden">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
    </ImageBackground>
  );
}

const BACKGROUNDS = {
  0: () => <ImageBackground src={HOBBY_IMAGES[0]} />,
  1: AnimeBackground,
  2: () => <ImageBackground src={HOBBY_IMAGES[2]} />,
  3: () => <ImageBackground src={HOBBY_IMAGES[3]} />,
  4: () => <ImageBackground src={HOBBY_IMAGES[4]} />,
  5: () => <ImageBackground src={HOBBY_IMAGES[5]} />,
};

// Transitions thématiques : masque SVG d'entrée
const transitionVariants = {
  initial: (direction) => ({
    clipPath: direction > 0 ? "circle(0% at 100% 50%)" : "circle(0% at 0% 50%)",
    zIndex: 1
  }),
  animate: {
    clipPath: "circle(150% at 50% 50%)",
    zIndex: 1,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  },
  exit: {
    zIndex: 0,
    transition: { duration: 0.8 }
  }
};

export default function HobbyBackgrounds({ activeIndex, direction }) {
  const BgComponent = BACKGROUNDS[activeIndex] || GenericBackground;

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={activeIndex}
          custom={direction}
          variants={transitionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute inset-0"
        >
          <BgComponent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
