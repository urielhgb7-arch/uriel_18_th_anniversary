import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Sparkles } from 'lucide-react';
import content from '../../content.json';
import { FLYBY_LABELS } from '../../lib/geo';
import { useReducedMotion, usePerfTier, useTilt } from '../../lib/hooks';
import { playLock, playTick, playWhoosh, haptic, HAPTIC } from '../../lib/audio';

/**
 * Univers A — Localisation.
 *
 * Deux temps assumés :
 *  1. GLOBE  : globe holographique 3D, vol orbital jusqu'à Cotonou. Spectacle.
 *  2. GROUND : vraie carte Leaflet + itinéraire réel. Utilité.
 *
 * Ce découpage résout la tension du brief : un globe 3D impressionne mais ne
 * conduit personne à la fête, une carte plate est utile mais banale. On enchaîne
 * les deux, le passage se faisant au moment où le globe touche le sol.
 *
 * three.js et Leaflet sont tous deux chargés en import() dynamique — aucun des
 * deux ne doit peser sur l'écran d'appel.
 */

const FLIGHT_MS = 7000;

function formatCoord(v, axis) {
  const dir = axis === 'lat' ? (v >= 0 ? 'N' : 'S') : v >= 0 ? 'E' : 'W';
  return `${Math.abs(v).toFixed(4)}° ${dir}`;
}

/** Ouvre l'itinéraire dans l'app de navigation du téléphone. */
function openNavigation(lat, lng) {
  const ua = navigator.userAgent || '';
  const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

  /* Repli web si le schéma natif n'est intercepté par aucune app. On vérifie
     document.hidden au moment de tirer : si l'app de navigation s'est bien
     ouverte, la page est passée en arrière-plan, et ouvrir l'onglet quand même
     laisserait l'invité avec un Google Maps parasite au retour. */
  const fallbackToWeb = () => {
    setTimeout(() => {
      if (document.hidden) return;
      window.open(web, '_blank', 'noopener');
    }, 1400);
  };

  if (/android/i.test(ua)) {
    // Tente l'app native, puis retombe sur le web si rien n'intercepte.
    window.location.href = `google.navigation:q=${lat},${lng}&mode=d`;
    fallbackToWeb();
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    window.location.href = `maps://?daddr=${lat},${lng}&dirflg=d`;
    fallbackToWeb();
  } else {
    window.open(web, '_blank', 'noopener');
  }
}

/** Cadre HUD : coins tracés en CSS, aucun asset. */
function HudFrame({ color = 'rgba(201,168,106,0.55)' }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-20" style={{ color }}>
      {[
        'top-6 left-5',
        'top-6 right-5 rotate-90',
        'bottom-6 right-5 rotate-180',
        'bottom-6 left-5 -rotate-90',
      ].map((cls) => (
        <div key={cls} className={`absolute w-4 h-4 hud-corner opacity-55 ${cls}`} />
      ))}
    </div>
  );
}

/* Bruit pseudo-aléatoire déterministe. Math.random() rendrait le composant
   impur : React peut rendre deux fois, et les deux passes donneraient des
   chiffres différents. Semé sur `progress`, qui change toutes les 120 ms, on
   garde exactement le même grésillement à l'écran. */
function noise(seed) {
  const n = Math.sin(seed * 127.1) * 43758.5453;
  return n - Math.floor(n) - 0.5;
}

/** Lecture de coordonnées qui défile pendant le vol. */
function Telemetry({ lat, lng, progress }) {
  // Converge vers la valeur réelle : au début les chiffres sont bruités.
  const jitter = Math.max(0, 1 - progress) * 5;
  const dLat = lat + noise(progress + 0.3) * jitter;
  const dLng = lng + noise(progress + 7.7) * jitter;
  return (
    <div
      className="text-[11px] leading-relaxed text-muted tabular-nums"
      style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
    >
      <p>{formatCoord(dLat, 'lat')}</p>
      <p>{formatCoord(dLng, 'lng')}</p>
    </div>
  );
}

import { BlobShader } from '../blob-organique-3d';

/** Étape 1 : globe 3D (remplacé par Blob organique 3D). */
function GlobeStage({ lat, lng, onArrive, tilt, reduced, tier }) {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();

    const ticker = setInterval(() => {
      setProgress(Math.min((performance.now() - t0) / FLIGHT_MS, 1));
    }, 120);

    const fallback = setTimeout(() => {
      if (!cancelled) {
        playLock();
        haptic(HAPTIC.impact);
        onArrive();
      }
    }, FLIGHT_MS);

    // Simulate phases of triangulation
    const phase1 = setTimeout(() => !cancelled && setPhase(1), FLIGHT_MS * 0.33);
    const phase2 = setTimeout(() => !cancelled && setPhase(2), FLIGHT_MS * 0.66);

    return () => {
      cancelled = true;
      clearInterval(ticker);
      clearTimeout(fallback);
      clearTimeout(phase1);
      clearTimeout(phase2);
    };
  }, [lat, lng, onArrive]);

  return (
    <div className="absolute inset-0 bg-void flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <BlobShader color="rgba(201,168,106,1)" background="#0b0e13" scale={0.8} intensity={0.6} cameraZ={7.5} followMouse={false} />
      </div>

      {/* Container avec pointer-events-none pour ne pas bloquer les événements souris du blob */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <HudFrame />

        <div className="absolute top-0 left-0 right-0 pt-safe px-6 z-20 pointer-events-none">
          <div className="flex items-start justify-between mt-4">
            <div>
              <div className="flex items-center gap-2">
                <motion.span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--color-accent)' }}
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                />
                <span className="label-mono" style={{ color: 'var(--color-accent)' }}>
                  Triangulation
                </span>
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={phase}
                  className="text-ink text-xl mt-1.5"
                  style={{ fontFamily: 'var(--font-display)' }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.32 }}
                >
                  {FLYBY_LABELS[phase] ?? FLYBY_LABELS[0]}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="text-right mt-1">
              <Telemetry lat={lat} lng={lng} progress={progress} />
            </div>
          </div>
        </div>

        {/* Barre de progression du vol */}
        <div className="absolute bottom-0 left-0 right-0 pb-safe px-6 z-20 pointer-events-none">
          <div className="mb-6">
            <div className="h-px w-full bg-ink/10 overflow-hidden">
              <motion.div
                className="h-full"
                style={{
                  background: 'var(--color-accent)',
                  boxShadow: '0 0 8px rgba(201,168,106,0.7)',
                }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ ease: 'linear', duration: 0.12 }}
              />
            </div>
            <p className="label-mono mt-2">Descente orbitale</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Étape 2 : carte réelle. Leaflet importé à la demande. */
function GroundStage({ lat, lng, name, venue, onSwitch }) {
  const holder = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
      .then(([mod]) => {
        if (cancelled || !holder.current || mapRef.current) return;
        const L = mod.default ?? mod;

        // Carte non interactive : c'est une vue cinématique, pas un outil de
        // navigation. Le bouton renvoie vers la vraie app GPS.
        const map = L.map(holder.current, {
          zoomControl: false,
          attributionControl: true,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          keyboard: false,
          boxZoom: false,
          tap: false,
        }).setView([lat, lng], 13);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          subdomains: 'abc',
          maxZoom: 19,
          attribution: '© OpenStreetMap',
        }).addTo(map);

        const icon = L.divIcon({
          className: '',
          iconSize: [72, 72],
          iconAnchor: [36, 36],
          html: `
            <div class="nx-pin">
              <span class="nx-pin-ring"></span>
              <span class="nx-pin-ring nx-pin-ring--late"></span>
              <span class="nx-pin-cross"></span>
              <span class="nx-pin-core"></span>
            </div>`,
        });
        L.marker([lat, lng], { icon, keyboard: false }).addTo(map);

        // Léger recadrage après le rendu initial : atterrissage en douceur.
        setTimeout(() => {
          if (!cancelled) map.flyTo([lat, lng], 16, { duration: 2.4 });
        }, 400);

        setReady(true);
      })
      .catch(() => {
        // Tuiles indisponibles : le panneau et le bouton GPS restent utiles.
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  return (
    <motion.div
      className="absolute inset-0 bg-void"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.1 }}
    >
      {/* Filtre : transforme les tuiles OSM claires en carte sombre quasi
          monochrome. `saturate(0.25)` au lieu d'un virage de teinte : on ne veut
          pas d'une seconde couleur qui concurrence l'or du bouton. */}
      <div
        ref={holder}
        className="absolute inset-0 z-0"
        style={{ filter: 'invert(1) grayscale(0.82) brightness(0.8) contrast(1.2) saturate(0.25)' }}
      />

      {/* Vignette seule. Les lignes de scan ont sauté : elles ajoutaient du
          bruit sur la seule zone que l'invité doit pouvoir lire. */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center,transparent 42%,rgba(6,6,10,0.86) 100%)' }}
      />

      <HudFrame />

      <AnimatePresence>
        {ready && (
          <>
            {/* Carte flottante : le seul endroit où le verre sert vraiment —
                il faut lire du texte par-dessus des tuiles imprévisibles. */}
            <motion.div
              className="absolute top-0 left-0 right-0 z-30 px-4 pt-safe pointer-events-none"
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="glass-nexus rounded-3xl px-5 py-4 flex items-start justify-between mt-3 gap-4">
                <div>
                  <span className="label-mono">Le lieu</span>
                  <h1 className="text-ink text-[35px] leading-[1.02] mt-1.5">{name}</h1>
                  <p className="text-muted text-[13px] mt-1.5">{venue}</p>
                </div>
                <div className="text-right mt-1 shrink-0">
                  <Telemetry lat={lat} lng={lng} progress={1} />
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute bottom-0 left-0 right-0 z-30 px-5 pb-safe"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* UNE seule action primaire, et c'est le seul élément en haut
                  contraste de l'écran : fond or plein, texte presque noir, sur
                  une carte devenue quasi monochrome. Tout le reste est en
                  retrait. Le but est qu'on sache où cliquer pour venir sans
                  avoir à chercher.

                  Le verre a disparu autour du bouton : une plaque translucide
                  derrière le seul élément plein ne servait qu'à en diluer le
                  contraste. Il ne reste du glassmorphism que là où il porte de
                  l'information — la carte flottante en haut. */}
              <motion.button
                onClick={() => {
                  haptic(HAPTIC.impact);
                  openNavigation(lat, lng);
                }}
                className="w-full flex items-center justify-center gap-3 py-[19px] rounded-2xl text-[14px] text-void"
                style={{
                  background: 'var(--color-accent)',
                  boxShadow: '0 14px 40px -10px rgba(201,168,106,0.55)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                }}
                whileTap={{ scale: 0.975 }}
              >
                <Navigation size={18} />
                Lancer l'itinéraire
              </motion.button>

              {/* Action secondaire : volontairement basse en contraste, petite,
                  et sans fond. Elle ne doit jamais entrer en concurrence avec
                  celle du dessus. */}
              <button
                onClick={() => {
                  playWhoosh();
                  haptic(HAPTIC.soft);
                  onSwitch();
                }}
                className="label-mono w-full flex items-center justify-center gap-2 py-[16px] mt-3 bg-white/5 border border-white/10 rounded-2xl active:bg-white/10 transition-colors text-ink/80 hover:text-ink"
              >
                <Sparkles size={14} />
                Me connaître
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function UniverseMap({ onSwitch }) {
  const { lat, lng, name, venue } = content.event.location;
  const [stage, setStage] = useState('GLOBE');
  const reduced = useReducedMotion();
  const tier = usePerfTier();
  const { tilt } = useTilt({ enabled: !reduced });

  // Stabilise la référence : GlobeStage l'a en dépendance d'effet, une nouvelle
  // fonction à chaque render remonterait le globe en boucle.
  const handleArrive = useCallback(() => {
    setStage((s) => (s === 'GLOBE' ? 'GROUND' : s));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-void">
      <AnimatePresence mode="wait">
        {stage === 'GLOBE' ? (
          <motion.div key="globe" className="absolute inset-0" exit={{ opacity: 0, scale: 1.08 }} transition={{ duration: 0.9 }}>
            <GlobeStage
              lat={lat}
              lng={lng}
              tilt={tilt}
              reduced={reduced}
              tier={tier}
              onArrive={handleArrive}
            />
          </motion.div>
        ) : (
          <GroundStage key="ground" lat={lat} lng={lng} name={name} venue={venue} onSwitch={onSwitch} />
        )}
      </AnimatePresence>
    </div>
  );
}

