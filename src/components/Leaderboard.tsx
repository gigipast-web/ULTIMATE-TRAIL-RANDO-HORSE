import { useState } from 'react';
import { Runner, RunnerType } from '../types';
import { Search, Trophy, CheckCircle, Flame, AlertTriangle, Radio, Shield, Navigation } from 'lucide-react';

interface LeaderboardProps {
  runners: Runner[];
  selectedRunnerId: string | null;
  onSelectRunner: (runnerId: string | null) => void;
  onTriggerSOS: (runnerId: string) => void;
  onResolveSOS: (runnerId: string) => void;
  lang?: 'fr' | 'en';
}

export default function Leaderboard({
  runners,
  selectedRunnerId,
  onSelectRunner,
  onTriggerSOS,
  onResolveSOS,
  lang = 'fr'
}: LeaderboardProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const isFr = lang === 'fr';

  // Icons based on type
  const getTypeBadge = (type: RunnerType) => {
    switch (type) {
      case 'VTT':
        return { icon: '🚲', label: isFr ? 'VTT' : 'MTB', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
      case 'Rando':
        return { icon: '🥾', label: isFr ? 'Rando' : 'Hike', color: 'bg-amber-50 text-amber-700 border-amber-100' };
      case 'Cavalier':
        return { icon: '🐎', label: isFr ? 'Cav' : 'Horse', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' };
    }
  };

  const filteredRunners = runners
    .filter(runner => {
      const matchSearch = runner.name.toLowerCase().includes(search.toLowerCase()) || 
                          runner.bibNumber.includes(search);
      const matchType = filterType === 'all' || runner.type === filterType;
      return matchSearch && matchType;
    });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-extrabold tracking-tight text-slate-800 flex items-center gap-1.5 uppercase">
            <Trophy className="w-4 h-4 text-indigo-600 animate-bounce" />
            {isFr ? "Classement & Statut en Direct" : "Live Standings & Safety status"}
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">
            {isFr 
              ? "Position sur le parcours & suivi de sécurité de la constellation"
              : "Track coordinates & live security status monitoring"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></span>
          {runners.length} {isFr ? "Coureurs" : "Runners"}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-2.5 mb-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            id="search-runner"
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold placeholder-slate-400 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            placeholder={isFr ? "Rechercher par nom ou dossard..." : "Search by name or bib..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Categories Tab */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {[
            { id: 'all', label: isFr ? 'Tous' : 'All', icon: '🌍' },
            { id: 'VTT', label: isFr ? 'VTT' : 'MTB', icon: '🚲' },
            { id: 'Rando', label: isFr ? 'Rando' : 'Hike', icon: '🥾' },
            { id: 'Cavalier', label: isFr ? 'Cav' : 'Horse', icon: '🐎' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                filterType === tab.id
                  ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/55'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active High-Alert Row (SOS / WARNINGS on Top) */}
      {runners.some(r => r.status === 'sos' || r.status === 'warning') && (
        <div className="mb-4 space-y-2">
          <h3 className="text-[10px] font-extrabold tracking-widest text-red-600 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {isFr ? "ALERTES CRITIQUES EN DIRECT" : "LIVE CRITICAL ALERTS"}
          </h3>
          {runners
            .filter(r => r.status === 'sos' || r.status === 'warning')
            .map(runner => {
              const isSos = runner.status === 'sos';
              return (
                <div
                  key={`alert-${runner.id}`}
                  className={`border p-3 rounded-xl flex items-center justify-between gap-3 animate-pulse shadow-sm ${
                    isSos 
                      ? 'bg-red-50 border-red-300 text-red-900' 
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isSos ? 'bg-red-600 animate-ping' : 'bg-amber-500 animate-ping'}`}></span>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-950">#{runner.bibNumber}</span>
                        <span className="font-bold text-xs text-slate-900 truncate">{runner.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-semibold block italic">
                        {runner.statusReason || (isFr ? 'Inactivité suspectée' : 'Inactivity suspected')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectRunner(runner.id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-lg border border-indigo-500 transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      title={isFr ? "Centrer la carte" : "Center on map"}
                    >
                      <Navigation className="w-3 h-3 text-white" /> {isFr ? "Suivre" : "Track"}
                    </button>
                    {isSos ? (
                      <button
                        onClick={() => onResolveSOS(runner.id)}
                        className="bg-green-600 hover:bg-green-700 text-white font-extrabold text-[10px] py-1 px-2 rounded-lg transition-colors border border-green-500 cursor-pointer"
                      >
                        {isFr ? "Secours OK" : "Rescue OK"}
                      </button>
                    ) : (
                      <button
                        onClick={() => onTriggerSOS(runner.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] py-1 px-2 rounded-lg transition-all cursor-pointer"
                      >
                        {isFr ? "Forcer SOS" : "Force SOS"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Main Leaderboard List */}
       <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[480px]">
        {runners.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Radio className="w-8 h-8 text-indigo-400 mx-auto mb-2 animate-pulse" />
            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
              {isFr ? "Aucun participant inscrit" : "No competitors registered"}
            </h3>
            <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-normal">
              {isFr
                ? <>Utilisez le panneau <strong>"Inscriptions & Préparations"</strong> à droite pour inscrire vos coureurs, ou connectez vos mobiles.</>
                : <>Use the <strong>"Registration & Lineup"</strong> admin section on the right to sign up competitors.</>}
            </p>
          </div>
        ) : filteredRunners.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs font-mono">
            {isFr ? "Aucun coureur ne correspond à ces critères" : "No athletes match these filters"}
          </div>
        ) : (
          filteredRunners.map((runner) => {
            const isSelected = selectedRunnerId === runner.id;
            const badge = getTypeBadge(runner.type);

            let rowBg = 'bg-slate-50 border-slate-205 hover:border-indigo-400 text-slate-800';
            if (isSelected) rowBg = 'bg-indigo-50 border-indigo-450 ring-1 ring-indigo-450/40 shadow-sm text-slate-900';
            if (runner.status === 'sos') rowBg = 'bg-red-50 border-red-300 hover:border-red-400 text-red-955';
            if (runner.status === 'finished') rowBg = 'bg-emerald-50 border-emerald-250 hover:border-emerald-350 text-emerald-955';

            return (
              <div
                key={runner.id}
                onClick={() => onSelectRunner(isSelected ? null : runner.id)}
                className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-2 ${rowBg}`}
              >
                {/* Upper line: Rank, Bib, Name, Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-right font-mono font-black text-slate-500 text-xs sm:text-sm">
                      {runner.status === 'finished' ? '🏁' : `${runner.currentRank}.`}
                    </span>
                    <span className="w-8 h-6 rounded bg-white border border-slate-200 text-slate-650 font-black font-mono text-center flex items-center justify-center text-xs shadow-sm">
                      {runner.bibNumber}
                    </span>
                    <div className="truncate">
                      <h4 className="font-extrabold text-xs text-slate-900 truncate">{runner.name}</h4>
                      <span className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${badge.color}`}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Right: Status Icon or Action Indicator */}
                  <div className="flex items-center gap-2">
                    {runner.status === 'finished' ? (
                      <span className="bg-emerald-100/80 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-extrabold flex items-center gap-1 uppercase tracking-wider">
                        🏆 {isFr ? "Arrivé" : "Finished"}
                      </span>
                    ) : runner.status === 'sos' ? (
                      <span className="bg-red-650 text-white font-black text-[9px] px-2 py-0.5 rounded animate-bounce">
                        🆘 {isFr ? "INCIDENT" : "INCIDENT"}
                      </span>
                    ) : runner.status === 'warning' ? (
                      <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded animate-pulse">
                        ⚠️ {isFr ? "STATIQUE" : "STATIONARY"}
                      </span>
                    ) : (
                      <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                        {isFr ? "En course" : "Racing"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info dashboard with real spacing */}
                <div className="grid grid-cols-3 gap-1 border-t border-slate-200/60 pt-2 text-[10px] font-medium text-slate-500">
                  <div>
                    <span className="block text-[8px] tracking-wider text-slate-400 uppercase font-bold">
                      {isFr ? "Vitesse" : "Speed"}
                    </span>
                    <span className="font-mono text-slate-800 text-[11px] font-bold">{runner.speed} km/h</span>
                  </div>
                  <div>
                    <span className="block text-[8px] tracking-wider text-slate-400 uppercase font-bold">
                      {isFr ? "Dist. Parcourue" : "Dist. Covered"}
                    </span>
                    <span className="font-mono text-slate-800 text-[11px] font-bold">{runner.distanceCovered} / {runner.distanceCovered + runner.distanceRemaining} km</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] tracking-wider text-slate-400 uppercase font-bold">
                      {isFr ? "Reste" : "Remaining"}
                    </span>
                    <span className="font-mono text-indigo-600 text-[11px] font-black">-{runner.distanceRemaining} km</span>
                  </div>
                </div>

                {/* Checkpoints info */}
                <div className="border-t border-slate-200/50 pt-1.5 flex flex-wrap gap-1.5 items-center justify-between text-[9px] text-slate-500 font-mono">
                  <div className="flex gap-1 items-center font-semibold">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>{isFr ? "CP validés" : "CP Cleared"}: {runner.checkpointsCleared.length}</span>
                  </div>
                  {runner.status === 'finished' ? (
                    <span className="text-emerald-700 font-black">
                      {isFr ? "Course bouclée !" : "Course completed!"}
                    </span>
                  ) : (
                    <div className="flex gap-1 items-center font-semibold">
                      <Flame className="w-3 h-3 text-amber-550" />
                      <span>{Math.round(runner.progress * 100)}% {isFr ? "accomplis" : "completed"}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
