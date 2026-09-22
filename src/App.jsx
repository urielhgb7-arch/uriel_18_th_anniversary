import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Map, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import LoadingScreen from './components/features/LoadingScreen';
import IncomingCall from './components/features/IncomingCall';
import MapItinerary from './components/features/MapItinerary';
import ExperienceScroll from './components/features/ExperienceScroll';
import './index.css';

export default function App() {
  const [stage, setStage] = useState('LOADING'); // LOADING, INCOMING_CALL, MAP, EXPERIENCE
  const [isMuted, setIsMuted] = useState(true);

  // Gérer le son persistant
  useEffect(() => {
    const saved = localStorage.getItem('vip_muted');
    if (saved !== null) {
      setIsMuted(saved === 'true');
    }
  }, []);

  const toggleMute = () => {
    const newVal = !isMuted;
    setIsMuted(newVal);
    localStorage.setItem('vip_muted', String(newVal));
  };

  // Les transitions d'écrans (Fade simple pour optimisation mobile)
  const pageVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-[#120b2e] overflow-hidden">
      
      {/* Bouton Audio Global */}
      <button 
        onClick={toggleMute}
        className="fixed top-6 right-6 z-50 w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95"
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {/* Icône flottante pour basculer (affichée uniquement hors appel/loading) */}
      <AnimatePresence>
        {(stage === 'MAP' || stage === 'EXPERIENCE') && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setStage(stage === 'MAP' ? 'EXPERIENCE' : 'MAP')}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-purple-600 to-emerald-500 rounded-full flex items-center justify-center text-white shadow-[0_10px_30px_rgba(107,33,168,0.5)] transition-transform hover:scale-105 active:scale-95"
          >
            {stage === 'MAP' ? <Sparkles size={24} /> : <Map size={24} />}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Machine à états des pages */}
      <AnimatePresence mode="wait">
        
        {stage === 'LOADING' && (
          <motion.div key="loading" variants={pageVariants} initial="initial" animate="in" exit="out" className="w-full h-full">
            <LoadingScreen onComplete={() => setStage('INCOMING_CALL')} />
          </motion.div>
        )}

        {stage === 'INCOMING_CALL' && (
          <motion.div key="call" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 1 }} className="w-full h-full">
            <IncomingCall onSelectPath={(path) => setStage(path === 'map' ? 'MAP' : 'EXPERIENCE')} />
          </motion.div>
        )}

        {stage === 'MAP' && (
          <motion.div key="map" variants={pageVariants} initial="initial" animate="in" exit="out" className="w-full h-full">
            <MapItinerary />
          </motion.div>
        )}

        {stage === 'EXPERIENCE' && (
          <motion.div key="experience" variants={pageVariants} initial="initial" animate="in" exit="out" className="w-full h-[100dvh]">
            <ExperienceScroll />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
