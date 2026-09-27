import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LockScreen from './components/features/LockScreen';
import IncomingCall from './components/features/IncomingCall';
import QuantumDive from './components/features/QuantumDive';
import UniverseMap from './components/features/UniverseMap';
import UniverseSelf from './components/features/UniverseSelf';
import ContactExperience from './components/features/ContactExperience';
import DynamicIsland from './components/layout/DynamicIsland';
import AppSwitcher from './components/layout/AppSwitcher';
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
 *   LOCK → CALL → DIVE → MAP ⇄ SELF
 *
 * L'écran d'appel EST le carrefour : ses deux glyphes (épingle / empreinte)
 * choisissent l'univers, le plongeon y mène directement. Le hub intermédiaire a
 * été supprimé — il redemandait à l'invité un choix qu'il venait de faire.
 * Une fois dans le multivers, les deux univers restent reliés entre eux.
 *
 * Le son est géré ici parce que c'est le seul endroit qui survit à tous les
 * écrans. Le déverrouillage de l'AudioContext se fait sur le geste du
 * LockScreen : un navigateur mobile refuse tout son avant une interaction, et
 * un bouton « activer le son » trahirait la mise en scène dès la première
 * seconde.
 */

const STAGES_WITH_CHROME = new Set(['MAP', 'SELF', 'CONTACT']);

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
  const [stage, setStage] = useState(() => {
    // Si l'utilisateur est déjà passé dans cet onglet, on saute l'intro
    return sessionStorage.getItem('has_unlocked') === 'true' ? 'MAP' : 'LOCK';
  });
  /* La destination choisie sur l'écran d'appel, consommée à la fin du plongeon. */
  const [target, setTarget] = useState('MAP');
  /* La préférence vient de localStorage (le son peut persister globalement) */
  const [muted, setMuted] = useState(initAudioPreference);
  /* État du Switcher global */
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Filet de sécurité : quitter la page ne doit pas laisser un drone tourner.
  useEffect(() => () => stopAll(), []);

  // --- LOGIQUE AUTOPLAY (déclenchée par le QR Code) ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoplay') === 'true') {
      const runAutoplay = async () => {
        // Si on a déjà déverrouillé, on est directement sur MAP, pas besoin d'autoplay
        if (sessionStorage.getItem('has_unlocked') === 'true') {
          return;
        }
        
        // 1. Écran de verrouillage : on laisse le temps de voir l'écran (2.5s)
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // 2. On déverrouille et on passe à l'appel
        try { await unlockAudio(); } catch (e) { console.warn("Audio ignoré sans interaction"); }
        setStage('CALL');

        // 3. Écran d'appel : on laisse sonner pendant 4 secondes
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        // 4. On décroche automatiquement vers la carte (localisation)
        sessionStorage.setItem('has_unlocked', 'true');
        setTarget('MAP');
        setStage('DIVE');
      };
      runAutoplay();
    }
  }, []);
  // ----------------------------------------------------

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

  /* L'écran d'appel choisit la destination, le plongeon la sert. */
  const handlePick = useCallback((universe) => {
    sessionStorage.setItem('has_unlocked', 'true');
    setTarget(universe);
    setStage('DIVE');
  }, []);

  const handleDiveComplete = useCallback(() => setStage(target), [target]);

  const goMap = useCallback(() => {
    playWhoosh();
    setStage('MAP');
  }, []);

  const goSelf = useCallback(() => {
    playWhoosh();
    setStage('SELF');
  }, []);

  return (
    <div className="relative w-full min-h-[100dvh] bg-void overflow-hidden">
      {/* Dynamic Island — navigation globale (MAP / SELF / CONTACT) */}
      <AnimatePresence>
        {STAGES_WITH_CHROME.has(stage) && !isSwitcherOpen && (
          <DynamicIsland
            key="island"
            muted={muted}
            activeApp={stage}
            onToggleMute={toggleMute}
            onNavigate={(dest) => {
              playWhoosh();
              setStage(dest);
            }}
            onOpenSwitcher={() => setIsSwitcherOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Switcher façon iOS multitâche */}
      <AnimatePresence>
        {isSwitcherOpen && (
          <AppSwitcher
            key="switcher"
            activeApp={stage}
            onClose={() => setIsSwitcherOpen(false)}
            onSelect={(newTarget) => {
              setIsSwitcherOpen(false);
              playWhoosh();
              setStage(newTarget);
            }}
          />
        )}
      </AnimatePresence>

      {/* Main View Container, scales down when Switcher is open */}
      <motion.div 
        animate={{ 
          scale: isSwitcherOpen ? 0.9 : 1, 
          opacity: isSwitcherOpen ? 0.4 : 1,
          filter: isSwitcherOpen ? 'blur(4px)' : 'blur(0px)'
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full h-full absolute inset-0"
      >

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
            <IncomingCall onPick={handlePick} />
          </motion.div>
        )}

        {/* Le plongeon ne fait pas de fondu en entrée : la coupure doit être
            brutale, c'est tout l'effet. */}
        {stage === 'DIVE' && (
          <motion.div key="dive" exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full">
            <QuantumDive onComplete={handleDiveComplete} />
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
            <UniverseMap onSwitch={goSelf} />
          </motion.div>
        )}

        {stage === 'SELF' && (
          <motion.div
            key="self"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full h-full"
          >
            <UniverseSelf onSwitch={() => setIsSwitcherOpen(true)} />
          </motion.div>
        )}

        {stage === 'CONTACT' && (
          <motion.div
            key="contact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <ContactExperience />
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
}
