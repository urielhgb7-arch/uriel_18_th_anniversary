import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Navigation, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import content from '../../content.json';

// OSRM public server - 100% gratuit, pas de clé API
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Fetches the real road route from OSRM and returns
 * decoded GeoJSON coordinates + step-by-step instructions.
 */
async function fetchOSRMRoute(from, to) {
  const url = `${OSRM_URL}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true&annotations=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('OSRM network error');
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route found');
  const route = data.routes[0];
  return {
    coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: route.distance, // meters
    duration: route.duration, // seconds
    steps: route.legs[0].steps.map(s => ({
      instruction: s.maneuver.instruction || buildInstruction(s),
      distance: s.distance,
      name: s.name,
      type: s.maneuver.type,
      modifier: s.maneuver.modifier,
    })),
  };
}

function buildInstruction(step) {
  const type = step.maneuver.type;
  const mod = step.maneuver.modifier || '';
  const road = step.name ? ` sur ${step.name}` : '';
  const dist = step.distance > 0 ? ` (${formatDist(step.distance)})` : '';
  const map = {
    'turn left': `Tournez à gauche${road}`,
    'turn right': `Tournez à droite${road}`,
    'turn slight left': `Légèrement à gauche${road}`,
    'turn slight right': `Légèrement à droite${road}`,
    'turn sharp left': `Virage serré à gauche${road}`,
    'turn sharp right': `Virage serré à droite${road}`,
    'straight': `Continuez tout droit${road}`,
    'roundabout': `Prenez le rond-point${road}`,
    'arrive': `Vous êtes arrivé${road} 🎉`,
    'depart': `Partez${road}`,
    'merge': `Insérez-vous${road}`,
    'fork left': `Prenez à gauche à la bifurcation${road}`,
    'fork right': `Prenez à droite à la bifurcation${road}`,
    'end of road left': `Tournez à gauche en fin de route${road}`,
    'end of road right': `Tournez à droite en fin de route${road}`,
  };
  const key = mod ? `${type} ${mod}` : type;
  return (map[key] || map[type] || `${type} ${mod}${road}`) + dist;
}

function formatDist(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}
function formatDuration(secs) {
  const m = Math.round(secs / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}

// ── Step Card ─────────────────────────────────────────────────────────────────
function StepCard({ steps, distance, duration }) {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="absolute bottom-24 left-4 right-4 z-30">
      {/* Summary pill */}
      <motion.button
        className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl mb-2"
        style={{
          background: 'rgba(10,8,28,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,215,0,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
        onClick={() => setOpen(o => !o)}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3">
          <Navigation size={18} className="text-yellow-400" />
          <div className="text-left">
            <p className="text-white text-sm font-semibold">{formatDist(distance)}</p>
            <p className="text-white/50 text-[11px]">~{formatDuration(duration)} de trajet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-[11px]">{steps.length} étapes</span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.div>
        </div>
      </motion.button>

      {/* Steps list */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(8,5,20,0.92)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              maxHeight: '45vh',
              overflowY: 'auto',
            }}
            initial={{ opacity: 0, height: 0, y: 10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {steps.map((step, i) => (
              <motion.button
                key={i}
                className="w-full text-left px-4 py-3 flex items-start gap-3 border-b border-white/5 last:border-0"
                style={{ background: i === activeStep ? 'rgba(255,215,0,0.06)' : 'transparent' }}
                onClick={() => setActiveStep(i)}
                whileTap={{ scale: 0.99 }}
              >
                {/* Step number */}
                <div
                  className="mt-0.5 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: i === activeStep ? '#ffd700' : 'rgba(255,255,255,0.1)',
                    color: i === activeStep ? '#000' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[13px] leading-snug"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {buildInstruction(step.raw || step)}
                  </p>
                  {step.distance > 0 && (
                    <p className="text-white/35 text-[11px] mt-0.5">{formatDist(step.distance)}</p>
                  )}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function MapItinerary({ onSwitchToConstellation }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const routeLayerRef = useRef(null);
  const [gpsStatus, setGpsStatus] = useState('loading');
  const [routeData, setRouteData] = useState(null);
  const [error, setError] = useState(null);

  // Real venue coordinates
  const dest = content.event.location;
  const destination = [dest.lat, dest.lng];

  useEffect(() => {
    // Init dark Leaflet map
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(destination, 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(mapInstance.current);

      // Destination marker (gold pulse)
      const vipIcon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(255,215,0,0.25);animation:pulse 2s ease infinite;"></div>
            <div style="width:16px;height:16px;border-radius:50%;background:#ffd700;border:2.5px solid white;box-shadow:0 0 16px rgba(255,215,0,0.8);position:relative;z-index:1;"></div>
          </div>
          <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.8);opacity:.1}}</style>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker(destination, { icon: vipIcon }).addTo(mapInstance.current);
    }

    // Geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const userCoords = [pos.coords.latitude, pos.coords.longitude];
          setGpsStatus('located');

          // User position marker (purple)
          const userIcon = L.divIcon({
            className: '',
            html: `<div style="width:14px;height:14px;border-radius:50%;background:#7c3aed;border:2.5px solid white;box-shadow:0 0 12px rgba(124,58,237,0.8);"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });
          L.marker(userCoords, { icon: userIcon }).addTo(mapInstance.current);

          // Fit bounds while OSRM loads
          const bounds = L.latLngBounds([userCoords, destination]);
          mapInstance.current.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 1.5 });

          try {
            // Fetch real road route via OSRM (shortest path like Google Maps)
            const route = await fetchOSRMRoute(userCoords, destination);

            // Draw the route polyline
            if (routeLayerRef.current) {
              mapInstance.current.removeLayer(routeLayerRef.current);
            }
            routeLayerRef.current = L.polyline(route.coords, {
              color: '#ffd700',
              weight: 4,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(mapInstance.current);

            // Also draw a subtle glow duplicate
            L.polyline(route.coords, {
              color: '#ffd700',
              weight: 10,
              opacity: 0.18,
              lineCap: 'round',
            }).addTo(mapInstance.current);

            mapInstance.current.fitBounds(routeLayerRef.current.getBounds(), {
              padding: [70, 70],
              animate: true,
              duration: 1.5,
            });

            setRouteData(route);
          } catch (e) {
            console.error('OSRM error:', e);
            // Fallback: draw a straight line
            L.polyline([userCoords, destination], {
              color: '#10b981',
              weight: 3,
              dashArray: '10, 15',
              opacity: 0.8,
            }).addTo(mapInstance.current);
            setError('Impossible de charger l\'itinéraire routier. Ligne directe affichée.');
          }
        },
        (err) => {
          console.error('GPS denied', err);
          setGpsStatus('error');
          setError('Localisation refusée. Voici le lieu de l\'événement.');
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } else {
      setGpsStatus('error');
      setError('Géolocalisation non supportée sur cet appareil.');
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#050714' }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Syne:wght@700&display=swap" rel="stylesheet" />

      {/* Map container */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <div
          ref={mapRef}
          className="absolute inset-0"
          style={{ filter: 'contrast(1.05) brightness(0.95)' }}
        />

        {/* Top vignette */}
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ background: 'linear-gradient(180deg, rgba(5,7,20,0.85) 0%, transparent 25%, transparent 70%, rgba(5,7,20,0.92) 100%)' }} />

        {/* ── HUD Top ── */}
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Navigation
                size={16}
                className={gpsStatus === 'located' ? 'text-yellow-400' : 'text-yellow-400/50 animate-pulse'}
              />
              <span className="text-yellow-400/60 text-[10px] tracking-[0.25em] uppercase font-medium"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {gpsStatus === 'loading' ? 'Localisation en cours...' : gpsStatus === 'located' ? 'Itinéraire calculé' : 'GPS indisponible'}
              </span>
            </div>
            <h2 className="text-white text-2xl font-black" style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.03em' }}>
              {content.event.location.name}
            </h2>
            {routeData && (
              <motion.div
                className="flex items-center gap-3 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <span className="text-emerald-400 text-sm font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {formatDist(routeData.distance)}
                </span>
                <span className="text-white/30">·</span>
                <span className="text-white/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  ~{formatDuration(routeData.duration)}
                </span>
              </motion.div>
            )}
            {error && (
              <motion.div
                className="flex items-center gap-2 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <AlertCircle size={14} className="text-orange-400" />
                <p className="text-orange-400/80 text-[11px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* ── Step-by-step cards ── */}
        {routeData && (
          <StepCard
            steps={routeData.steps}
            distance={routeData.distance}
            duration={routeData.duration}
          />
        )}

        {/* ── Confirm presence CTA ── */}
        <div className="absolute bottom-6 left-4 right-4 z-30 flex gap-3">
          <a
            href={`https://wa.me/${content.whatsapp.number}?text=${encodeURIComponent(content.whatsapp.message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-black text-sm"
            style={{
              background: 'linear-gradient(135deg, #ffd700 0%, #f0a500 100%)',
              boxShadow: '0 0 30px rgba(255,215,0,0.3)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Confirmer ma présence
          </a>
          <button
            onClick={onSwitchToConstellation}
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <Sparkles size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
