import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, MapPin, Sparkles, ChevronDown } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import content from '../../content.json';

/** Platform-aware deep-link navigation */
function openNavigation(lat, lng) {
  const ua = navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);

  if (isAndroid) {
    window.location.href = `google.navigation:q=${lat},${lng}&mode=d`;
    setTimeout(() => {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
    }, 1500);
  } else if (isIOS) {
    const gm = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
    const fallback = `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = gm;
    document.body.appendChild(iframe);
    setTimeout(() => {
      document.body.removeChild(iframe);
      window.location.href = fallback;
    }, 1200);
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
  }
}

// ── Cinematic zoom sequence ────────────────────────────────────────────────────
// Africa overview → West Africa → Cotonou city → venue
const ZOOM_SEQUENCE = [
  { lat: 8.0, lng: 2.0, zoom: 3, duration: 0 },       // Africa overview
  { lat: 7.0, lng: 2.3, zoom: 6, duration: 2000 },     // West Africa
  { lat: 6.5, lng: 2.33, zoom: 11, duration: 2500 },   // Cotonou region
  { lat: 6.3492895978751855, lng: 2.3320373663562055, zoom: 16, duration: 2000 }, // Venue
];

export default function MapItinerary({ onSwitchToConstellation }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [zoomStage, setZoomStage] = useState(0); // 0=flying, 1=arrived
  const [showUI, setShowUI] = useState(false);

  const { lat, lng, name } = content.event.location;

  useEffect(() => {
    if (mapInstance.current) return;

    // ── Init map at Africa overview ──
    mapInstance.current = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
      zoomAnimation: true,
      fadeAnimation: true,
    }).setView([ZOOM_SEQUENCE[0].lat, ZOOM_SEQUENCE[0].lng], ZOOM_SEQUENCE[0].zoom);

    // ── Premium tile layer: CartoDB Voyager — 100% free, no API key ──
    // Warm beige/cream tones, clean roads, elegant typography on map
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '',
    }).addTo(mapInstance.current);

    // ── Animate zoom sequence ──
    let step = 1;
    const runStep = () => {
      if (step >= ZOOM_SEQUENCE.length) {
        // Done — show marker + UI
        addDestinationMarker();
        setZoomStage(1);
        setTimeout(() => setShowUI(true), 600);
        return;
      }
      const s = ZOOM_SEQUENCE[step];
      setTimeout(() => {
        mapInstance.current?.flyTo([s.lat, s.lng], s.zoom, {
          animate: true,
          duration: s.duration / 1000,
          easeLinearity: 0.25,
        });
        step++;
        const next = ZOOM_SEQUENCE[step];
        if (next) {
          setTimeout(runStep, s.duration + 400);
        } else {
          setTimeout(() => {
            addDestinationMarker();
            setZoomStage(1);
            setTimeout(() => setShowUI(true), 600);
          }, s.duration + 400);
        }
      }, step === 1 ? 600 : 0);
    };
    runStep();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  function addDestinationMarker() {
    if (!mapInstance.current) return;
    const vipIcon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:56px;height:56px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(255,215,0,0.25);animation:vip-pulse 2.2s ease-in-out infinite;"></div>
          <div style="position:absolute;inset:10px;border-radius:50%;background:rgba(255,215,0,0.15);animation:vip-pulse 2.2s ease-in-out infinite 0.6s;"></div>
          <div style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#ffd700,#f0a500);border:3px solid white;box-shadow:0 0 24px rgba(255,215,0,0.9),0 4px 16px rgba(0,0,0,0.3);position:relative;z-index:1;"></div>
        </div>
        <style>
          @keyframes vip-pulse{0%,100%{transform:scale(1);opacity:.65}50%{transform:scale(1.7);opacity:.08}}
        </style>
      `,
      iconSize: [56, 56],
      iconAnchor: [28, 28],
    });
    L.marker([lat, lng], { icon: vipIcon }).addTo(mapInstance.current);
  }

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: '#f5f3ee' }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* ── Map fills screen ── */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* ── Cinematic overlay during zoom ── */}
      <AnimatePresence>
        {zoomStage === 0 && (
          <motion.div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Vignette to focus on center */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at center, transparent 35%, rgba(20,15,40,0.65) 100%)',
              }}
            />
            {/* Cinematic bars */}
            <div className="absolute top-0 left-0 right-0 h-16"
              style={{ background: 'rgba(12,8,28,0.85)', backdropFilter: 'blur(8px)' }} />
            <div className="absolute bottom-0 left-0 right-0 h-16"
              style={{ background: 'rgba(12,8,28,0.85)', backdropFilter: 'blur(8px)' }} />
            {/* Scan line */}
            <motion.div
              className="absolute left-0 right-0 h-px z-40"
              style={{ background: 'rgba(255,215,0,0.6)', boxShadow: '0 0 12px 2px rgba(255,215,0,0.4)' }}
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            />
            {/* Label */}
            <div className="relative z-10 text-center">
              <motion.p
                className="text-yellow-400/80 text-[11px] tracking-[0.35em] uppercase font-medium mb-2"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Localisation en cours...
              </motion.p>
              <motion.div
                className="flex items-center justify-center gap-1.5"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              >
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-yellow-400"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top gradient vignette (after landing) ── */}
      <AnimatePresence>
        {showUI && (
          <>
            {/* Top gradient */}
            <motion.div
              className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
              style={{
                height: '220px',
                background: 'linear-gradient(180deg, rgba(250,248,243,0.97) 0%, rgba(250,248,243,0.7) 60%, transparent 100%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            />

            {/* ── HUD Top ── */}
            <motion.div
              className="absolute top-0 left-0 right-0 z-20 px-5 pt-12"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={14} style={{ color: '#c9a227' }} />
                <span
                  className="text-[10px] tracking-[0.3em] uppercase font-semibold"
                  style={{ color: '#c9a227', fontFamily: "'DM Sans', sans-serif" }}
                >
                  Lieu de l'événement
                </span>
              </div>
              <h1
                className="text-3xl font-black mb-0.5"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  letterSpacing: '-0.03em',
                  color: '#1a1520',
                }}
              >
                {name}
              </h1>
              {content.event.date && (
                <p
                  className="text-sm"
                  style={{ color: 'rgba(30,20,50,0.5)', fontFamily: "'DM Sans', sans-serif" }}
                >
                  {new Date(content.event.date).toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              )}
            </motion.div>

            {/* Bottom gradient */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
              style={{
                height: '300px',
                background: 'linear-gradient(0deg, rgba(250,248,243,0.98) 0%, rgba(250,248,243,0.75) 55%, transparent 100%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            />

            {/* ── Bottom CTA Panel ── */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-10"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Card */}
              <div
                className="rounded-3xl p-5 mb-4 relative overflow-hidden"
                style={{
                  background: 'rgba(255,252,245,0.92)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(201,162,39,0.2)',
                  boxShadow: '0 -8px 40px rgba(0,0,0,0.08), 0 20px 60px rgba(0,0,0,0.04)',
                }}
              >
                {/* Top gold line */}
                <div
                  className="absolute top-0 left-8 right-8 h-px rounded-full"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.6), transparent)' }}
                />

                <p
                  className="text-center text-sm mb-4"
                  style={{ color: 'rgba(30,20,50,0.55)', fontFamily: "'DM Sans', sans-serif" }}
                >
                  Appuie pour ouvrir la navigation directement
                </p>

                {/* Navigate CTA */}
                <motion.button
                  onClick={() => openNavigation(lat, lng)}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-black text-base relative overflow-hidden group"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700 0%, #f0a500 100%)',
                    boxShadow: '0 4px 24px rgba(255,215,0,0.45), 0 2px 8px rgba(0,0,0,0.15)',
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: '600',
                  }}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 40px rgba(255,215,0,0.6)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  {/* Shimmer sweep */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100"
                    style={{
                      background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)',
                      backgroundSize: '200% 100%',
                    }}
                    animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                  <Navigation size={18} className="relative z-10" />
                  <span className="relative z-10">Naviguer vers le lieu</span>
                </motion.button>

                {/* Bottom gold line */}
                <div
                  className="absolute bottom-0 left-8 right-8 h-px rounded-full"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.3), transparent)' }}
                />
              </div>

              {/* Switch to experience */}
              <button
                onClick={onSwitchToConstellation}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px]"
                style={{ color: 'rgba(30,20,50,0.35)', fontFamily: "'DM Sans', sans-serif" }}
              >
                <Sparkles size={13} />
                Découvrir l'expérience
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
