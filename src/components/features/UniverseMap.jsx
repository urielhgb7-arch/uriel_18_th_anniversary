import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Sparkles, ArrowLeft } from 'lucide-react';
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
function HudFrame({ color = '#0ea5e9' }) {
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
    <div className="text-[11px] leading-relaxed tracking-[0.18em] text-stark/85" style={{ fontFamily: 'var(--font-mono)' }}>
      <p>{formatCoord(dLat, 'lat')}</p>
      <p>{formatCoord(dLng, 'lng')}</p>
    </div>
  );
}

/** Étape 1 : globe 3D. */
function GlobeStage({ lat, lng, onArrive, tilt, reduced, tier }) {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState(0);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const handleRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let fallback = 0;
    const t0 = performance.now();

    // Progression pour le HUD : découplée de la boucle de rendu WebGL, qui n'a
    // pas à provoquer de re-render React à chaque frame.
    const ticker = setInterval(() => {
      setProgress(Math.min((performance.now() - t0) / FLIGHT_MS, 1));
    }, 120);

    import('../../lib/globe')
      .then(({ mountGlobe }) => {
        if (cancelled || !canvasRef.current) return;
        const handle = mountGlobe(canvasRef.current, {
          lat,
          lng,
          tier,
          reduced,
          duration: FLIGHT_MS,
          tilt,
          onPhase: (i) => {
            setPhase(i);
            playTick();
            haptic(HAPTIC.tap);
          },
          onArrive: () => {
            playLock();
            haptic(HAPTIC.impact);
            onArrive();
          },
        });
        if (!handle) {
          setFailed(true);
          // Sans WebGL on ne bloque pas : on saute directement à la carte.
          fallback = setTimeout(onArrive, 900);
          return;
        }
        handleRef.current = handle;
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        fallback = setTimeout(onArrive, 900);
      });

    return () => {
      cancelled = true;
      clearInterval(ticker);
      /* Le repli doit être annulé : sans ça, revenir au hub pendant ces 900 ms
         déclencherait quand même l'arrivée et changerait d'étape par-dessus. */
      clearTimeout(fallback);
      handleRef.current?.destroy();
    };
  }, [lat, lng, tier, reduced, tilt, onArrive]);

  return (
    <div className="absolute inset-0 bg-void">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white/45 text-xs tracking-[0.3em] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
            Acquisition satellite…
          </p>
        </div>
      )}

      <HudFrame />

      <div className="absolute top-0 left-0 right-0 pt-safe px-6 z-20 pointer-events-none">
        <div className="flex items-start justify-between mt-4">
          <div>
            <div className="flex items-center gap-2">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-alert"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.1, repeat: Infinity }}
              />
              <span className="text-[10px] tracking-[0.3em] uppercase text-alert font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                Triangulation
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={phase}
                className="text-white text-xl mt-1.5 font-bold"
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

      {/* Barre de progression du vol : donne une fin visible à l'attente. */}
      <div className="absolute bottom-0 left-0 right-0 pb-safe px-6 z-20 pointer-events-none">
        <div className="mb-6">
          <div className="h-px w-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-stark"
              style={{ boxShadow: '0 0 8px #0ea5e9' }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ ease: 'linear', duration: 0.12 }}
            />
          </div>
          <p className="text-[9px] tracking-[0.36em] uppercase text-white/35 mt-2" style={{ fontFamily: 'var(--font-mono)' }}>
            Descente orbitale
          </p>
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
      className="absolute inset-0 bg-[#050a10]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.1 }}
    >
      {/* Filtre : transforme les tuiles OSM claires en carte tactique sombre. */}
      <div
        ref={holder}
        className="absolute inset-0 z-0"
        style={{ filter: 'invert(1) hue-rotate(188deg) brightness(0.82) contrast(1.35) saturate(1.5)' }}
      />

      {/* Lignes de scan : ancre la carte dans l'esthétique HUD du reste. */}
      <div
        className="absolute inset-0 z-10 pointer-events-none opacity-[0.12]"
        style={{
          background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,#0ea5e9 2px,#0ea5e9 3px)',
          mixBlendMode: 'overlay',
        }}
      />
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center,transparent 38%,rgba(5,10,16,0.82) 100%)' }}
      />

      <HudFrame />

      <AnimatePresence>
        {ready && (
          <>
            <motion.div
              className="absolute top-0 left-0 right-0 z-30 px-6 pt-safe pointer-events-none"
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-start justify-between mt-4">
                <div>
                  <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-alert" style={{ fontFamily: 'var(--font-mono)' }}>
                    Cible verrouillée
                  </span>
                  <h1
                    className="text-white text-[34px] leading-none font-bold uppercase mt-1"
                    style={{ fontFamily: 'var(--font-display)', textShadow: '0 0 22px rgba(14,165,233,0.45)' }}
                  >
                    {name}
                  </h1>
                  <p className="text-stark/70 text-xs tracking-[0.2em] uppercase mt-1.5" style={{ fontFamily: 'var(--font-mono)' }}>
                    {venue}
                  </p>
                </div>
                <div className="text-right mt-1">
                  <Telemetry lat={lat} lng={lng} progress={1} />
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute bottom-0 left-0 right-0 z-30 px-5 pb-safe"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="glass-nexus rounded-3xl p-4 mb-3 relative overflow-hidden">
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-stark to-transparent opacity-60" />
                <motion.button
                  onClick={() => {
                    haptic(HAPTIC.impact);
                    openNavigation(lat, lng);
                  }}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-black text-[13px] uppercase tracking-[0.18em]"
                  style={{ background: '#0ea5e9', boxShadow: '0 0 26px rgba(14,165,233,0.38)', fontFamily: 'var(--font-mono)' }}
                  whileTap={{ scale: 0.975 }}
                >
                  <Navigation size={17} />
                  Lancer l'itinéraire
                </motion.button>
              </div>

              <button
                onClick={() => {
                  playWhoosh();
                  haptic(HAPTIC.soft);
                  onSwitch();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 text-[11px] uppercase tracking-[0.22em] text-white/45 active:text-white transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <Sparkles size={13} />
                Explorer l'autre univers
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function UniverseMap({ onSwitch, onBack }) {
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

      {/* Retour au hub : discret, toujours disponible. */}
      <button
        onClick={() => {
          playWhoosh();
          onBack();
        }}
        className="absolute z-40 left-4 bottom-[calc(var(--safe-b)+1rem)] w-10 h-10 rounded-full glass-nexus flex items-center justify-center text-white/60 active:text-white"
        aria-label="Retour au nexus"
      >
        <ArrowLeft size={17} />
      </button>
    </div>
  );
}

