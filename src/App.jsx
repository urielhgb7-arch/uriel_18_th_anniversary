import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LockScreen from './components/features/LockScreen';
import IncomingCall from './components/features/IncomingCall';
import QuantumDive from './components/features/QuantumDive';
import NexusHub from './components/features/NexusHub';
import UniverseMap from './components/features/UniverseMap';
import UniverseSelf from './components/features/UniverseSelf';
import {
  initAudioPreference,
  setMuted as setAudioMuted,
  unlockAudio,
  stopAll,
  playWhoosh,
  haptic,
  HAPTIC,
} from './lib/audio';
import './index.css';

/**
 * La machine à états du récit.
 *
 *   LOCK → CALL → DIVE → HUB ⇄ MAP
 *                         ⇅
 *                        SELF
 *
 * L'ordre n'est pas négociable jusqu'au HUB : c'est là que tient l'illusion.
 * À partir du hub, l'invité circule librement entre les deux univers.
 *
 * Le son est géré ici parce que c'est le seul endroit qui survit à tous les
 * écrans. Le déverrouillage de l'AudioContext se fait sur le geste du
 * LockScreen : un navigateur mobile refuse tout son avant une interaction, et
 * un bouton « activer le son » trahirait la mise en scène dès la première
 * seconde.
 */

const STAGES_WITH_CHROME = new Set(['HUB', 'MAP', 'SELF']);

function SoundIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {muted ? (
        <path d="M16 9l5 6M21 9l-5 6" />
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 6a9 9 0 0 1 0 12" />
        </>
      )}
    </svg>
  );
}

export default function App() {
  const [stage, setStage] = useState('LOCK');
  /* La préférence vient de localStorage : elle est disponible dès le premier
     rendu, donc autant initialiser l'état directement. Passer par un effet
     afficherait brièvement la mauvaise icône puis déclencherait un re-rendu. */
  const [muted, setMuted] = useState(initAudioPreference);

  // Filet de sécurité : quitter la page ne doit pas laisser un drone tourner.
  useEffect(() => () => stopAll(), []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
    haptic(HAPTIC.tap);
  };

  const handleUnlock = useCallback(async () => {
    // Le geste de déverrouillage est ce qui autorise le son. On attend la
    // reprise du contexte avant de monter l'appel, sinon la sonnerie part
    // dans un contexte encore suspendu et le premier cycle est muet.
    // La sonnerie elle-même appartient à IncomingCall (démarrage au montage,
    // arrêt au démontage) : la lancer ici aussi dupliquerait la logique.
    await unlockAudio();
    setStage('CALL');
  }, []);

  const handleAccept = useCallback(() => setStage('DIVE'), []);

  const handleDiveComplete = useCallback(() => setStage('HUB'), []);

  const goHub = useCallback(() => {
    playWhoosh();
    setStage('HUB');
  }, []);

  const goMap = useCallback(() => setStage('MAP'), []);
  const goSelf = useCallback(() => setStage('SELF'), []);

  return (
    <div className="relative w-full min-h-[100dvh] bg-void overflow-hidden">
      {/* Le bouton son n'apparaît qu'après le plongeon : sur l'écran verrouillé
          et pendant l'appel, il n'existe pas sur un vrai téléphone. */}
      <AnimatePresence>
        {STAGES_WITH_CHROME.has(stage) && (
          <motion.button
            key="mute"
            onClick={toggleMute}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.4 }}
            className="fixed z-[60] right-4 top-[calc(var(--safe-t)+1rem)] w-10 h-10 rounded-full
                       glass-nexus flex items-center justify-center text-white/70
                       transition-transform active:scale-95"
            aria-label={muted ? 'Activer le son' : 'Couper le son'}
            aria-pressed={muted}
          >
            <SoundIcon muted={muted} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {stage === 'LOCK' && (
          <motion.div key="lock" exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="w-full">
            <LockScreen onUnlock={handleUnlock} />
          </motion.div>
        )}

        {stage === 'CALL' && (
          <motion.div
            key="call"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            <IncomingCall onAccept={handleAccept} />
          </motion.div>
        )}

        {/* Le plongeon ne fait pas de fondu en entrée : la coupure doit être
            brutale, c'est tout l'effet. */}
        {stage === 'DIVE' && (
          <motion.div key="dive" exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full">
            <QuantumDive onComplete={handleDiveComplete} />
          </motion.div>
        )}

        {stage === 'HUB' && (
          <motion.div
            key="hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full"
          >
            <NexusHub onPickMap={goMap} onPickSelf={goSelf} />
          </motion.div>
        )}

        {stage === 'MAP' && (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full"
          >
            <UniverseMap onSwitch={goSelf} onBack={goHub} />
          </motion.div>
        )}

        {stage === 'SELF' && (
          <motion.div
            key="self"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full"
          >
            <UniverseSelf onSwitch={goMap} onBack={goHub} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
