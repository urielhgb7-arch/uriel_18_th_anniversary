import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Navigation, MapPin, Sparkles } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import content from '../../content.json';

/**
 * Opens navigation to destination as directly as the platform allows.
 * Android  → google.navigation: scheme → Maps opens in full nav mode (1 tap Start)
 * iPhone   → comgooglemaps:// or Apple Maps → same result
 * Desktop  → web URL fallback
 */
function openNavigation(lat, lng) {
  const ua = navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);

  if (isAndroid) {
    // Native Android intent: opens Google Maps directly in navigation mode
    window.location.href = `google.navigation:q=${lat},${lng}&mode=d`;
    // Fallback after 1.5s if the app isn't installed
    setTimeout(() => {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
    }, 1500);
  } else if (isIOS) {
    // Try Google Maps app first
    const gm = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
    const fallback = `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
    // Hidden iframe trick to try deep link without leaving page
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = gm;
    document.body.appendChild(iframe);
    setTimeout(() => {
      document.body.removeChild(iframe);
      window.location.href = fallback;
    }, 1200);
  } else {
    // Desktop fallback
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
  }
}

export default function MapItinerary({ onSwitchToConstellation }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const { lat, lng, name } = content.event.location;
  const destination = [lat, lng];

  useEffect(() => {
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
      }).setView(destination, 15);

      // Dark premium tile layer (CartoDB Dark Matter)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(mapInstance.current);

      // Gold pulsing destination marker
      const vipIcon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
            <div style="
              position:absolute;inset:0;border-radius:50%;
              background:rgba(255,215,0,0.3);
              animation:vip-pulse 2s ease-in-out infinite;
            "></div>
            <div style="
              position:absolute;inset:8px;border-radius:50%;
              background:rgba(255,215,0,0.15);
              animation:vip-pulse 2s ease-in-out infinite 0.5s;
            "></div>
            <div style="
              width:20px;height:20px;border-radius:50%;
              background:#ffd700;
              border:3px solid white;
              box-shadow:0 0 20px rgba(255,215,0,0.9), 0 0 40px rgba(255,215,0,0.4);
              position:relative;z-index:1;
            "></div>
          </div>
          <style>
            @keyframes vip-pulse {
              0%,100%{transform:scale(1);opacity:.7}
              50%{transform:scale(1.6);opacity:.1}
            }
          </style>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });
      L.marker(destination, { icon: vipIcon }).addTo(mapInstance.current);
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
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* ── Map (static, decorative) ── */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <div
          ref={mapRef}
          className="absolute inset-0"
          style={{ filter: 'contrast(1.1) brightness(0.9)' }}
        />

        {/* Vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: `
              linear-gradient(180deg, rgba(5,7,20,0.90) 0%, transparent 30%),
              linear-gradient(0deg, rgba(5,7,20,0.98) 0%, transparent 40%)
            `,
          }}
        />

        {/* ── HUD Top ── */}
        <div className="absolute top-0 left-0 right-0 z-20 px-5 pt-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={14} className="text-yellow-400" />
              <span
                className="text-yellow-400/60 text-[10px] tracking-[0.3em] uppercase"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Lieu de l'événement
              </span>
            </div>

            {/* Location name */}
            <h1
              className="text-white text-3xl font-black mb-1"
              style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.03em' }}
            >
              {name}
            </h1>
            <p
              className="text-white/40 text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {content.event.date ? new Date(content.event.date).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              }) : ''}
            </p>
          </motion.div>
        </div>

        {/* ── Bottom CTA Panel ── */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Card */}
          <div
            className="rounded-3xl p-5 mb-4"
            style={{
              background: 'rgba(8,5,22,0.88)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255,215,0,0.18)',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.5), 0 0 60px rgba(100,60,200,0.08)',
            }}
          >
            {/* Top accent */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent rounded-full" />

            <p
              className="text-white/50 text-[13px] mb-4 leading-relaxed text-center"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Clique sur le bouton ci-dessous pour ouvrir<br />
              la navigation directement dans Google Maps.
            </p>

            {/* Navigate CTA */}
            <motion.button
              onClick={() => openNavigation(lat, lng)}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-black text-base mb-3"
              style={{
                background: 'linear-gradient(135deg, #ffd700 0%, #f0a500 100%)',
                boxShadow: '0 0 40px rgba(255,215,0,0.35), 0 8px 24px rgba(0,0,0,0.3)',
                fontFamily: "'DM Sans', sans-serif",
              }}
              whileHover={{ scale: 1.02, boxShadow: '0 0 60px rgba(255,215,0,0.5)' }}
              whileTap={{ scale: 0.97 }}
            >
              <Navigation size={18} />
              Naviguer vers le lieu
            </motion.button>

            {/* Confirm presence */}
            <motion.a
              href={`https://wa.me/${content.whatsapp.number}?text=${encodeURIComponent(content.whatsapp.message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-medium text-white/80 text-sm"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                fontFamily: "'DM Sans', sans-serif",
              }}
              whileHover={{ background: 'rgba(255,255,255,0.09)' }}
              whileTap={{ scale: 0.98 }}
            >
              <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="20" fill="#25D366" />
                <path d="M28.7 11.3A11.9 11.9 0 0 0 20 8C13.4 8 8 13.4 8 20c0 2.1.5 4.1 1.5 5.9L8 32l6.3-1.6c1.7.9 3.7 1.4 5.7 1.4 6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.3-8.5z" fill="white" />
              </svg>
              Confirmer ma présence
            </motion.a>
          </div>

          {/* Switch to constellation */}
          <button
            onClick={onSwitchToConstellation}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-white/30 text-[12px]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <Sparkles size={13} />
            Découvrir l'expérience
          </button>
        </motion.div>
      </div>
    </div>
  );
}
