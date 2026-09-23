import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { mountTunnel } from '../../lib/tunnel';
import { playDive, haptic, HAPTIC } from '../../lib/audio';
import { useReducedMotion, usePerfTier } from '../../lib/hooks';

/**
 * Acte II — La chute quantique.
 *
 * Charnière du site : l'UI iOS est aspirée vers l'avant, l'illusion se brise.
 * Le tunnel est un shader plein écran (voir lib/tunnel.js), donc le coût est en
 * fillrate et pas en géométrie — un mobile milieu de gamme tient la cadence.
 *
 * Trois chemins de sortie, tous appelant onComplete exactement une fois :
 *  - WebGL disponible → shader ;
 *  - WebGL absent     → fallback CSS (dégradés + scale) ;
 *  - reduced-motion   → fondu court, aucun mouvement.
 */

const DURATION = 2300;

/** Fallback sans WebGL : anneaux CSS en fuite. Moins riche, même intention. */
function CssTunnel() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 rounded-full border-2"
          style={{
            width: '160vmax',
            height: '160vmax',
            marginLeft: '-80vmax',
            marginTop: '-80vmax',
            borderColor: i % 2 ? 'rgba(14,165,233,0.5)' : 'rgba(139,92,246,0.55)',
          }}
          initial={{ scale: 0.015, opacity: 0 }}
          animate={{ scale: [0.015, 1.9], opacity: [0, 0.85, 0] }}
          transition={{
            duration: 1.5,
            delay: i * (DURATION / 1000 / 7),
            repeat: Infinity,
            ease: 'easeIn',
          }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at center,rgba(196,181,253,0.55),transparent 42%)' }}
      />
    </div>
  );
}

export default function QuantumDive({ onComplete }) {
  const canvasRef = useRef(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const reduced = useReducedMotion();
  const tier = usePerfTier();
  // onComplete ne doit partir qu'une fois : shader, fallback et timer de sûreté
  // peuvent tous arriver à échéance.
  const done = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (done.current) return;
      done.current = true;
      onComplete();
    };

    // Mouvement réduit : pas de tunnel du tout, juste une coupure brève.
    if (reduced) {
      const t = setTimeout(finish, 520);
      return () => clearTimeout(t);
    }

    playDive(DURATION / 1000);
    haptic(HAPTIC.impact);

    const handle = canvasRef.current
      ? mountTunnel(canvasRef.current, { duration: DURATION, tier, onDone: finish })
      : null;

    if (!handle) setWebglFailed(true);

    // Garde-fou : si le rAF est gelé (onglet en arrière-plan, contexte perdu),
    // on ne veut pas laisser le visiteur bloqué sur un écran noir.
    const safety = setTimeout(finish, DURATION + 900);

    return () => {
      clearTimeout(safety);
      handle?.destroy();
    };
  }, [onComplete, reduced, tier]);

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
      {webglFailed ? (
        <CssTunnel />
      ) : (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      )}

      {/* Flash d'entrée : l'instant où l'interface iOS se rompt. */}
      <motion.div
        className="absolute inset-0 bg-white pointer-events-none"
        initial={{ opacity: 0.95 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.42, ease: 'easeOut' }}
      />

      {/* Vignette : concentre le regard au centre, masque les bords du shader. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center,transparent 42%,rgba(0,0,0,0.82) 100%)' }}
      />

      <motion.p
        className="absolute inset-x-0 bottom-[16vh] text-center text-white/75 text-[11px] tracking-[0.42em] uppercase pointer-events-none"
        style={{ fontFamily: 'var(--font-mono)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0.8, 0] }}
        transition={{ duration: DURATION / 1000, times: [0, 0.22, 0.68, 1] }}
      >
        Effondrement de la ligne temporelle
      </motion.p>
    </div>
  );
}

