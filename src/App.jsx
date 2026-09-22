import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import LoadingScreen from './components/features/LoadingScreen';
import IncomingCall from './components/features/IncomingCall';
import MapItinerary from './components/features/MapItinerary';
import ConstellationGame from './components/features/ConstellationGame';
import './index.css';

export default function App() {
  const [stage, setStage] = useState('LOADING'); // LOADING, INCOMING_CALL, MAP, CONSTELLATION
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
    <div className="relative w-full h-[100dvh] bg-[#0a0f1c] overflow-hidden">
      
      {/* Bouton Audio Global */}
      <button 
        onClick={toggleMute}
        className="fixed top-6 right-6 z-50 w-10 h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white"
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* Machine à états des pages */}
      <AnimatePresence mode="wait">
        
        {stage === 'LOADING' && (
          <motion.div key="loading" variants={pageVariants} initial="initial" animate="in" exit="out" className="w-full h-full">
            <LoadingScreen onComplete={() => setStage('INCOMING_CALL')} />
          </motion.div>
        )}

        {stage === 'INCOMING_CALL' && (
          <motion.div key="call" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 1 }} className="w-full h-full">
            <IncomingCall onSelectPath={(path) => setStage(path === 'map' ? 'MAP' : 'CONSTELLATION')} />
          </motion.div>
        )}

        {stage === 'MAP' && (
          <motion.div key="map" variants={pageVariants} initial="initial" animate="in" exit="out" className="w-full h-full">
            <MapItinerary onSwitchToConstellation={() => setStage('CONSTELLATION')} />
          </motion.div>
        )}

        {stage === 'CONSTELLATION' && (
          <motion.div key="constellation" variants={pageVariants} initial="initial" animate="in" exit="out" className="w-full h-full">
            <ConstellationGame onSwitchToMap={() => setStage('MAP')} />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
