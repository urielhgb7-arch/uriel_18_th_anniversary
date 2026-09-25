import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { playDive, haptic, HAPTIC } from '../../lib/audio';
import { useReducedMotion } from '../../lib/hooks';
import GlassTunnel3D from '../ui/liquid-glass-boxes';

/**
 * Acte II — La chute quantique.
 *
 * Charnière du site : l'UI iOS est aspirée vers l'avant, l'illusion se brise.
 */

const DURATION = 2300;

export default function QuantumDive({ onComplete }) {
  const reduced = useReducedMotion();
  const done = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (done.current) return;
      done.current = true;
      onComplete();
    };

    if (reduced) {
      const t = setTimeout(finish, 520);
      return () => clearTimeout(t);
    }

    playDive(DURATION / 1000);
    haptic(HAPTIC.impact);

    const safety = setTimeout(finish, DURATION);

    return () => {
      clearTimeout(safety);
    };
  }, [onComplete, reduced]);

  if (reduced) {
    return (
      <motion.div
        className="fixed inset-0 z-50 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      <GlassTunnel3D animationDuration={0.4} boxCount={5} circleCount={6} />

      {/* Flash d'entrée : l'instant où l'interface iOS se rompt. */}
      <motion.div
        className="absolute inset-0 bg-white pointer-events-none"
        initial={{ opacity: 0.95 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.42, ease: 'easeOut' }}
      />

      <motion.p
        className="label-mono absolute inset-x-0 bottom-[16vh] text-center pointer-events-none"
        style={{ color: 'rgba(255,255,255,0.75)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0.8, 0] }}
        transition={{ duration: DURATION / 1000, times: [0, 0.22, 0.68, 1] }}
      >
        Effondrement de la ligne temporelle
      </motion.p>
    </div>
  );
}

