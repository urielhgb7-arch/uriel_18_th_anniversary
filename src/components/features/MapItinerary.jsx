import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import content from '../../content.json';

export default function MapItinerary({ onSwitchToConstellation }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [gpsStatus, setGpsStatus] = useState('loading'); // loading, located, error
  const [stepMsg, setStepMsg] = useState(content.gpsSteps[0]);
  const [userLoc, setUserLoc] = useState(null);

  const dest = content.event.location;
  const destination = [dest.lat, dest.lng];

  useEffect(() => {
    // 1. Initialiser la carte Leaflet (Thème Dark Premium sans clé API)
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(destination, 13);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstance.current);

      // Marqueur Destination VIP (Or)
      const vipIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #ffd700; width: 20px; height: 20px; border-radius: 50%; box-shadow: 0 0 20px #ffd700; border: 2px solid white;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      L.marker(destination, { icon: vipIcon }).addTo(mapInstance.current);
    }

    // 2. Tenter de récupérer la position de l'utilisateur
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userCoords = [pos.coords.latitude, pos.coords.longitude];
          setUserLoc(userCoords);
          setGpsStatus('located');
          setStepMsg(content.gpsSteps[1]);
          
          // Ajouter le marqueur Utilisateur
          const userIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #4a00e0; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #4a00e0;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          L.marker(userCoords, { icon: userIcon }).addTo(mapInstance.current);

          // Ajuster la vue pour voir les deux points
          const bounds = L.latLngBounds([userCoords, destination]);
          mapInstance.current.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 2 });

          // Tracer une ligne directe (style "vol") entre l'utilisateur et la destination
          setTimeout(() => {
            const line = L.polyline([userCoords, destination], {
              color: '#10b981', // Emerald
              weight: 3,
              dashArray: '10, 15',
              opacity: 0.8
            }).addTo(mapInstance.current);
            setStepMsg(content.gpsSteps[2]);
          }, 2000);

        },
        (error) => {
          console.error("GPS refusé ou erreur", error);
          setGpsStatus('error');
          setStepMsg("Localisation refusée. Voici le lieu secret.");
        }
      );
    } else {
      setGpsStatus('error');
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0a0f1c] flex flex-col">
      {/* Container de la carte */}
      <div className="relative flex-1 w-full h-full">
        {/* CSS pour colorer les tuiles avec un effet plus "Navy" */}
        <div 
          ref={mapRef} 
          className="absolute inset-0" 
          style={{ filter: 'hue-rotate(220deg) saturate(1.5) contrast(1.1)' }}
        />
        
        {/* Overlay Noir partiel pour l'interface */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0a0f1c] via-transparent to-[#0a0f1c]" />

        {/* HUD (Heads Up Display) Texte GPS */}
        <div className="absolute top-12 w-full px-6 z-20 pointer-events-none">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <Navigation size={18} className={gpsStatus === 'loading' ? 'text-yellow-500 animate-pulse' : 'text-emerald-500'} />
              <h3 className="text-white text-sm font-semibold tracking-wider">GUIDAGE VIP</h3>
            </div>
            <p className="text-white/70 text-xs">{stepMsg}</p>
          </div>
        </div>

        {/* Bouton WhatsApp CTA persistant */}
        <div className="absolute bottom-24 w-full px-6 z-20 flex justify-center">
          <a
            href={`https://wa.me/${content.whatsapp.number}?text=${encodeURIComponent(content.whatsapp.message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-sm bg-emerald-500 text-white text-center py-4 rounded-xl font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] transition-transform"
          >
            Confirmer ma présence
          </a>
        </div>

        {/* Bouton Flottant pour aller à la constellation */}
        <button 
          onClick={onSwitchToConstellation}
          className="absolute bottom-6 right-6 w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-white z-20 shadow-lg pointer-events-auto"
        >
          <Sparkles size={20} />
        </button>
      </div>
    </div>
  );
}
