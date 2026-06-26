import { useState, useMemo } from 'react';
import { RouteData, Runner, RunnerType } from '../types';
import MapComponent from './MapComponent';
import { 
  Search, Trophy, Navigation, Users, Clock, Compass, Activity, X, ChevronRight, Sparkles 
} from 'lucide-react';

interface SpectatorPanelProps {
  route: RouteData;
  runners: Runner[];
  selectedRunnerId: string | null;
  onSelectRunner: (runnerId: string | null) => void;
  userPosition: [number, number] | null;
  userSharing: boolean;
  userRunnerInfo: { name: string; bib: string } | null;
  elapsedSeconds: number;
  lang?: 'fr' | 'en';
}

export default function SpectatorPanel({
  route,
  runners,
  selectedRunnerId,
  onSelectRunner,
  userPosition,
  userSharing,
  userRunnerInfo,
  elapsedSeconds,
  lang = 'fr'
}: SpectatorPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('all');

  const isFr = lang === 'fr';

  // Sport Badge Helper
  const getSportBadge = (type: RunnerType) => {
    switch (type) {
      case 'VTT':
        return { icon: '🚲', label: isFr ? 'VTT' : 'MTB', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'Rando':
        return { icon: '🥾', label: isFr ? 'Rando' : 'Hike', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'Cavalier':
        return { icon: '🐎', label: isFr ? 'Cavalier' : 'Horse', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
  };

  // Filter runners
  const filteredRunners = useMemo(() => {
    return runners.filter(runner => {
      const matchSearch = runner.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          runner.bibNumber.includes(searchQuery);
      const matchSport = selectedSport === 'all' || runner.type === selectedSport;
      return matchSearch && matchSport;
    });
  }, [runners, searchQuery, selectedSport]);

  // Find currently selected runner
  const selectedRunner = useMemo(() => {
    if (!selectedRunnerId) return null;
    return runners.find(r => r.id === selectedRunnerId) || null;
  }, [runners, selectedRunnerId]);

  // Compute live podium (ranked by progress desc)
  const podiumRunners = useMemo(() => {
    return [...runners]
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3);
  }, [runners]);

  // Calculate ETA dynamically
  const calculateETA = (runner: Runner) => {
    if (runner.status === 'finished') {
      return isFr ? 'Arrivé' : 'Finished';
    }
    if (runner.speed <= 0 || runner.status === 'sos' || runner.status === 'warning') {
      return isFr ? 'Immobile / SOS' : 'Stationary / SOS';
    }
    const speed = runner.speed; // km/h
    const distanceRemaining = runner.distanceRemaining; // km
    const hoursRemaining = distanceRemaining / speed;
    
    const minutesRemainingTotal = Math.round(hoursRemaining * 60);
    const hrs = Math.floor(minutesRemainingTotal / 60);
    const mins = minutesRemainingTotal % 60;

    if (hrs > 0) {
      return `~ ${hrs}h ${mins}m`;
    }
    return `~ ${mins} min`;
  };

  // Generate a Dynamic Activity Feed synchronised with the simulation data
  const liveFeed = useMemo(() => {
    const events = runners.flatMap(runner => {
      const feedList = [];

      // Finish event
      if (runner.status === 'finished') {
        const finishTime = runner.checkpointTimes[route.checkpoints[route.checkpoints.length - 1]?.id] || 'Récent';
        feedList.push({
          id: `${runner.id}-finished`,
          runner,
          time: finishTime,
          type: 'finish',
          emoji: '🏁',
          message: isFr 
            ? `Arrivée flamboyante au bout des ${route.length} km !` 
            : `Flamboyant arrival at the end of the ${route.length} km!`,
          importance: 'high',
          progress: 1.0
        });
      }

      // Checkpoint events
      runner.checkpointsCleared.forEach(cpId => {
        const cp = route.checkpoints.find(c => c.id === cpId);
        if (cp) {
          feedList.push({
            id: `${runner.id}-cp-${cpId}`,
            runner,
            time: runner.checkpointTimes[cpId] || 'Récent',
            type: 'checkpoint',
            emoji: '⏱️',
            message: isFr 
              ? `A validé le Checkpoint : ${cp.name} (${cp.distance} km)` 
              : `Cleared Checkpoint: ${cp.name} (${cp.distance} km)`,
            importance: 'normal',
            progress: cp.distance / route.length
          });
        }
      });

      // Emergency status
      if (runner.status === 'sos') {
        feedList.push({
          id: `${runner.id}-sos`,
          runner,
          time: 'Direct',
          type: 'sos',
          emoji: '🚨',
          message: isFr 
            ? `Incident signalé : ${runner.statusReason || 'Assistance nécessaire'}` 
            : `Incident reported: ${runner.statusReason || 'Assistance requested'}`,
          importance: 'urgent',
          progress: runner.progress
        });
      } else if (runner.status === 'warning') {
        feedList.push({
          id: `${runner.id}-warning`,
          runner,
          time: 'Direct',
          type: 'warning',
          emoji: '⚠️',
          message: isFr 
            ? `Arrêt suspect détecté en forêt depuis quelques minutes` 
            : `Suspect halt detected in woods for a few minutes`,
          importance: 'warning',
          progress: runner.progress
        });
      }

      return feedList;
    });

    // Sort showing the events of competitors who are furthest ahead first
    return events.sort((a, b) => b.progress - a.progress).slice(0, 10);
  }, [runners, route, isFr]);

  // Overall Statistics for Spectators (without modification controls)
  const activeCount = runners.filter(r => r.status === 'active').length;
  const finishedCount = runners.filter(r => r.status === 'finished').length;
  const sosCount = runners.filter(r => r.status === 'sos').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
      
      {/* LEFT COLUMN: Map and Global Stats Dashboard (8 columns) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Spectator High-level Overview Board */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-slate-800 flex items-center gap-1.5 uppercase">
                <Users className="w-5 h-5 text-indigo-600 animate-pulse" />
                {isFr ? "DASHBOARD SPECTATEUR" : "SPECTATOR CONTROL BOARD"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isFr ? "Vous suivez l'édition en cours de l'événement en temps réel" : "You are following the current live trails in real-time"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-xl shadow-inner text-slate-700">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {isFr ? "TEMPS ÉCOULÉ : " : "ELAPSED TIME: "}
                {Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0')}:{Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0')}:{NaN ? '00' : (elapsedSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-xl text-center">
              <span className="text-[9px] text-slate-550 uppercase tracking-widest font-black block">
                {isFr ? "Compétiteurs" : "Competitors"}
              </span>
              <span className="text-xl font-mono font-black text-slate-800">{runners.length}</span>
            </div>
            <div className="bg-emerald-50/40 border border-emerald-100 p-3 rounded-xl text-center">
              <span className="text-[9px] text-emerald-800 uppercase tracking-widest font-black block">
                {isFr ? "En Course ⚡" : "Out on Track ⚡"}
              </span>
              <span className="text-xl font-mono font-black text-emerald-700">{activeCount}</span>
            </div>
            <div className="bg-blue-50/40 border border-blue-100 p-3 rounded-xl text-center">
              <span className="text-[9px] text-blue-855 uppercase tracking-widest font-black block">
                {isFr ? "Ligne Franchie 🏁" : "Line Cleared 🏁"}
              </span>
              <span className="text-xl font-mono font-black text-blue-700">{finishedCount}</span>
            </div>
            <div className={`p-3 rounded-xl text-center border ${sosCount > 0 ? 'bg-red-50 border-red-200 text-red-800 animate-pulse' : 'bg-slate-50/50 border-slate-200'}`}>
              <span className={`text-[9px] uppercase tracking-widest font-black block ${sosCount > 0 ? 'text-red-700' : 'text-slate-550'}`}>
                {isFr ? "Secours requis 🚨" : "Rescue required 🚨"}
              </span>
              <span className={`text-xl font-mono font-black ${sosCount > 0 ? 'text-red-655' : 'text-slate-800'}`}>{sosCount}</span>
            </div>
          </div>
        </div>

        {/* Live Vector Leaflet Map Component */}
        <div className="relative">
          <div className="absolute top-3 left-3 z-[410] bg-indigo-600 text-white font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
            {isFr ? "MODE SPECTATEUR ACTIF" : "SPECTATOR EYE ON"}
          </div>
          <MapComponent
            route={route}
            runners={runners}
            selectedRunnerId={selectedRunnerId}
            onSelectRunner={onSelectRunner}
            userPosition={userPosition}
            userSharing={userSharing}
            userRunnerInfo={userRunnerInfo}
          />
        </div>

        {/* Dynamic Activity Feed of events */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-black tracking-wide uppercase text-slate-800 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-505 animate-pulse" />
            {isFr ? "Flux de Course en Direct (Chronos & Checkpoints)" : "Live Race stream (Check times & Checkpoints)"}
          </h3>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {liveFeed.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400 font-mono">
                {isFr 
                  ? "Aucune activité enregistrée pour le moment. La course vient de démarrer !" 
                  : "No events recorded yet. Match is starting!"}
              </p>
            ) : (
              liveFeed.map(feed => {
                let borderTheme = 'border-slate-100 bg-slate-50/50';
                if (feed.type === 'finish') borderTheme = 'border-emerald-200 bg-emerald-50/30';
                if (feed.type === 'sos') borderTheme = 'border-red-200 bg-red-50/30 text-red-900';
                if (feed.type === 'warning') borderTheme = 'border-amber-200 bg-amber-50/30';

                return (
                  <div key={feed.id} className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-3 ${borderTheme}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{feed.emoji}</span>
                      <div className="truncate">
                        <span className="font-extrabold text-slate-900 mr-1.5">#{feed.runner.bibNumber} {feed.runner.name}</span>
                        <span className="text-slate-600 font-medium">{feed.message}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-slate-500 bg-white shadow-sm border border-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                      {feed.time}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Leaderboard & Athlete Spotlight Card (4 columns) */}
      <div className="lg:col-span-4 space-y-6">

        {/* Selected Athlete Spotlight (Highly Detailed Panel) */}
        {selectedRunner ? (
          <div className="bg-white border-2 border-indigo-505 rounded-2xl p-5 shadow-md relative overflow-hidden">
            
            {/* Spotlight header */}
            <div className="absolute top-0 right-0 p-3">
              <button 
                onClick={() => onSelectRunner(null)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                title={isFr ? "Fermer la fiche" : "Close details"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title / Sport Badge */}
            <div className="flex items-center gap-1.5 text-indigo-650 font-black text-[10px] uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isFr ? "ATHLÈTE EN VEDETTE" : "SPOTLIGHT ATHLETE"}</span>
            </div>

            {/* Profile Brief */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-indigo-100/60">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-indigo-200 flex items-center justify-center text-xl shadow relative">
                <span className="absolute -bottom-1 -right-1 bg-white border border-slate-205 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                  {getSportBadge(selectedRunner.type).icon}
                </span>
                👤
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-black bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 rounded">
                    #{selectedRunner.bibNumber}
                  </span>
                  <span className="text-slate-400 font-bold">•</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    {isFr ? `Clt. ${selectedRunner.currentRank}ème` : `Rank #${selectedRunner.currentRank}`}
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-800 tracking-tight mt-0.5">{selectedRunner.name}</h3>
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 gap-3.5 py-4 border-b border-slate-100 bg-slate-50/50 -mx-5 px-5 my-1">
              <div>
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide block">
                  {isFr ? "VITESSE DIRECT" : "LIVE VELOCITY"}
                </span>
                <span className="font-mono text-base font-black text-slate-800">{selectedRunner.speed} <span className="text-xs font-medium text-slate-505">km/h</span></span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide block">
                  {isFr ? "ARRIVÉE EST. (ETA)" : "ESTIMATED ARRIVAL (ETA)"}
                </span>
                <span className="font-mono text-sm font-black text-indigo-650">{calculateETA(selectedRunner)}</span>
              </div>
              <div className="col-span-2">
                <div className="flex justify-between text-[9px] font-mono font-bold text-slate-400 uppercase mb-1">
                  <span>{isFr ? "Dist. Parcourue" : "Covered"}</span>
                  <span>{isFr ? "Reste" : "Left"}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xs font-bold text-slate-700">{selectedRunner.distanceCovered} km</span>
                  <span className="font-mono text-xs font-black text-indigo-600">-{selectedRunner.distanceRemaining} km</span>
                </div>
              </div>
            </div>

            {/* Modular Live Progress Bar with ticks */}
            <div className="py-4">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5">
                {isFr ? "Taux d'accomplissement :" : "Achievement level :"} {Math.round(selectedRunner.progress * 100)}%
              </span>
              <div className="w-full bg-slate-100 h-2.5 rounded-full border border-slate-200 overflow-hidden relative">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    selectedRunner.status === 'sos' 
                      ? 'bg-red-650' 
                      : selectedRunner.status === 'warning' 
                      ? 'bg-amber-500' 
                      : 'bg-indigo-600'
                  }`} 
                  style={{ width: `${selectedRunner.progress * 100}%` }}
                />
              </div>
            </div>

            {/* Checkpoints Stepper List (Timeline) */}
            <div className="py-2.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                {isFr ? "HISTORIQUE DES CHECKPOINTS" : "CHECKPOINTS PATH TIMELINE"}
              </span>
              <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                
                {/* START Point */}
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow flex items-center justify-center text-[8px] text-white">
                    🏁
                  </div>
                  <div className="text-[11px] leading-tight">
                    <span className="font-bold text-slate-800">{isFr ? "Lancement de la course" : "Race launched"}</span>
                    <span className="block text-[9px] text-slate-500 font-mono font-semibold">
                      {isFr ? "Dépassé au départ" : "Passed at start line"}
                    </span>
                  </div>
                </div>

                {/* Mid path Checkpoints */}
                {route.checkpoints.map(cp => {
                  const isCleared = selectedRunner.checkpointsCleared.includes(cp.id);
                  const clearTime = selectedRunner.checkpointTimes[cp.id];

                  return (
                    <div key={cp.id} className="flex items-start gap-3 relative z-10">
                      <div className={`w-4 h-4 rounded-full border-2 border-white shadow flex items-center justify-center ${
                        isCleared 
                          ? 'bg-indigo-600 text-[8px] text-white' 
                          : 'bg-slate-200 text-[8px] text-slate-500'
                      }`}>
                        {isCleared ? '✓' : '⏳'}
                      </div>
                      <div className="text-[11px] leading-tight flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`${isCleared ? 'font-bold text-slate-800' : 'font-medium text-slate-450'}`}>{cp.name}</span>
                          <span className="text-[9px] text-slate-400 font-bold">({cp.distance} km)</span>
                        </div>
                        {isCleared ? (
                          <span className="block text-[9px] text-emerald-700 font-mono font-extrabold">
                            {isFr ? `✓ Heure de passage : ${clearTime}` : `✓ Sector Cleared : ${clearTime}`}
                          </span>
                        ) : (
                          <span className="block text-[9px] text-slate-400 font-mono italic">
                            {isFr ? "En attente de passage..." : "Awaiting runner..."}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* END Point */}
                <div className="flex items-start gap-3 relative z-10">
                  <div className={`w-4 h-4 rounded-full border-2 border-white shadow flex items-center justify-center ${
                    selectedRunner.status === 'finished' 
                      ? 'bg-black text-[8px] text-white' 
                      : 'bg-slate-200 text-[8px] text-slate-500'
                  }`}>
                    🏆
                  </div>
                  <div className="text-[11px] leading-tight">
                    <span className={`${selectedRunner.status === 'finished' ? 'font-bold text-slate-800' : 'font-medium text-slate-450'}`}>
                      {isFr ? "Portique d'Arrivée" : "Finish Arch Portal"}
                    </span>
                    {selectedRunner.status === 'finished' ? (
                      <span className="block text-[9px] text-blue-600 font-mono font-bold">🏁 {isFr ? "Course achevée !" : "Track finished!"}</span>
                    ) : (
                      <span className="block text-[9px] text-slate-400 font-mono italic">{isFr ? "Objectif final" : "Final finish gate"}</span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Quick center camera action */}
            <button
              onClick={() => onSelectRunner(selectedRunner.id)}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 rounded-xl border border-indigo-500 transition-colors flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
            >
              <Navigation className="w-3.5 h-3.5" /> {isFr ? "Centrer la Caméra du GPS" : "Recenter GPX camera viewport"}
            </button>

          </div>
        ) : (
          /* Athlete Selector / Welcome view if no selection */
          <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-6 text-center shadow-inner flex flex-col items-center justify-center min-h-[160px]">
            <Compass className="w-8 h-8 text-indigo-400 mb-2 animate-spin" style={{ animationDuration: '24s' }} />
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
              {isFr ? "🔍 Sélection d'un athlète" : "🔍 Select a runner"}
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] leading-normal font-medium">
              {isFr 
                ? "Cliquez sur n'importe quel coureur sur la carte ou recherchez-le dans la liste ci-dessous pour zoomer sur sa progression."
                : "Press any athlete circle on the map pin coordinates or click standard list rows to pull up the complete timeline."}
            </p>
          </div>
        )}

        {/* Live Podium Standings in Direct (Top 3) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-3">
            <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
            <h3 className="text-xs font-black tracking-wide uppercase text-slate-800">
              {isFr ? "Leaders de Course (Classement)" : "Race Leaders (Standings)"}
            </h3>
          </div>
          <div className="space-y-2">
            {podiumRunners.map((runner, index) => {
              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
              const isSelected = selectedRunnerId === runner.id;
              
              return (
                <div 
                  key={`podium-${runner.id}`}
                  onClick={() => onSelectRunner(isSelected ? null : runner.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-50 border-indigo-400' 
                      : 'bg-slate-50/60 border-slate-150 hover:bg-slate-100/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 font-sans">
                    <span className="text-base">{medal}</span>
                    <div className="truncate text-left">
                      <h4 className="font-extrabold text-slate-800 truncate">#{runner.bibNumber} {runner.name}</h4>
                      <span className="text-[9px] text-slate-505 font-bold">
                        {getSportBadge(runner.type).icon} {getSportBadge(runner.type).label} • {runner.distanceCovered} km
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Competitors Search List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col max-h-[440px]">
          <div className="border-b border-slate-105 pb-2 mb-3">
            <h3 className="text-xs font-black tracking-wide uppercase text-slate-800">
              {isFr ? `Tous les Compétiteurs (${filteredRunners.length})` : `All Competitors (${filteredRunners.length})`}
            </h3>
          </div>

          {/* Inline filters */}
          <div className="space-y-2.5 mb-3.5">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3 h-3" />
              </span>
              <input
                id="spectator-search"
                type="text"
                placeholder={isFr ? "Chercher nom ou dossard..." : "Search name or bib #..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-[10.5px] font-semibold placeholder-slate-400 text-slate-800 focus:outline-none focus:border-indigo-505 focus:ring-1 focus:ring-indigo-500 shadow-inner"
              />
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-[10px] font-bold font-sans">
              {[
                { id: 'all', label: isFr ? 'Tous' : 'All' },
                { id: 'VTT', label: isFr ? '🚲 VTT' : '🚲 MTB' },
                { id: 'Rando', label: isFr ? '🥾 Rando' : '🥾 Hike' },
                { id: 'Cavalier', label: isFr ? '🐎 Cav' : '🐎 Horse' },
              ].map(sportTab => (
                <button
                  key={sportTab.id}
                  onClick={() => setSelectedSport(sportTab.id)}
                  className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                    selectedSport === sportTab.id 
                      ? 'bg-white text-indigo-700 shadow-sm' 
                      : 'text-slate-505 hover:text-slate-800'
                  }`}
                >
                  {sportTab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrolling competitors list */}
          <div className="overflow-y-auto space-y-1.5 flex-1 pr-1 max-h-[300px]">
            {filteredRunners.length === 0 ? (
              <p className="text-center py-6 text-[10px] text-slate-405 font-mono">
                {isFr ? "Aucun coureur trouvé" : "No athletes found"}
              </p>
            ) : (
              filteredRunners.map(runner => {
                const isSelected = selectedRunnerId === runner.id;
                let bgTheme = 'bg-slate-50 hover:bg-slate-100 border-slate-200';
                if (isSelected) bgTheme = 'bg-indigo-50 border-indigo-400 shadow-sm';
                if (runner.status === 'sos') bgTheme = 'bg-red-50 border-red-200 text-red-900 animate-pulse';

                return (
                  <div
                    key={runner.id}
                    onClick={() => onSelectRunner(isSelected ? null : runner.id)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-[11px] ${bgTheme}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 font-sans">
                      <span className="w-6 h-5 rounded bg-white text-slate-700 font-bold border border-slate-200 text-center flex items-center justify-center text-[10px] shadow-sm font-mono">
                        {runner.bibNumber}
                      </span>
                      <div className="truncate text-left">
                        <span className="font-extrabold text-slate-800 block truncate">{runner.name}</span>
                        <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide block">
                          {getSportBadge(runner.type).icon} {getSportBadge(runner.type).label} • {runner.speed} km/h
                        </span>
                      </div>
                    </div>
                    {runner.status === 'finished' ? (
                      <span className="text-[10px]">🏁</span>
                    ) : runner.status === 'sos' ? (
                      <span className="text-[9px] bg-red-655 text-white font-extrabold px-1 rounded">SOS</span>
                    ) : (
                      <span className="text-[9px] font-mono font-bold text-slate-450">{Math.round(runner.progress * 100)}%</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
