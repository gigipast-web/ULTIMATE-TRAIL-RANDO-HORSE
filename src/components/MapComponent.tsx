import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { RouteData, Runner, Checkpoint } from '../types';
import { Layers } from 'lucide-react';

interface MapComponentProps {
  route: RouteData;
  runners: Runner[];
  selectedRunnerId: string | null;
  onSelectRunner: (runnerId: string | null) => void;
  userPosition: [number, number] | null;
  userSharing: boolean;
  userRunnerInfo: { name: string; bib: string } | null;
  lang?: 'fr' | 'en';
}

export default function MapComponent({
  route,
  runners,
  selectedRunnerId,
  onSelectRunner,
  userPosition,
  userSharing,
  userRunnerInfo,
  lang = 'fr'
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const runnerMarkersRef = useRef<Record<string, L.Marker>>({});
  const checkpointMarkersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [mapStyle, setMapStyle] = useState<'streets' | 'topo' | 'satellite'>('topo');
  const isFr = lang === 'fr';

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create the map and add tiles
    const firstPoint = route.points[0] || [48.05, 6.92];
    const map = L.map(mapContainerRef.current, {
      zoomControl: false, // will place customize zoom control
    }).setView([firstPoint[0], firstPoint[1]], 13);

    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    // Initial tile layer reference
    const initialLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '© OpenTopoMap contributors, SRTM'
    }).addTo(map);

    tileLayerRef.current = initialLayer;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // 1.5 Handle map tiles layer changes (Topographic, Satellite, Streets)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old tile layer
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    let url = '';
    let maxZoom = 19;
    let attribution = '';

    if (mapStyle === 'topo') {
      url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      maxZoom = 17;
      attribution = '© OpenTopoMap contributors, SRTM';
    } else if (mapStyle === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 19;
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri';
    } else {
      // streets
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      maxZoom = 19;
      attribution = '© OpenStreetMap contributors';
    }

    const newLayer = L.tileLayer(url, {
      maxZoom,
      attribution
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [mapStyle]);

  // 2. Handle GPX path layout & Checkpoints drawing
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route) return;

    // Clear old route polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
    }

    // Clear old checkpoints
    checkpointMarkersRef.current.forEach(marker => marker.remove());
    checkpointMarkersRef.current = [];

    if (route.points.length > 0) {
      // Draw new track layer
      const polyline = L.polyline(route.points, {
        color: '#10b981', // Emerald 500
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round',
        dashArray: route.id === 'uploaded' ? 'none' : '2, 6' // dash trail for presets, solid for upload
      }).addTo(map);

      polylineRef.current = polyline;

      // Fit map to trace bounds
      map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

      // Add Checkpoints on map
      route.checkpoints.forEach((cp, idx) => {
        const cpIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              <div class="w-8 h-8 bg-slate-900 border border-emerald-400 rounded-lg flex items-center justify-center shadow-lg transform rotate-45">
                <span class="transform -rotate-45 text-[10px] font-extrabold text-emerald-400">CP${idx+1}</span>
              </div>
              <div class="absolute -top-7 bg-slate-900/90 border border-emerald-400/50 text-[10px] text-emerald-300 font-bold px-1 py-0.5 rounded whitespace-nowrap shadow-md">
                ${cp.name} (${cp.distance} km)
              </div>
            </div>
          `,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker(cp.location, { icon: cpIcon })
          .addTo(map)
          .bindPopup(`<strong class="text-slate-900">Checkpoint ${idx+1}: ${cp.name}</strong><br/>Distance: ${cp.distance} km`);
        
        checkpointMarkersRef.current.push(marker);
      });

      // Draw START flag
      const startPoint = route.points[0];
      const startIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg text-white font-bold text-xs">
              🏁
            </div>
            <div class="absolute -top-6 bg-slate-900 text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow-md">
              DÉPART
            </div>
          </div>
        `,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      const startMarker = L.marker(startPoint, { icon: startIcon }).addTo(map);
      checkpointMarkersRef.current.push(startMarker);

      // Draw END flag
      const endPoint = route.points[route.points.length - 1];
      const endIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 bg-black rounded-full flex items-center justify-center border-2 border-white shadow-lg text-white font-bold text-xs">
              🏆
            </div>
            <div class="absolute -top-6 bg-slate-900 text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow-md overflow-hidden border border-amber-500">
              ARRIVÉE
            </div>
          </div>
        `,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      const endMarker = L.marker(endPoint, { icon: endIcon }).addTo(map);
      checkpointMarkersRef.current.push(endMarker);
    }
  }, [route]);

  // 3. Render Runners current positions dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove obsolete markers
    Object.keys(runnerMarkersRef.current).forEach(id => {
      const runnerExists = runners.some(r => r.id === id);
      if (!runnerExists) {
        runnerMarkersRef.current[id].remove();
        delete runnerMarkersRef.current[id];
      }
    });

    // Update or add current markers
    runners.forEach(runner => {
      // Determine coloring
      let statusColor = 'emerald'; // active
      let textStatusColor = 'text-emerald-400';
      let borderStatusColor = 'border-emerald-500';
      let pingColor = 'bg-emerald-500';
      let statusLabel = '';

      if (runner.status === 'warning') {
        statusColor = 'amber';
        textStatusColor = 'text-amber-400';
        borderStatusColor = 'border-amber-500';
        pingColor = 'bg-amber-400';
        statusLabel = `<span class="bg-amber-500/80 px-1 rounded text-slate-950 font-bold text-[8px] animate-pulse">${runner.statusReason || 'Inactif'}</span>`;
      } else if (runner.status === 'sos') {
        statusColor = 'rose';
        textStatusColor = 'text-rose-400 font-extrabold';
        borderStatusColor = 'border-rose-600 border-2 scale-110';
        pingColor = 'bg-rose-600 animate-ping duration-300';
        statusLabel = `<span class="bg-rose-600 px-1 rounded text-white font-bold text-[8px] animate-bounce">🆘 SOS</span>`;
      } else if (runner.status === 'finished') {
        statusColor = 'sky';
        textStatusColor = 'text-sky-300';
        borderStatusColor = 'border-sky-400';
        pingColor = 'bg-transparent';
        statusLabel = `<span class="bg-slate-900 text-sky-400 px-1 rounded text-[8px] font-bold">FINISH 🏁</span>`;
      }

      const isSelected = selectedRunnerId === runner.id;
      const ringEffect = isSelected ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-900 scale-125 z-[999]' : 'z-50';

      const customIcon = L.divIcon({
        html: `
          <div class="relative flex flex-col items-center justify-center ${ringEffect}">
            ${runner.status !== 'finished' ? `<div class="absolute w-4 h-4 ${pingColor} rounded-full opacity-60 animate-ping"></div>` : ''}
            <div class="relative w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center border-2 ${borderStatusColor} text-white shadow-xl transition-all duration-300">
              <span class="text-xs font-bold ${textStatusColor}">${runner.bibNumber}</span>
            </div>
            <!-- Pop hover text -->
            <div class="absolute -bottom-7 bg-slate-950/95 border border-slate-700/50 text-[10px] text-white px-1.5 py-0.5 rounded whitespace-nowrap shadow-lg flex items-center gap-1 z-50">
              <span class="font-semibold">${runner.name.split(' ')[0]}</span>
              <span class="text-slate-400">| ${runner.speed} km/h</span>
              ${statusLabel}
            </div>
          </div>
        `,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      if (runnerMarkersRef.current[runner.id]) {
        // Position update
        runnerMarkersRef.current[runner.id].setLatLng(runner.currentPos);
        runnerMarkersRef.current[runner.id].setIcon(customIcon);
      } else {
        // Create new marker
        const marker = L.marker(runner.currentPos, { icon: customIcon })
          .addTo(map)
          .on('click', () => {
            onSelectRunner(runner.id);
          });
        
        runnerMarkersRef.current[runner.id] = marker;
      }
    });
  }, [runners, selectedRunnerId]);

  // 4. Handle auto-centering when a user wants to trace a specific runner
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedRunnerId) return;

    const runner = runners.find(r => r.id === selectedRunnerId);
    if (runner) {
      map.panTo(runner.currentPos, { animate: true, duration: 0.8 });
    }
  }, [selectedRunnerId]);

  // 5. Draw real visitor position (User Geolocation Sharing)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userSharing && userPosition) {
      const liveName = userRunnerInfo?.name || 'Vous (Téléphone)';
      const liveBib = userRunnerInfo?.bib || '777';

      const userIcon = L.divIcon({
        html: `
          <div class="relative flex flex-col items-center justify-center z-[1000]">
            <div class="absolute w-6 h-6 bg-blue-500 rounded-full opacity-50 animate-ping"></div>
            <div class="relative w-9 h-9 rounded-full bg-blue-950 flex items-center justify-center border-2 border-blue-400 text-white shadow-2xl scale-110">
              <span class="text-xs font-black text-blue-300">${liveBib}</span>
            </div>
            <div class="absolute -bottom-7 bg-blue-900 border border-blue-400/50 text-[10px] text-white font-extrabold px-1.5 py-0.5 rounded whitespace-nowrap shadow-lg">
              📡 ${liveName.split(' ')[0]} (Direct)
            </div>
          </div>
        `,
        className: '',
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userPosition);
      } else {
        userMarkerRef.current = L.marker(userPosition, { icon: userIcon })
          .addTo(map)
          .bindPopup(`<strong>Partage d'emplacement GPS Actif</strong><br/>Nom: ${liveName}<br/>Position: [${userPosition[0].toFixed(5)}, ${userPosition[1].toFixed(5)}]`);
        
        // Pan to user position when loaded first time
        map.panTo(userPosition, { animate: true });
      }
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    }
  }, [userPosition, userSharing, userRunnerInfo]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 h-[580px] min-h-[580px]">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full" id="map-trail" style={{ height: '100%', minHeight: '580px' }} />

      {/* Floating Layer Switcher */}
      <div className="absolute top-4 left-4 bg-slate-950/95 backdrop-blur-md border border-slate-800/80 p-2 rounded-xl shadow-2xl z-[400] pointer-events-auto transition-all flex items-center gap-1.5 hover:border-slate-700">
        <div className="p-1 px-2 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-r border-slate-800 mr-0.5 select-none text-slate-300">
          <Layers className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="hidden sm:inline">{isFr ? 'Fonds' : 'Layers'}</span>
        </div>
        <div className="flex bg-slate-950 border border-slate-800 p-0.5 rounded-lg text-[9.5px] font-bold font-sans">
          {[
            { id: 'topo', label: isFr ? '🥾 Topo' : '🥾 Topo' },
            { id: 'satellite', label: isFr ? '🛰️ Sat' : '🛰️ Sat' },
            { id: 'streets', label: isFr ? '🗺️ Rues' : '🗺️ Streets' },
          ].map(style => (
            <button
              key={style.id}
              onClick={() => setMapStyle(style.id as 'topo' | 'satellite' | 'streets')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-extrabold ${
                mapStyle === style.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Embedded Compass Overlay */}
      <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur border border-slate-700 p-2.5 rounded-xl shadow-lg flex flex-col items-center justify-center gap-1 z-[400] text-center pointer-events-none">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 animate-spin" style={{ animationDuration: '20s' }}>
          ▲
        </div>
        <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-300 font-extrabold">GPS COORD</span>
        <span className="text-[10px] font-mono text-slate-400 font-medium">
          {runners[0] ? `${runners[0].currentPos[0].toFixed(4)}°N, ${runners[0].currentPos[1].toFixed(4)}°E` : '---'}
        </span>
      </div>

      {/* Floating Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-950/95 backdrop-blur-md border border-slate-800/80 p-3 rounded-xl shadow-2xl z-[400] text-xs space-y-2 pointer-events-auto">
        <h4 className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase mb-1 border-b border-slate-800 pb-1">LEGENDE DES ETATS</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-sans">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-400 flex-shrink-0"></span>
            <span className="text-slate-300">Normal / Actif</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-400 flex-shrink-0 animate-pulse"></span>
            <span className="text-slate-300">Immobile / Alerte</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600 border border-rose-500 flex-shrink-0 animate-ping"></span>
            <span className="text-rose-400 font-semibold">Incident / SOS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-sky-500 border border-white flex-shrink-0"></span>
            <span className="text-slate-300">Arrivé 🏆</span>
          </div>
          {userSharing && (
            <div className="flex items-center gap-2 col-span-2 border-t border-slate-900 pt-1.5 mt-1">
              <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-300 flex-shrink-0 animate-ping"></span>
              <span className="text-blue-300 font-extrabold">📡 Votre GPS en direct</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
