import { useCallback, useEffect, useRef, useState } from 'react';

/** Respecte prefers-reduced-motion et suit les changements à chaud. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/**
 * Palier de performance, pour dimensionner les effets WebGL.
 * Heuristique volontairement grossière : il n'existe pas d'API fiable de GPU.
 * On dégrade sur peu de cœurs / peu de RAM plutôt que de viser juste.
 */
export function usePerfTier() {
  const [tier] = useState(() => {
    const cores = navigator.hardwareConcurrency ?? 4;
    // deviceMemory : Chromium uniquement, en GiB. Absent ailleurs → on suppose 4.
    const ram = typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : 4;
    if (cores <= 4 || ram <= 3) return 'low';
    if (cores <= 6) return 'mid';
    return 'high';
  });
  return tier;
}

/**
 * Inclinaison de l'appareil, normalisée dans [-1, 1].
 *
 * Sur desktop il n'y a pas de gyroscope : on retombe sur la position du curseur,
 * pour que l'effet de parallaxe existe quand même à la présentation.
 * iOS 13+ exige une permission explicite via un geste — d'où `request()`.
 */
export function useTilt({ enabled = true, maxDeg = 28 } = {}) {
  const tilt = useRef({ x: 0, y: 0 });

  /* Deux capacités du navigateur, connues dès le premier rendu : pas besoin
     d'un effet pour les découvrir. Un initialiseur paresseux ne s'exécute
     qu'une fois et évite le re-rendu en cascade d'un setState dans un effet. */
  const [caps] = useState(() => {
    const hasAPI = typeof window.DeviceOrientationEvent !== 'undefined';
    return {
      hasAPI,
      // iOS 13+ : l'accès au gyroscope doit être demandé depuis un vrai geste.
      needsGesture: hasAPI && typeof window.DeviceOrientationEvent.requestPermission === 'function',
    };
  });
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const onOrient = (e) => {
      // gamma : roulis gauche/droite. beta : tangage avant/arrière.
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;
      tilt.current.x = Math.max(-1, Math.min(1, gamma / maxDeg));
      // On recentre autour de ~45°, l'angle naturel de lecture d'un téléphone.
      tilt.current.y = Math.max(-1, Math.min(1, (beta - 45) / maxDeg));
    };

    const onPointer = (e) => {
      tilt.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      tilt.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    /* L'effet est le seul propriétaire des écouteurs, y compris après
       l'autorisation iOS : `granted` est dans les dépendances, donc accorder la
       permission relance ce même effet. La version précédente branchait le
       gyroscope depuis request() avec une fonction anonyme, impossible à
       retirer — un écouteur fuyait à chaque démontage. */
    if (caps.hasAPI && (!caps.needsGesture || granted)) {
      window.addEventListener('deviceorientation', onOrient);
    }
    window.addEventListener('pointermove', onPointer);

    return () => {
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('pointermove', onPointer);
    };
  }, [enabled, maxDeg, caps, granted]);

  /** À brancher sur un vrai tap : iOS refuse la demande hors geste. */
  const request = useCallback(async () => {
    const DOE = window.DeviceOrientationEvent;
    if (typeof DOE?.requestPermission !== 'function') return false;
    try {
      const res = await DOE.requestPermission();
      if (res === 'granted') {
        setGranted(true);
        return true;
      }
    } catch {
      /* refusé : la parallaxe reste au repos, rien d'autre ne casse */
    }
    return false;
  }, []);

  // Ne rien demander si l'animation est désactivée : l'effet n'écoute pas.
  const needsPermission = enabled && caps.needsGesture && !granted;

  return { tilt, needsPermission, request };
}

/**
 * Horloge du lock screen. On ne montre que l'heure et la minute, donc on se
 * resynchronise sur la frontière de minute au lieu de tourner à la seconde :
 * un seul re-render par minute, et jamais de minute affichée en retard.
 */
export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let id;
    const schedule = () => {
      const d = new Date();
      setNow(d);
      const msToNextMinute = 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds());
      id = setTimeout(schedule, msToNextMinute);
    };
    schedule();
    return () => clearTimeout(id);
  }, []);
  return now;
}
