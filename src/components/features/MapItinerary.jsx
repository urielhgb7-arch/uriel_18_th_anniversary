import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, MapPin, Sparkles, Target } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import content from '../../content.json';

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

const ZOOM_SEQUENCE = [
  { lat: 8.0, lng: 2.0, zoom: 3, duration: 0 },
  { lat: 7.0, lng: 2.3, zoom: 6, duration: 2000 },
  { lat: 6.5, lng: 2.33, zoom: 11, duration: 2000 },
  { lat: 6.3492895978751855, lng: 2.3320373663562055, zoom: 17, duration: 2500 },
];

export default function MapItinerary({ onSwitchToConstellation }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [zoomStage, setZoomStage] = useState(0);
  const [showUI, setShowUI] = useState(false);
  const [coords, setCoords] = useState("00.0000° N, 00.0000° E");

  const { lat, lng, name } = content.event.location;

  useEffect(() => {
    if (mapInstance.current) return;

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

    // Standard OSM but filtered in CSS to look like a dark tactical map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    let step = 1;
    const runStep = () => {
      if (step >= ZOOM_SEQUENCE.length) {
        addDestinationMarker();
        setZoomStage(1);
        setTimeout(() => setShowUI(true), 800);
        return;
      }
      const s = ZOOM_SEQUENCE[step];
      
      // Update fake coords display
      setCoords(`${(s.lat + Math.random()).toFixed(4)}° N, ${(s.lng + Math.random()).toFixed(4)}° E`);

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
            setCoords(`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
            addDestinationMarker();
            setZoomStage(1);
            setTimeout(() => setShowUI(true), 800);
          }, s.duration + 400);
        }
      }, step === 1 ? 800 : 0);
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
    const hudIcon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:60px;height:60px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:0;border:1px solid #0EA5E9;border-radius:50%;animation:hud-pulse 2s ease-out infinite;"></div>
          <div style="position:absolute;inset:15px;border:2px dashed #EF4444;border-radius:50%;animation:spin 4s linear infinite;"></div>
          <div style="width:6px;height:6px;background:#EF4444;border-radius:50%;box-shadow:0 0 10px #EF4444;"></div>
        </div>
        <style>
          @keyframes hud-pulse{0%{transform:scale(0.5);opacity:1}100%{transform:scale(1.5);opacity:0}}
          @keyframes spin{100%{transform:rotate(360deg)}}
        </style>
      `,
      iconSize: [60, 60],
      iconAnchor: [30, 30],
    });
    L.marker([lat, lng], { icon: hudIcon }).addTo(mapInstance.current);
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#050A10]">
      {/* ── Map with heavy dark mode CSS filters ── */}
      <div
        ref={mapRef}
        className="absolute inset-0 z-0"
        style={{ filter: 'invert(100%) hue-rotate(180deg) brightness(80%) contrast(150%) sepia(30%) saturate(150%)' }}
      />
      
      {/* Scan lines overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-20"
           style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #0EA5E9 2px, #0EA5E9 4px)', mixBlendMode: 'overlay' }} />

      {/* ── Cinematic overlay during zoom (Target Acquisition) ── */}
      <AnimatePresence>
        {zoomStage === 0 && (
          <motion.div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none"
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(5,10,16,0.9) 100%)' }} />
            
            {/* Center HUD Reticle */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                          className="absolute inset-0 border-t-2 border-b-2 border-[#0EA5E9] rounded-full opacity-50" />
              <motion.div animate={{ rotate: -360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                          className="absolute inset-4 border-l-2 border-r-2 border-[#EF4444] rounded-full opacity-50" />
              <Target size={40} className="text-[#0EA5E9]" />
            </div>

            <div className="absolute bottom-32 text-center font-mono text-[#0EA5E9]">
              <p className="text-xs tracking-[0.4em] mb-2 animate-pulse">RECHERCHE DE CIBLE...</p>
              <p className="text-lg tracking-widest">{coords}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUI && (
          <>
            {/* ── HUD Top ── */}
            <motion.div
              className="absolute top-0 left-0 right-0 z-20 px-6 pt-14 pointer-events-none"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={14} className="text-[#EF4444]" />
                    <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#EF4444] font-mono">
                      Cible Verrouillée
                    </span>
                  </div>
                  <h1 className="text-3xl font-black text-white font-syne uppercase tracking-tighter" style={{ textShadow: '0 0 10px rgba(14,165,233,0.5)' }}>
                    {name}
                  </h1>
                </div>
                <div className="text-right font-mono text-xs text-[#0EA5E9] opacity-70 mt-2">
                  <p>LAT: {lat.toFixed(5)}</p>
                  <p>LNG: {lng.toFixed(5)}</p>
                </div>
              </div>
            </motion.div>

            {/* ── Bottom CTA Panel (Stark/Wakanda style) ── */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className="rounded-3xl p-5 mb-4 relative overflow-hidden"
                style={{
                  background: 'rgba(5,10,16,0.85)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(14,165,233,0.3)',
                  boxShadow: '0 0 30px rgba(14,165,233,0.1)',
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#0EA5E9] to-transparent opacity-50" />

                <motion.button
                  onClick={() => openNavigation(lat, lng)}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-black text-sm relative overflow-hidden group uppercase tracking-widest font-mono"
                  style={{
                    background: '#0EA5E9',
                    boxShadow: '0 0 20px rgba(14,165,233,0.4)',
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Navigation size={18} />
                  <span>Activer la Navigation</span>
                </motion.button>
              </div>

              <button
                onClick={onSwitchToConstellation}
                className="w-full flex items-center justify-center gap-2 py-3 text-[11px] uppercase tracking-widest text-white/50 hover:text-white transition-colors font-mono"
              >
                <Sparkles size={14} />
                Accéder au Multivers
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
