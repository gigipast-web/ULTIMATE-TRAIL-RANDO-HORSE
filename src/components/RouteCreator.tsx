import React, { useState, useRef } from 'react';
import { RouteData, RunnerType, Checkpoint } from '../types';
import { parseGPXString, getPathLength, generateDummyGPX } from '../data';
import { Upload, Plus, FileText, CheckCircle, Sparkles, MapPin, Tag } from 'lucide-react';

interface RouteCreatorProps {
  organizerId: string;
  organizerName: string;
  onRouteCreated: (newRoute: RouteData) => void;
}

export default function RouteCreator({ organizerId, organizerName, onRouteCreated }: RouteCreatorProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<RunnerType>('VTT');
  const [region, setRegion] = useState('');
  const [entryFee, setEntryFee] = useState('0');
  const [gpxPoints, setGpxPoints] = useState<[number, number][]>([]);
  const [gpxFileName, setGpxFileName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Helper to generate custom physical coordinates if no GPX file is supplied
  const handleGenerateSampleTrack = () => {
    setError('');
    // Base coordinates depending on selected region or default
    let baseLat = 48.05;
    let baseLng = 6.92;

    if (region.toLowerCase().includes('alpe')) {
      baseLat = 45.923;
      baseLng = 6.868;
    } else if (region.toLowerCase().includes('provence') || region.toLowerCase().includes('verdon')) {
      baseLat = 43.74;
      baseLng = 6.25;
    } else if (region.toLowerCase().includes('bretagne') || region.toLowerCase().includes('brocéliande')) {
      baseLat = 48.01;
      baseLng = -2.17;
    }

    const points: [number, number][] = [];
    const numPoints = 80;
    // Walk loop
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const lat = baseLat + 0.03 * Math.sin(t * Math.PI) + 0.012 * Math.sin(t * 3 * Math.PI);
      const lng = baseLng + 0.05 * t + 0.01 * Math.sin(t * 4 * Math.PI);
      points.push([lat, lng]);
    }

    setGpxPoints(points);
    setGpxFileName('Tracé Topographique Synthétique (Généré)');
  };

  const handleGPXFile = (file: File) => {
    setError('');
    if (!file.name.endsWith('.gpx') && !file.name.endsWith('.xml')) {
      setError('Seuls les fichiers avec extension .gpx ou .xml sont acceptés.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const points = parseGPXString(text);
        if (points.length > 5) {
          setGpxPoints(points);
          setGpxFileName(file.name);
        } else {
          setError('Le fichier GPX ne contient pas assez de points de coordonnées de tracé.');
        }
      } catch (err) {
        setError('Structure GPX incorrecte ou fichier endommagé.');
      }
    };
    reader.readAsText(file);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleGPXFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Veuillez donner un nom à votre parcours.');
      return;
    }

    if (gpxPoints.length === 0) {
      setError('Veuillez charger un fichier GPX ou cliquer sur le générateur de tracé.');
      return;
    }

    const trackLength = getPathLength(gpxPoints);
    
    // Create custom checkpoints
    const checkpoints: Checkpoint[] = [
      {
        id: `cp-${Date.now()}-1`,
        name: 'Premier Contrôle (KM ' + Math.ceil(trackLength * 0.3) + ')',
        location: gpxPoints[Math.floor(gpxPoints.length * 0.3)],
        distance: Number((trackLength * 0.3).toFixed(1))
      },
      {
        id: `cp-${Date.now()}-2`,
        name: 'Ravitaillement Central (KM ' + Math.ceil(trackLength * 0.65) + ')',
        location: gpxPoints[Math.floor(gpxPoints.length * 0.65)],
        distance: Number((trackLength * 0.65).toFixed(1))
      }
    ];

    const newRoute: RouteData = {
      id: `route-${Date.now()}`,
      name: name.trim(),
      points: gpxPoints,
      length: trackLength,
      category: category,
      region: region.trim() || 'Région Locale 🏔️',
      checkpoints: checkpoints,
      organizerId: organizerId,
      organizerName: organizerName,
      entryFee: Number(entryFee) || 0
    };

    onRouteCreated(newRoute);
    setSuccess(true);
    
    // Reset state
    setName('');
    setRegion('');
    setEntryFee('0');
    setGpxPoints([]);
    setGpxFileName('');

    setTimeout(() => {
      setSuccess(false);
    }, 3000);
  };

  return (
    <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Plus className="w-5 h-5 text-indigo-400" />
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#a5b4fc]">
            Créer & Nommer un Nouveau Parcours
          </h3>
          <p className="text-[11px] text-slate-400">
            Enregistrez un tracé GPS distinct qui vous appartiendra de manière unique.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-900/60 p-2 rounded-xl">
          ⚠️ {error}
        </p>
      )}

      {success && (
        <p className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 p-2 rounded-xl flex items-center gap-1.5 animate-pulse">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Bravo ! Parcours créé et enregistré avec succès.</span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Course Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Nom du Parcours :
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                required
                placeholder="Ex: Circuit des Crêtes Vosgiennes VTT"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3.5 text-xs font-semibold text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Region */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Région / Territoire :
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Ex: Vosges Centrales"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3.5 text-xs font-semibold text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Entry Fee */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Frais d'inscription (€) :
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">€</span>
              <input
                type="number"
                min="0"
                max="250"
                placeholder="0 (Gratuit)"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-7 pr-3.5 text-xs font-semibold text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-end">
          {/* Category */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Discipline du Trail :
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RunnerType)}
              className="w-full bg-slate-950 text-xs font-bold border border-slate-800 rounded-xl p-2 text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="VTT">🚲 Vélo Tout Terrain (VTT)</option>
              <option value="Rando">🥾 Randonnée / Course à pied</option>
              <option value="Cavalier">🐎 Piste Équestre (Cavalier)</option>
            </select>
          </div>

          {/* Dummy generator shortcut */}
          <button
            type="button"
            onClick={handleGenerateSampleTrack}
            className="bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-900 text-indigo-300 text-[11px] font-extrabold py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shadow-sm h-[36px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Pas de GPX ? Générer un tracé de test</span>
          </button>
        </div>

        {/* Drag and Drop GPX selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Fichier GPX de Tracé physique :
          </label>
          <div
            onDragEnter={onDrag}
            onDragOver={onDrag}
            onDragLeave={onDrag}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-indigo-400 bg-indigo-950/40'
                : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".gpx,.xml"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleGPXFile(e.target.files[0]);
                }
              }}
            />
            {gpxFileName ? (
              <div className="space-y-1.5">
                <FileText className="w-6 h-6 text-indigo-400 mx-auto" />
                <p className="text-xs font-black text-indigo-300 truncate max-w-xs mx-auto">
                  ✓ {gpxFileName}
                </p>
                <p className="text-[9px] text-[#cbd5e1] font-mono">
                  Prêt à dessiner {gpxPoints.length} points de trace sur la carte
                </p>
              </div>
            ) : (
              <div>
                <Upload className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                <p className="text-[11px] font-bold text-slate-400">
                  Importez votre fichier .gpx ou <span className="text-indigo-400 underline">parcourez</span>
                </p>
                <p className="text-[9px] text-slate-600 font-mono mt-0.5">Formats GPX ou XML</p>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-2.5 rounded-xl border border-indigo-500 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-950/40 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Créer le Parcours "{name || 'Sans titre'}"</span>
        </button>
      </form>
    </div>
  );
}
