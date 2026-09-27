import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map } from 'lucide-react';
import { playClick, haptic, HAPTIC, startDrone, stopDrone } from '../../lib/audio';
import BiometricDoor from '../experience/BiometricDoor';
import QuantumPlunge from '../experience/QuantumPlunge';
import HobbiesCarousel from './HobbiesCarousel';
import Enigmas from './Enigmas';
import ContactExperience from './ContactExperience';

export default function UniverseSelf({ onSwitch }) {
  const [stage, setStage] = useState('DOOR'); // 'DOOR' -> 'PLUNGE' -> 'HOBBIES' -> 'QUIZ' -> 'CTA'

  return (
    <div className="absolute inset-0 w-full h-full bg-void overflow-hidden">
      
      <AnimatePresence mode="wait">
        
        {/* Écran 1 : La porte d'entrée Biométrique (Scanner) */}
        {stage === 'DOOR' && (
          <motion.div key="door" exit={{ opacity: 0 }} transition={{ duration: 1.5 }} className="w-full h-full">
            <BiometricDoor onUnlock={() => setStage('PLUNGE')} />
          </motion.div>
        )}

        {/* Écran 2 : La Transition Spectaculaire */}
        {stage === 'PLUNGE' && (
          <motion.div key="plunge" className="w-full h-full">
            <QuantumPlunge onComplete={() => setStage('HOBBIES')} />
          </motion.div>
        )}

        {/* Écran 3 : Le Carrousel des Hobbies */}
        {stage === 'HOBBIES' && (
          <motion.div key="hobbies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.8 }} className="w-full h-full">
            <HobbiesCarousel onComplete={() => setStage('QUIZ')} />
          </motion.div>
        )}

        {/* Écran 4 : Le Quiz */}
        {stage === 'QUIZ' && (
          <motion.div key="quiz" className="absolute inset-0 overflow-y-auto no-scrollbar">
            <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-5 py-16">
              <Enigmas onFinish={() => setStage('CTA')} />
            </section>
          </motion.div>
        )}

        {/* Écran 5 : CTA Final */}
        {stage === 'CTA' && (
          <motion.div key="cta" className="absolute inset-0 overflow-y-auto no-scrollbar" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <section className="relative min-h-[100dvh] flex items-center justify-center px-5">
              <ContactExperience />
            </section>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
