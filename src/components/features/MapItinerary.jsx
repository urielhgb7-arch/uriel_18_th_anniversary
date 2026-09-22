import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import { GlassCard } from '../ui/GlassCard';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DESTINATION = [48.8566, 2.3522]; // Paris placeholder

function RoutingMachine({ startCoords }) {
  const map = useMap();

  useEffect(() => {
    if (!startCoords || !map) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(startCoords[0], startCoords[1]),
        L.latLng(DESTINATION[0], DESTINATION[1])
      ],
      routeWhileDragging: false,
      lineOptions: {
        styles: [{ color: '#00ff88', weight: 4, opacity: 0.8 }]
      },
      createMarker: function(i, wp, nWps) {
        if (i === 0 || i === nWps - 1) {
          return L.marker(wp.latLng);
        }
        return null;
      },
      show: false
    }).addTo(map);

    return () => map.removeControl(routingControl);
  }, [map, startCoords]);

  return null;
}

export function MapItinerary() {
  const [userLocation, setUserLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (err) => {
          console.error(err);
          setError("Position introuvable. Itinéraire désactivé.");
          setUserLocation([48.86, 2.34]); 
        }
      );
    } else {
      setError("Géolocalisation non supportée.");
      setUserLocation([48.86, 2.34]);
    }
  }, []);

  if (!userLocation) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative flex flex-col p-4 md:p-8 pt-10 pb-20 overflow-hidden">
      
      <div className="absolute inset-0 z-0 opacity-50 grayscale sepia hue-rotate-[130deg] saturate-[2]">
        <MapContainer 
          center={DESTINATION} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <RoutingMachine startCoords={userLocation} />
        </MapContainer>
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto mt-auto">
        <GlassCard className="p-6 md:p-8 backdrop-blur-2xl bg-black/60">
          <h2 className="text-2xl font-bold mb-6 text-white text-center">Event Details</h2>
          <div className="space-y-6">
            <div className="flex justify-between items-end border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-emerald-green font-semibold mb-1">Date</p>
                <p className="text-lg text-white font-medium">Samedi 24 Octobre</p>
              </div>
              <p className="text-lg text-white font-mono">20:00</p>
            </div>
            
            <div className="border-b border-white/10 pb-4">
              <p className="text-xs uppercase tracking-widest text-emerald-green font-semibold mb-1">Lieu</p>
              <p className="text-lg text-white font-medium">Lieu Secret (Voir carte)</p>
            </div>
            
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-green font-semibold mb-1">Dress Code</p>
              <p className="text-lg text-white font-medium">Élégant & Sombre</p>
            </div>
          </div>
        </GlassCard>

        {error && (
          <div className="mt-4 bg-red-500/20 border border-red-500 text-white px-4 py-2 rounded-full text-sm text-center backdrop-blur-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
