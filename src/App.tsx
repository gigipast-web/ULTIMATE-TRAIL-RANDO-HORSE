import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Map,
  Compass,
  Users,
  Settings,
  Shield,
  TrendingUp,
  Coins,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sparkles,
  Plus,
  Trash,
  CreditCard,
  CheckCircle,
  Clock,
  Heart,
  Wifi,
  Tv,
  RefreshCw,
  Play,
  Square,
  ChevronRight,
  Info,
  Upload,
  Maximize2,
  MapPin
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Route, Organizer, Runner, Transaction, PlatformSettings } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'runner' | 'organizer' | 'spectator' | 'creator'>('runner');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    id: 'platform-settings',
    commissionPercent: 5,
    creatorStripeAccountId: 'acct_1OppX4G8h9j0k1l2',
    isDemoMode: false
  });

  const [loading, setLoading] = useState(true);
  const [stripeConfig, setStripeConfig] = useState<{ publicKey: string; hasSecretKey: boolean }>({
    publicKey: '',
    hasSecretKey: false
  });

  // --- API FETCHERS ---
  const fetchData = async () => {
    try {
      const [resRoutes, resOrgs, resRunners, resTxs, resSettings, resConfig] = await Promise.all([
        fetch('/api/routes').then(r => r.json()),
        fetch('/api/organizers').then(r => r.json()),
        fetch('/api/runners').then(r => r.json()),
        fetch('/api/transactions').then(r => r.json()),
        fetch('/api/stripe/platform-settings').then(r => r.json()),
        fetch('/api/stripe/config').then(r => r.json())
      ]);

      setRoutes(resRoutes);
      setOrganizers(resOrgs);
      setRunners(resRunners);
      setTransactions(resTxs);
      setSettings(resSettings);
      setStripeConfig(resConfig);
    } catch (e) {
      console.error('Error fetching backend data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Check query params for successful checkout redirect
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutSuccess = urlParams.get('checkout_success');
    const checkoutCancel = urlParams.get('checkout_cancel');
    const paramRouteId = urlParams.get('routeId');
    const paramRunnerId = urlParams.get('runnerId');
    const paramAmount = urlParams.get('amount');

    if (checkoutSuccess && paramRouteId && paramRunnerId) {
      // Simulate payout update to record transaction locally on return
      fetch(`/api/stripe/simulate-payout-success?routeId=${paramRouteId}&runnerId=${paramRunnerId}&amount=${paramAmount}`)
        .then(() => {
          // Clear query parameters
          window.history.replaceState({}, document.title, window.location.pathname + (urlParams.get('tab') ? `?tab=${urlParams.get('tab')}` : ''));
          fetchData();
          alert('🎉 Inscription et paiement validés avec succès ! Votre dossard est actif.');
        });
    } else if (checkoutCancel) {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert('⚠️ Paiement annulé. Vous pouvez réessayer votre inscription à tout moment.');
    }
  }, []);

  // Spectator simulation of runners moving
  useEffect(() => {
    const interval = setInterval(() => {
      // Find all running runners
      const runningRunners = runners.filter(r => r.status === 'running');
      if (runningRunners.length === 0) return;

      runningRunners.forEach(async (runner) => {
        const route = routes.find(rt => rt.id === runner.routeId);
        if (!route) return;

        const totalPoints = route.coordinates.length;
        const currentIdx = runner.currentPositionIndex ?? 0;
        const nextIdx = currentIdx + 1;

        if (nextIdx >= totalPoints) {
          // Finished the race!
          const durationSec = Math.floor(3600 + Math.random() * 5000);
          const hours = Math.floor(durationSec / 3600).toString().padStart(2, '0');
          const minutes = Math.floor((durationSec % 3600) / 60).toString().padStart(2, '0');
          const seconds = (durationSec % 60).toString().padStart(2, '0');
          const finalTime = `${hours}:${minutes}:${seconds}`;

          await fetch('/api/runners/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: runner.id,
              status: 'completed',
              currentPositionIndex: totalPoints - 1,
              checkpointProgress: route.checkpoints.length - 1,
              finalTime,
              liveSpeed: 0
            })
          });
        } else {
          // Move along path
          const currentCheckpointPercent = route.checkpoints.length > 1 
            ? Math.floor((nextIdx / totalPoints) * (route.checkpoints.length - 1))
            : 0;
          
          await fetch('/api/runners/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: runner.id,
              status: 'running',
              currentPositionIndex: nextIdx,
              checkpointProgress: Math.max(runner.checkpointProgress, currentCheckpointPercent),
              liveSpeed: Number((9 + Math.random() * 6).toFixed(1))
            })
          });
        }
      });

      // Refresh every 5 seconds to show updates
      fetch('/api/runners').then(r => r.json()).then(setRunners);
    }, 6000);

    return () => clearInterval(interval);
  }, [runners, routes]);

  return (
    <div className="min-h-full flex flex-col font-sans">
      {/* HEADER BAR */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-md shadow-indigo-600/30 flex items-center justify-center animate-pulse">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight flex items-center gap-1.5 leading-none">
                ULTIMATE TRAIL VTT RANDO HORSE 🏃🚲🐎
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-400/20">
                  Live GPS
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-mono mt-1">Suivi GPS de Coureurs, VTT & Cavaliers • Inscriptions & Paiements Stripe</p>
            </div>
          </div>

          {/* NAVIGATION TABS - Hidden on mobile to use a native bottom bar */}
          <nav className="hidden md:flex bg-slate-800 p-1 rounded-2xl border border-slate-700/65">
            <button
              onClick={() => setActiveTab('runner')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'runner' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              Espace Coureur
            </button>
            <button
              onClick={() => setActiveTab('organizer')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'organizer' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Organisateur
            </button>
            <button
              onClick={() => setActiveTab('spectator')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'spectator' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4" />
              Spectateur
            </button>
            <button
              onClick={() => setActiveTab('creator')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'creator' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              Espace Créateur
            </button>
          </nav>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR - Standardized iOS and Android design */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 py-2.5 px-2 flex justify-around items-center z-50 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] pb-safe-offset-2">
        <button
          onClick={() => setActiveTab('runner')}
          className={`flex flex-col items-center gap-1.5 py-1 px-3.5 rounded-xl transition-all ${
            activeTab === 'runner' ? 'text-indigo-400 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Activity className="w-5.5 h-5.5" />
          <span className="text-[10px] font-black tracking-tight">Coureur</span>
        </button>
        <button
          onClick={() => setActiveTab('spectator')}
          className={`flex flex-col items-center gap-1.5 py-1 px-3.5 rounded-xl transition-all ${
            activeTab === 'spectator' ? 'text-indigo-400 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Tv className="w-5.5 h-5.5" />
          <span className="text-[10px] font-black tracking-tight">Spectateur</span>
        </button>
        <button
          onClick={() => setActiveTab('organizer')}
          className={`flex flex-col items-center gap-1.5 py-1 px-3.5 rounded-xl transition-all ${
            activeTab === 'organizer' ? 'text-indigo-400 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Users className="w-5.5 h-5.5" />
          <span className="text-[10px] font-black tracking-tight">Orga</span>
        </button>
        <button
          onClick={() => setActiveTab('creator')}
          className={`flex flex-col items-center gap-1.5 py-1 px-3.5 rounded-xl transition-all ${
            activeTab === 'creator' ? 'text-indigo-400 font-extrabold scale-105' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Shield className="w-5.5 h-5.5" />
          <span className="text-[10px] font-black tracking-tight">Créateur</span>
        </button>
      </nav>

      {/* STRIPE KEY STATUS INDICATOR */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 py-2 text-center px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs font-semibold text-amber-800">
          <Wifi className="w-4 h-4 text-amber-600 animate-pulse" />
          <span>
            {stripeConfig.hasSecretKey 
              ? "🟢 Mode Réel : Clé API Stripe connectée avec succès. Transactions traitées sur le réseau Stripe." 
              : "💡 Mode Simulé : Aucune clé API Stripe n'est configurée dans AI Studio. L'application simule les paiements en direct."}
          </span>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 animate-in fade-in duration-300">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-500">Chargement des données du trail...</p>
          </div>
        ) : (
          <>
            {activeTab === 'runner' && (
              <RunnerMode 
                routes={routes} 
                organizers={organizers} 
                runners={runners} 
                onRefresh={fetchData} 
                stripeConfig={stripeConfig}
              />
            )}
            {activeTab === 'organizer' && (
              <OrganizerMode 
                routes={routes} 
                organizers={organizers} 
                runners={runners} 
                onRefresh={fetchData}
                settings={settings}
              />
            )}
            {activeTab === 'spectator' && (
              <SpectatorMode 
                routes={routes} 
                runners={runners} 
                onRefresh={fetchData}
              />
            )}
            {activeTab === 'creator' && (
              <CreatorMode 
                routes={routes}
                transactions={transactions} 
                settings={settings} 
                onRefresh={fetchData}
              />
            )}
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-500 text-center py-6 border-t border-slate-800 mt-12 text-xs">
        <p>© 2026 Ultimate Trail Hub. Propulsé par Stripe Connect & Google Cloud Firestore.</p>
        <p className="mt-1 text-[11px] text-slate-600">Conçu pour les organisateurs sportifs et les créateurs de solutions numériques durables.</p>
      </footer>
    </div>
  );
}

// ==========================================
// 🏃‍♂️ COUREUR / RUNNER COMPONENT
// ==========================================
interface RunnerModeProps {
  routes: Route[];
  organizers: Organizer[];
  runners: Runner[];
  onRefresh: () => void;
  stripeConfig: { publicKey: string; hasSecretKey: boolean };
}

function RunnerMode({ routes, organizers, runners, onRefresh, stripeConfig }: RunnerModeProps) {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(routes[0] || null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [participantType, setParticipantType] = useState<'coureur' | 'vtt' | 'cavalier'>('coureur');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Runner State for Live Tracking
  const [selectedActiveRunnerId, setSelectedActiveRunnerId] = useState<string>('');
  const activeRunner = runners.find(r => r.id === selectedActiveRunnerId);
  const activeRunnerRoute = activeRunner ? routes.find(rt => rt.id === activeRunner.routeId) : null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute) return;
    setIsSubmitting(true);

    try {
      // 1. Create Runner in 'pending' status
      const resReg = await fetch('/api/runners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, routeId: selectedRoute.id, type: participantType })
      });

      if (!resReg.ok) throw new Error('Registration failed');
      const runner: Runner = await resReg.json();

      // 2. Initiate Stripe checkout session
      const resStripe = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: selectedRoute.id, runnerId: runner.id })
      });

      if (!resStripe.ok) throw new Error('Stripe session failed');
      const stripeData = await resStripe.json();

      if (stripeData.simulated) {
        // Fallback simulation
        alert(`💡 ${stripeData.message}\nNous vous redirigeons vers l'interface de validation simulée.`);
        window.location.href = `/api/stripe/simulate-payout-success?routeId=${selectedRoute.id}&runnerId=${runner.id}&amount=${selectedRoute.entryFee}&runnerName=${encodeURIComponent(name)}`;
      } else if (stripeData.url) {
        // Redirect to real Stripe Checkout
        window.location.href = stripeData.url;
      }
    } catch (err) {
      console.error(err);
      alert('Une erreur est survenue lors de l\'initiation de votre paiement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startRaceSimulation = async (runnerId: string) => {
    await fetch('/api/runners/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: runnerId,
        status: 'running',
        checkpointProgress: 0,
        currentPositionIndex: 0,
        liveSpeed: 10.5
      })
    });
    onRefresh();
  };

  const advanceCheckpoint = async (runner: Runner, route: Route) => {
    const nextProgress = runner.checkpointProgress + 1;
    const isFinished = nextProgress >= route.checkpoints.length;
    const nextIdx = Math.floor((nextProgress / (route.checkpoints.length - 1)) * (route.coordinates.length - 1));

    if (isFinished) {
      const finalTime = "01:24:50"; // Mock final time
      await fetch('/api/runners/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: runner.id,
          status: 'completed',
          checkpointProgress: route.checkpoints.length - 1,
          currentPositionIndex: route.coordinates.length - 1,
          finalTime,
          liveSpeed: 0
        })
      });
    } else {
      await fetch('/api/runners/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: runner.id,
          status: 'running',
          checkpointProgress: nextProgress,
          currentPositionIndex: nextIdx,
          liveSpeed: Number((8 + Math.random() * 5).toFixed(1))
        })
      });
    }
    onRefresh();
  };

  const handleDnf = async (runnerId: string) => {
    await fetch('/api/runners/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: runnerId,
        status: 'dnf',
        liveSpeed: 0
      })
    });
    onRefresh();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* LEFT COLUMN: Discover & Register */}
      <div className="lg:col-span-7 space-y-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Compass className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black tracking-tight uppercase text-slate-800">1. Choisissez votre Trail</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {routes.map(r => {
              const org = organizers.find(o => o.id === r.organizerId);
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoute(r)}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    selectedRoute?.id === r.id 
                      ? 'border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-600' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {selectedRoute?.id === r.id && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-600 rounded-bl-xl" />
                  )}
                  <h3 className="font-extrabold text-sm text-slate-800">{r.name}</h3>
                  <div className="flex items-center gap-3 mt-2 text-[11px] font-bold text-slate-500">
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md">{r.distance} km</span>
                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md">+{r.elevation} m</span>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Club : {org?.name || 'Local Club'}</span>
                    <span className="text-xs font-black text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded-lg">{r.entryFee} €</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedRoute && (
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <h4 className="font-extrabold text-xs text-slate-700 uppercase">Description du Parcours</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{selectedRoute.description}</p>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Frais d'inscription</span>
                  <strong className="text-lg font-black text-slate-800">{selectedRoute.entryFee} €</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Checkpoints clés</span>
                  <strong className="text-xs font-bold text-indigo-700">{selectedRoute.checkpoints.join(' ➔ ')}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* REGISTRATION FORM */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black tracking-tight uppercase text-slate-800">2. Inscription & Paiement Stripe</h2>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nom Complet *</label>
                <input
                  type="text"
                  required
                  placeholder="Jean Dupont"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Adresse Email *</label>
                <input
                  type="email"
                  required
                  placeholder="jean.dupont@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Numéro de Téléphone *</label>
              <input
                type="tel"
                required
                placeholder="+33 6 12 34 56 78"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Type de discipline *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setParticipantType('coureur')}
                  className={`py-2.5 px-3 rounded-xl border text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    participantType === 'coureur' 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>🏃</span> Coureur
                </button>
                <button
                  type="button"
                  onClick={() => setParticipantType('vtt')}
                  className={`py-2.5 px-3 rounded-xl border text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    participantType === 'vtt' 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>🚲</span> VTT
                </button>
                <button
                  type="button"
                  onClick={() => setParticipantType('cavalier')}
                  className={`py-2.5 px-3 rounded-xl border text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    participantType === 'cavalier' 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>🐎</span> Cavalier
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedRoute}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4.5 h-4.5 animate-bounce" />
              <span>
                {isSubmitting 
                  ? "Traitement..." 
                  : `S'inscrire et payer ${selectedRoute?.entryFee || 0} € par Stripe`}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: Live runner checkin & control console */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black tracking-tight uppercase text-slate-800">Console de Course Live</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
            Une fois inscrit et votre dossier payé par Stripe, sélectionnez votre nom pour simuler votre présence, pointer aux checkpoints et envoyer des signaux de progression.
          </p>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Dossard Coureur Actif :</label>
            <select
              value={selectedActiveRunnerId}
              onChange={e => setSelectedActiveRunnerId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none"
            >
              <option value="">-- Sélectionnez votre profil --</option>
              {runners.map(r => {
                const rt = routes.find(x => x.id === r.routeId);
                return (
                  <option key={r.id} value={r.id}>
                    N°{r.bibNumber} - {r.name} ({rt?.name} - {r.status.toUpperCase()})
                  </option>
                );
              })}
            </select>
          </div>

          {activeRunner && activeRunnerRoute && (
            <div className="mt-6 border-t border-slate-100 pt-6 space-y-5 animate-in slide-in-from-bottom duration-300">
              {/* Smartphone Sports Tracker HUD */}
              <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl border-2 border-slate-800 relative overflow-hidden space-y-4">
                {/* Background decorative grid */}
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />
                
                {/* Top status bar */}
                <div className="flex justify-between items-center relative z-10 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">GPS Live : Actif</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                    activeRunner.status === 'paid' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    activeRunner.status === 'running' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse' :
                    activeRunner.status === 'completed' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {activeRunner.status === 'paid' ? '⏱️ Prêt' : activeRunner.status === 'running' ? '🟢 En Course' : activeRunner.status === 'completed' ? '🏆 Terminé' : '❌ Abandon'}
                  </span>
                </div>

                {/* Profile info & type emoji */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="space-y-0.5">
                    <h4 className="font-black text-base text-slate-100 tracking-tight">{activeRunner.name}</h4>
                    <p className="text-xs text-slate-400 font-mono font-bold">Dossard N°{activeRunner.bibNumber} • {activeRunnerRoute.name}</p>
                  </div>
                  <div className="bg-slate-800/80 w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-700 shadow-inner text-2xl">
                    {activeRunner.type === 'cavalier' ? '🐎' : activeRunner.type === 'vtt' ? '🚲' : '🏃'}
                  </div>
                </div>

                {/* Big digital speedometer section */}
                <div className="grid grid-cols-2 gap-3 relative z-10">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center flex flex-col justify-center items-center h-24">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black block mb-1">Vitesse Actuelle</span>
                    <div className="flex items-baseline gap-1">
                      <strong className="text-3xl font-black text-indigo-400 font-mono leading-none">{activeRunner.liveSpeed || 0}</strong>
                      <span className="text-[10px] font-bold text-slate-500 font-mono">km/h</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center flex flex-col justify-center items-center h-24">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black block mb-1">Dernier Pointage</span>
                    <div className="flex flex-col items-center">
                      <strong className="text-sm font-black text-emerald-400 truncate max-w-[120px]">
                        {activeRunnerRoute.checkpoints[activeRunner.checkpointProgress] || "Départ"}
                      </strong>
                      <span className="text-[9px] text-slate-500 font-bold mt-1 uppercase font-mono">
                        CP {activeRunner.checkpointProgress + 1} / {activeRunnerRoute.checkpoints.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual checkpoint step progress line */}
                <div className="bg-slate-950/40 border border-slate-850/80 rounded-2xl p-3.5 space-y-2.5 relative z-10">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black block">Ligne de Progression</span>
                  
                  <div className="relative flex items-center justify-between px-2 pt-2">
                    {/* Connecting line */}
                    <div className="absolute left-4 right-4 top-1/2 h-[3px] bg-slate-800 -translate-y-1/2 z-0" />
                    {/* Finished progress overlay line */}
                    <div 
                      className="absolute left-4 top-1/2 h-[3px] bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-500"
                      style={{ 
                        width: `${Math.max(0, Math.min(100, (activeRunner.checkpointProgress / (activeRunnerRoute.checkpoints.length - 1)) * 92))}%` 
                      }}
                    />

                    {/* Nodes representing checkpoints */}
                    {activeRunnerRoute.checkpoints.map((cp, idx) => {
                      const isCleared = idx < activeRunner.checkpointProgress;
                      const isCurrent = idx === activeRunner.checkpointProgress;
                      const isUpcoming = idx > activeRunner.checkpointProgress;
                      
                      return (
                        <div key={idx} className="relative z-10 flex flex-col items-center group">
                          <div 
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                              isCleared ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.3)]' :
                              isCurrent ? 'bg-indigo-600 border-indigo-400 text-white animate-pulse shadow-[0_0_12px_rgba(79,70,229,0.6)]' :
                              'bg-slate-900 border-slate-800 text-slate-500'
                            }`}
                            title={cp}
                          >
                            {isCleared ? '✓' : idx + 1}
                          </div>
                          <span className="text-[8px] text-slate-500 font-extrabold mt-1 uppercase tracking-tight max-w-[42px] truncate text-center">
                            {cp}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS - Big touch-friendly buttons */}
              <div className="space-y-3 pt-2">
                {activeRunner.status === 'paid' && (
                  <button
                    onClick={() => startRaceSimulation(activeRunner.id)}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 border-b-4 border-emerald-800"
                  >
                    <Play className="w-5 h-5 animate-pulse" />
                    Prendre le Départ de la Course (Live)
                  </button>
                )}

                {activeRunner.status === 'running' && (
                  <div className="grid grid-cols-1 gap-2.5">
                    <button
                      onClick={() => advanceCheckpoint(activeRunner, activeRunnerRoute)}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 border-b-4 border-indigo-800"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Franchir Checkpoint Suivant 📍
                    </button>
                    
                    <button
                      onClick={() => handleDnf(activeRunner.id)}
                      className="w-full py-2.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 rounded-xl text-[10.5px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-rose-900/40"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Abandonner la course (DNF)
                    </button>
                  </div>
                )}

                {activeRunner.status === 'completed' && (
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl text-center text-xs text-emerald-800 font-extrabold shadow-sm animate-in fade-in duration-300">
                    🏆 Félicitations ! Course terminée avec succès en {activeRunner.finalTime || "01:24:50"} !
                  </div>
                )}
                {activeRunner.status === 'dnf' && (
                  <div className="p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl text-center text-xs text-rose-800 font-extrabold shadow-sm">
                    ❌ Hors Course (Did Not Finish). Les secours sont prévenus si nécessaire.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 🎪 ORGANISATEUR / ORGANIZER COMPONENT
// ==========================================
interface OrganizerModeProps {
  routes: Route[];
  organizers: Organizer[];
  runners: Runner[];
  onRefresh: () => void;
  settings: PlatformSettings;
}

function OrganizerMode({ routes, organizers, runners, onRefresh, settings }: OrganizerModeProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string>('org-chamonix');
  const org = organizers.find(o => o.id === selectedOrgId) || organizers[0];

  // Route Creator Form State
  const [routeName, setRouteName] = useState('');
  const [routeDesc, setRouteDesc] = useState('');
  const [routeDist, setRouteDist] = useState('12');
  const [routeElev, setRouteElev] = useState('600');
  const [routeFee, setRouteFee] = useState('25');
  const [canvasPoints, setCanvasPoints] = useState<[number, number][]>([]);
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);

  // Stripe Connection Simulation
  const [stripeLoading, setStripeLoading] = useState(false);

  // GPX Import States and Logic
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin & Reset handlers
  const handleDeleteRunner = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce participant ?")) return;
    try {
      const res = await fetch('/api/runners/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert("Erreur lors de la suppression.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetRace = async () => {
    if (!confirm("Voulez-vous réinitialiser la progression et remettre tout le monde sur la ligne de départ ?")) return;
    try {
      const res = await fetch('/api/runners/reset-race', {
        method: 'POST'
      });
      if (res.ok) {
        onRefresh();
        alert("🏁 La course a été réinitialisée ! Tous les participants sont revenus au départ.");
      } else {
        alert("Erreur lors de la réinitialisation.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllRunners = async () => {
    if (!confirm("⚠️ ATTENTION : Voulez-vous supprimer tous les participants enregistrés ? Cette action est irréversible.")) return;
    try {
      const res = await fetch('/api/runners/clear-all', {
        method: 'POST'
      });
      if (res.ok) {
        onRefresh();
        alert("🗑️ Tous les participants ont été supprimés.");
      } else {
        alert("Erreur lors de la suppression collective.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllRoutes = async () => {
    if (!confirm("⚠️ ATTENTION : Voulez-vous supprimer TOUS les parcours de l'application (y compris les parcours de démo) ? Cette action est irréversible.")) return;
    try {
      const res = await fetch('/api/routes/clear-all', {
        method: 'POST'
      });
      if (res.ok) {
        onRefresh();
        alert("🗑️ Tous les parcours ont été supprimés.");
      } else {
        alert("Erreur lors de la suppression des parcours.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartAll = async () => {
    const routeIds = routes.filter(r => r.organizerId === selectedOrgId).map(r => r.id);
    const targetRunners = runners.filter(r => routeIds.includes(r.routeId));
    if (targetRunners.length === 0) {
      alert("Aucun participant inscrit à lancer.");
      return;
    }
    
    if (!confirm(`Voulez-vous donner le départ de la course pour les ${targetRunners.length} participants ?`)) return;

    try {
      await Promise.all(targetRunners.map(async (runner) => {
        await fetch('/api/runners/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: runner.id,
            status: 'running',
            checkpointProgress: 0,
            currentPositionIndex: 0,
            liveSpeed: Number((8 + Math.random() * 6).toFixed(1))
          })
        });
      }));
      onRefresh();
      alert("🟢 Le DEPART a été donné ! Tous les participants sont désormais en direct sur la carte.");
    } catch (err) {
      console.error(err);
      alert("Erreur lors du départ en masse.");
    }
  };

  // New Organizer Registration States
  const [showNewOrgForm, setShowNewOrgForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [orgCreating, setOrgCreating] = useState(false);

  const handleCreateOrganizer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setOrgCreating(true);
    try {
      const res = await fetch('/api/organizers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOrgName,
          email: newOrgEmail,
          stripeStatus: 'none',
          stripeAccountId: ''
        })
      });
      if (res.ok) {
        const data = await res.json();
        onRefresh();
        setSelectedOrgId(data.id);
        setNewOrgName('');
        setNewOrgEmail('');
        setShowNewOrgForm(false);
        alert(`🎉 Profil Organisateur "${data.name}" créé avec succès !`);
      } else {
        alert("Erreur lors de la création de l'organisateur.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création de l'organisateur.");
    } finally {
      setOrgCreating(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processGPXFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const trkpts = xmlDoc.getElementsByTagName("trkpt");
        
        if (trkpts.length === 0) {
          alert("Le fichier GPX ne contient pas de points de trace (<trkpt>).");
          return;
        }

        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;
        const rawPoints: { lat: number, lon: number, ele?: number }[] = [];

        for (let i = 0; i < trkpts.length; i++) {
          const pt = trkpts[i];
          const lat = parseFloat(pt.getAttribute("lat") || "0");
          const lon = parseFloat(pt.getAttribute("lon") || "0");
          const eleEl = pt.getElementsByTagName("ele")[0];
          const ele = eleEl ? parseFloat(eleEl.textContent || "0") : undefined;

          if (lat !== 0 && lon !== 0) {
            rawPoints.push({ lat, lon, ele });
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
          }
        }

        if (rawPoints.length === 0) {
          alert("Aucun point de coordonnées valide trouvé dans le GPX.");
          return;
        }

        const latRange = maxLat - minLat || 0.001;
        const lonRange = maxLon - minLon || 0.001;

        // Sample points to around 30 points to display cleanly on our custom SVG vector map
        const targetSamplesCount = 30;
        const step = Math.max(1, Math.floor(rawPoints.length / targetSamplesCount));
        const sampledPoints: [number, number][] = [];

        for (let i = 0; i < rawPoints.length; i += step) {
          const pt = rawPoints[i];
          const x = Math.round(15 + ((pt.lon - minLon) / lonRange) * 70);
          const y = Math.round(85 - ((pt.lat - minLat) / latRange) * 70);
          sampledPoints.push([x, y]);
        }

        // Add last point
        if (rawPoints.length > 1 && (rawPoints.length - 1) % step !== 0) {
          const lastPt = rawPoints[rawPoints.length - 1];
          const x = Math.round(15 + ((lastPt.lon - minLon) / lonRange) * 70);
          const y = Math.round(85 - ((lastPt.lat - minLat) / latRange) * 70);
          sampledPoints.push([x, y]);
        }

        // Calculate real-world metrics (distance and elevation)
        let totalDistKm = 0;
        let totalElevationGain = 0;

        const deg2rad = (deg: number) => deg * (Math.PI / 180);
        const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371; // Earth's radius
          const dLat = deg2rad(lat2 - lat1);
          const dLon = deg2rad(lon2 - lon1);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        for (let i = 1; i < rawPoints.length; i++) {
          totalDistKm += getDistanceKm(rawPoints[i - 1].lat, rawPoints[i - 1].lon, rawPoints[i].lat, rawPoints[i].lon);
          if (rawPoints[i].ele !== undefined && rawPoints[i - 1].ele !== undefined) {
            const diff = rawPoints[i].ele! - rawPoints[i - 1].ele!;
            if (diff > 0) {
              totalElevationGain += diff;
            }
          }
        }

        setCanvasPoints(sampledPoints);
        setRouteDist((Math.round(totalDistKm * 10) / 10 || 15).toString());
        setRouteElev((Math.round(totalElevationGain) || 500).toString());
        
        // Auto-extract name if available in GPX
        const nameEl = xmlDoc.getElementsByTagName("name")[0];
        if (nameEl && nameEl.textContent) {
          setRouteName(nameEl.textContent);
        } else if (file.name) {
          setRouteName(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' '));
        }

        alert(`🌍 Fichier GPX importé avec succès !\n${rawPoints.length} points analysés.\nDistance : ${Math.round(totalDistKm * 10) / 10} km\nDénivelé (D+) : ${Math.round(totalElevationGain)}m.`);
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la lecture du fichier GPX. Assurez-vous qu'il s'agit d'un fichier XML/GPX valide.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processGPXFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processGPXFile(e.target.files[0]);
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (canvasPoints.length < 2) {
      alert('Veuillez dessiner le tracé du parcours sur la carte interactive (au moins 2 points).');
      return;
    }
    setIsCreatingRoute(true);

    try {
      const defaultCheckpoints = ['Départ', 'Refuge d\'Altitude', 'Crête Panoramique', 'Arrivée'];
      await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: routeName,
          description: routeDesc,
          distance: Number(routeDist),
          elevation: Number(routeElev),
          entryFee: Number(routeFee),
          coordinates: canvasPoints,
          checkpoints: defaultCheckpoints,
          organizerId: selectedOrgId
        })
      });

      setRouteName('');
      setRouteDesc('');
      setCanvasPoints([]);
      onRefresh();
      alert('🏁 Parcours créé avec succès et publié pour les coureurs !');
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingRoute(false);
    }
  };

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    // Simulate OAuth / onboarding to Stripe
    setTimeout(async () => {
      try {
        await fetch('/api/organizers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedOrgId,
            stripeAccountId: `acct_${Math.random().toString(36).substr(2, 16)}`,
            stripeStatus: 'active'
          })
        });
        onRefresh();
        alert('🎉 Compte Stripe Connect configuré avec succès ! Splitting automatique de fonds actif.');
      } catch (err) {
        console.error(err);
      } finally {
        setStripeLoading(false);
      }
    }, 1500);
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setCanvasPoints([...canvasPoints, [x, y]]);
  };

  const clearCanvas = () => {
    setCanvasPoints([]);
  };

  // Stats calculation
  const orgRoutes = routes.filter(r => r.organizerId === selectedOrgId);
  const routeIds = orgRoutes.map(r => r.id);
  const orgRunners = runners.filter(r => routeIds.includes(r.routeId));
  const paidRunners = orgRunners.filter(r => r.status === 'paid' || r.status === 'running' || r.status === 'completed');
  
  const totalRawEarnings = paidRunners.reduce((acc, curr) => {
    const rt = routes.find(x => x.id === curr.routeId);
    return acc + (rt?.entryFee || 0);
  }, 0);

  const platformCommissionValue = totalRawEarnings * (settings.commissionPercent / 100);
  const organizerShareValue = totalRawEarnings - platformCommissionValue;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* LEFT COLUMN: Controls & Stripe */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Choisir un Organisateur :</label>
            <button 
              type="button"
              onClick={() => setShowNewOrgForm(!showNewOrgForm)}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer flex items-center gap-0.5"
            >
              {showNewOrgForm ? "Annuler" : "+ S'inscrire"}
            </button>
          </div>

          {showNewOrgForm ? (
            <form onSubmit={handleCreateOrganizer} className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 mb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">Nouveau Profil Organisateur</span>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 block">Nom du Club / Organisateur</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Club Trail Mont-Blanc"
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 block">Adresse Email de contact</label>
                <input
                  type="email"
                  required
                  placeholder="contact@monclub.com"
                  value={newOrgEmail}
                  onChange={e => setNewOrgEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={orgCreating}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                {orgCreating ? "Création..." : "Enregistrer mon profil"}
              </button>
            </form>
          ) : (
            <select
              value={selectedOrgId}
              onChange={e => setSelectedOrgId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none mb-6"
            >
              {organizers.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          )}

          <div className="space-y-4">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500">Statut Stripe Connect</h3>
            
            {org?.stripeStatus === 'active' ? (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-extrabold">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                  Compte Connecté
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                  Les fonds collectés lors de l'inscription seront automatiquement scindés : l'organisateur reçoit {100 - settings.commissionPercent}%, le créateur de la plateforme perçoit {settings.commissionPercent}% de commission.
                </p>
                <div className="text-[10px] text-slate-400 font-mono pt-1">
                  ID Stripe : {org.stripeAccountId}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-center">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Activez Stripe pour commencer à collecter de l'argent réel sur votre compte bancaire.
                </p>
                <button
                  onClick={handleConnectStripe}
                  disabled={stripeLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  {stripeLoading ? "Lancement Stripe..." : "Lier mon compte Stripe"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* STATS PANEL */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm uppercase tracking-tight text-slate-800">Bilan Financier</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[9px] font-black uppercase text-slate-400 block">Total Recettes</span>
              <span className="text-base font-black text-slate-800">{totalRawEarnings} €</span>
            </div>
            <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/40">
              <span className="text-[9px] font-black uppercase text-indigo-400 block">Net Organisateur</span>
              <span className="text-base font-black text-indigo-600">{organizerShareValue.toFixed(2)} €</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-100/50 rounded-2xl">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Commission Plateforme ({settings.commissionPercent}%) :</span>
              <strong className="text-slate-800 font-bold">{platformCommissionValue.toFixed(2)} €</strong>
            </div>
          </div>
        </div>

        {/* ADMIN & RESET PANEL */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-indigo-600 animate-spin-slow" />
              Console d'Administration
            </h3>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-100">
              Plan Gratuit ➔ Max 10
            </span>
          </div>

          <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">Participants inscrits :</span>
              <strong className="text-slate-800 font-black">{orgRunners.length} / 10</strong>
            </div>
            
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, (orgRunners.length / 10) * 100)}%` }}
              />
            </div>
          </div>

          {/* Quick Admin Actions */}
          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={handleStartAll}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Play className="w-4 h-4" />
              Donner le départ en Masse
            </button>

            <button
              onClick={handleResetRace}
              className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-amber-200"
            >
              <RefreshCw className="w-4 h-4" />
              Réinitialiser la Course
            </button>

            <button
              onClick={handleClearAllRunners}
              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200"
            >
              <Trash className="w-4 h-4" />
              Supprimer tous les participants
            </button>

            <button
              onClick={handleClearAllRoutes}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <Trash className="w-4 h-4 text-slate-400 animate-pulse" />
              Supprimer tous les parcours de démo
            </button>
          </div>

          {/* Individual deletion list */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Gestion Individuelle des Noms
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {orgRunners.map(r => (
                <div key={r.id} className="flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors px-3 py-2 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{r.type === 'cavalier' ? '🐎' : r.type === 'vtt' ? '🚲' : '🏃'}</span>
                    <span className="font-extrabold text-slate-700">{r.name}</span>
                    <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-1 rounded">D. {r.bibNumber}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteRunner(r.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                    title="Supprimer ce nom de la liste"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {orgRunners.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400 font-medium">
                  Aucun participant inscrit.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Route Creator SVG Grid Drawer */}
      <div className="lg:col-span-8 space-y-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-black tracking-tight uppercase text-slate-800">Créateur de Tracé Interactive</h2>
            </div>
            {canvasPoints.length > 0 && (
              <button
                onClick={clearCanvas}
                className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-600 tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5" />
                Effacer
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Form details */}
            <form onSubmit={handleCreateRoute} className="md:col-span-5 space-y-3.5">
              {/* GPX Drag and Drop Zone */}
              <div 
                className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer ${
                  dragActive 
                    ? "border-indigo-600 bg-indigo-50/40" 
                    : "border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept=".gpx"
                  onChange={handleFileChange}
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <Upload className={`w-6 h-6 ${dragActive ? "text-indigo-600 animate-bounce" : "text-slate-400"}`} />
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Importer un tracé GPX (.gpx)
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium leading-normal block max-w-[180px] mx-auto mt-0.5">
                      Glissez-déposez ou cliquez pour charger votre fichier réel
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nom du Parcours</label>
                <input
                  type="text"
                  required
                  placeholder="La Traversée Rose"
                  value={routeName}
                  onChange={e => setRouteName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Une boucle somptueuse..."
                  value={routeDesc}
                  onChange={e => setRouteDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dist. (km)</label>
                  <input
                    type="number"
                    required
                    value={routeDist}
                    onChange={e => setRouteDist(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">D+ (m)</label>
                  <input
                    type="number"
                    required
                    value={routeElev}
                    onChange={e => setRouteElev(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tarif (€)</label>
                  <input
                    type="number"
                    required
                    value={routeFee}
                    onChange={e => setRouteFee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreatingRoute || canvasPoints.length < 2}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  Publier le Parcours
                </button>
              </div>
            </form>

            {/* Drawing Canvas */}
            <div className="md:col-span-7 space-y-2">
              <div className="text-[10px] text-slate-500 font-bold mb-1">
                👉 Cliquez n'importe où sur la grille ci-dessous pour dessiner les points cardinaux du tracé :
              </div>
              
              <div className="relative aspect-video w-full bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden cursor-crosshair group shadow-inner">
                {/* Grid Lines Overlay */}
                <div className="absolute inset-0 grid grid-cols-10 grid-rows-6 pointer-events-none opacity-10">
                  {Array.from({ length: 60 }).map((_, i) => (
                    <div key={i} className="border-t border-l border-white w-full h-full" />
                  ))}
                </div>

                <svg 
                  className="w-full h-full absolute inset-0"
                  onClick={handleCanvasClick}
                >
                  {/* Draw connected path lines */}
                  {canvasPoints.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={canvasPoints.map(p => `${p[0]}%,${p[1]}%`).join(' ')}
                    />
                  )}

                  {/* Draw points */}
                  {canvasPoints.map((point, idx) => {
                    const isStart = idx === 0;
                    const isEnd = idx === canvasPoints.length - 1;
                    return (
                      <g key={idx}>
                        <circle
                          cx={`${point[0]}%`}
                          cy={`${point[1]}%`}
                          r={isStart || isEnd ? "6" : "4.5"}
                          fill={isStart ? "#10b981" : isEnd ? "#f43f5e" : "#818cf8"}
                          className="transition-all hover:scale-125"
                        />
                        <text
                          x={`${point[0]}%`}
                          y={`${point[1] - 4}%`}
                          fill="white"
                          fontSize="8"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="pointer-events-none select-none drop-shadow-md"
                        >
                          {isStart ? 'Dép' : isEnd ? 'Arr' : `#${idx}`}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {canvasPoints.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 pointer-events-none uppercase font-black tracking-wider animate-pulse">
                    Tracez votre parcours ici...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 📣 SPECTATEUR / SPECTATOR COMPONENT
// ==========================================
interface SpectatorModeProps {
  routes: Route[];
  runners: Runner[];
  onRefresh: () => void;
}

function SpectatorMode({ routes, runners, onRefresh }: SpectatorModeProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(routes[0]?.id || '');
  const [filterType, setFilterType] = useState<'all' | 'coureur' | 'vtt' | 'cavalier'>('all');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const activeRoute = routes.find(r => r.id === selectedRouteId);
  
  const routeRunners = runners.filter(r => r.routeId === selectedRouteId);
  const filteredRunners = routeRunners.filter(r => {
    if (filterType === 'all') return true;
    return r.type === filterType;
  });
  const runningCount = routeRunners.filter(r => r.status === 'running').length;
  const completedCount = routeRunners.filter(r => r.status === 'completed').length;

  const [cheerSuccessMsg, setCheerSuccessMsg] = useState('');

  const sendCheer = (runnerName: string) => {
    setCheerSuccessMsg(`❤️ Encouragement envoyé à ${runnerName} !`);
    setTimeout(() => setCheerSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-8">
      {/* SELECTION BAR */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-800 uppercase">Suivi Live Spectateur</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">Visualisez les positions des coureurs et le classement en direct.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-[10px] font-black uppercase text-slate-400 whitespace-nowrap">Parcours :</label>
          <select
            value={selectedRouteId}
            onChange={e => setSelectedRouteId(e.target.value)}
            className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
          >
            {routes.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.distance} km)</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* INTERACTIVE TRACK MAP */}
        <div className="lg:col-span-7 bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-850 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <h3 className="font-extrabold text-sm uppercase text-slate-300 tracking-tight flex items-center gap-2">
              <Map className="w-4.5 h-4.5 text-indigo-400" />
              Carte Interactive en Temps Réel
            </h3>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold justify-between sm:justify-start">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                {runningCount} en course
              </span>
              <span>•</span>
              <span>{completedCount} terminés</span>
              <span>•</span>
              <button
                onClick={() => setIsMapExpanded(!isMapExpanded)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all border border-slate-700 active:scale-95"
                title="Agrandir ou réduire la carte"
              >
                <Maximize2 className="w-3 h-3 text-indigo-400" />
                {isMapExpanded ? "Réduire" : "Plein écran"}
              </button>
            </div>
          </div>

          <div className={`relative w-full bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden shadow-inner transition-all duration-300 ${
            isMapExpanded ? 'h-[460px]' : 'aspect-video min-h-[220px]'
          }`}>
            <svg className="w-full h-full absolute inset-0">
              {/* Draw static track coordinate line */}
              {activeRoute && activeRoute.coordinates.length > 0 && (
                <polyline
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={activeRoute.coordinates.map(p => `${p[0]}%,${p[1]}%`).join(' ')}
                />
              )}

              {/* Draw checkpoints icons/labels */}
              {activeRoute?.coordinates.map((coord, idx) => {
                const isStart = idx === 0;
                const isEnd = idx === activeRoute.coordinates.length - 1;
                if (!isStart && !isEnd && idx % 3 !== 0) return null; // limit checkpoint labels
                
                return (
                  <g key={idx}>
                    <circle
                      cx={`${coord[0]}%`}
                      cy={`${coord[1]}%`}
                      r="4.5"
                      fill={isStart ? "#10b981" : isEnd ? "#f43f5e" : "#4b5563"}
                    />
                    <text
                      x={`${coord[0]}%`}
                      y={`${coord[1] - 4}%`}
                      fill="#9ca3af"
                      fontSize="7"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {isStart ? 'Départ' : isEnd ? 'Arrivée' : `CP${idx}`}
                    </text>
                  </g>
                );
              })}

              {/* Draw active runners as dynamic dots */}
              {filteredRunners
                .filter(runner => runner.status === 'running')
                .map(runner => {
                  const currentIdx = runner.currentPositionIndex ?? 0;
                  const coord = activeRoute?.coordinates[currentIdx];
                  if (!coord) return null;

                  return (
                    <g key={runner.id}>
                      {/* Pulse ring with colors matching the type */}
                      <circle
                        cx={`${coord[0]}%`}
                        cy={`${coord[1]}%`}
                        r="12"
                        fill={
                          runner.type === 'cavalier' 
                            ? "rgba(217, 70, 239, 0.4)" 
                            : runner.type === 'vtt' 
                            ? "rgba(16, 185, 129, 0.4)" 
                            : "rgba(59, 130, 246, 0.4)"
                        }
                        className="animate-ping"
                      />
                      {/* Solid backing dot */}
                      <circle
                        cx={`${coord[0]}%`}
                        cy={`${coord[1]}%`}
                        r="9"
                        fill="#0f172a"
                        stroke={
                          runner.type === 'cavalier' 
                            ? "#d946ef" 
                            : runner.type === 'vtt' 
                            ? "#10b981" 
                            : "#3b82f6"
                        }
                        strokeWidth="1.5"
                      />
                      {/* Emoji centered */}
                      <text
                        x={`${coord[0]}%`}
                        y={`${coord[1] + 1}%`}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {runner.type === 'cavalier' ? '🐎' : runner.type === 'vtt' ? '🚲' : '🏃'}
                      </text>
                      {/* Name tag */}
                      <text
                        x={`${coord[0]}%`}
                        y={`${coord[1] - 11}%`}
                        fill="#f3f4f6"
                        fontSize="8.5"
                        fontWeight="black"
                        textAnchor="middle"
                        className="drop-shadow-lg"
                      >
                        N°{runner.bibNumber} {runner.name.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
            </svg>
          </div>
        </div>

        {/* CLASSEMENT LIVE LEADERBOARD */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-1.5">
            <h3 className="font-extrabold text-sm uppercase text-slate-800 tracking-tight flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-indigo-600" />
              Classement & Dossards
            </h3>
            
            {/* Quick Filters for mobile/desktop */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
              {(['all', 'coureur', 'vtt', 'cavalier'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all ${
                    filterType === f 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all' ? '🌐 Tous' : f === 'coureur' ? '🏃 Coureurs' : f === 'vtt' ? '🚲 VTT' : '🐎 Cavaliers'}
                </button>
              ))}
            </div>
          </div>

          {cheerSuccessMsg && (
            <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-100 text-[11px] font-bold text-center animate-bounce">
              {cheerSuccessMsg}
            </div>
          )}

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
            {filteredRunners.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-bold uppercase">
                Aucun inscrit dans cette catégorie.
              </div>
            ) : (
              [...filteredRunners]
                .sort((a, b) => {
                  // completed first, then running, then paid
                  const score = { 'completed': 3, 'running': 2, 'paid': 1, 'checked_in': 1, 'pending': 0, 'dnf': -1 };
                  const scoreA = score[a.status] || 0;
                  const scoreB = score[b.status] || 0;
                  if (scoreA !== scoreB) return scoreB - scoreA;
                  return (b.checkpointProgress || 0) - (a.checkpointProgress || 0);
                })
                .map((r, index) => (
                  <div key={r.id} className="py-3 flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-400 w-5">#{index + 1}</span>
                        <span className="text-[14px]" title={r.type === 'cavalier' ? 'Cavalier' : r.type === 'vtt' ? 'VTT' : 'Coureur'}>
                          {r.type === 'cavalier' ? '🐎' : r.type === 'vtt' ? '🚲' : '🏃'}
                        </span>
                        <span className="font-black text-slate-800">{r.name}</span>
                        <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                          Dossard {r.bibNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold">
                        <span className="capitalize">{r.status === 'running' ? '🏃‍♂️ En Course' : r.status === 'completed' ? '🏆 Terminé' : r.status === 'dnf' ? '❌ Abandon' : '⏱️ Prêt'}</span>
                        {r.status === 'running' && <span>Vitesse : {r.liveSpeed || 0} km/h</span>}
                        {r.status === 'completed' && <span>Temps final : {r.finalTime || '02:14:35'}</span>}
                      </div>
                    </div>

                    {r.status === 'running' && (
                      <button
                        onClick={() => sendCheer(r.name)}
                        className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Heart className="w-3.5 h-3.5 fill-rose-600 animate-pulse" />
                        Encourager
                      </button>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 🛡️ CRÉATEUR / PLATFORM OWNER COMPONENT
// ==========================================
interface CreatorModeProps {
  routes: Route[];
  transactions: Transaction[];
  settings: PlatformSettings;
  onRefresh: () => void;
}

function CreatorMode({ routes, transactions, settings, onRefresh }: CreatorModeProps) {
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('ultimate_trail_creator_unlocked') === 'true';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Local settings update states
  const [commission, setCommission] = useState(settings.commissionPercent);
  const [stripeAccountId, setStripeAccountId] = useState(settings.creatorStripeAccountId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCommission(settings.commissionPercent);
    setStripeAccountId(settings.creatorStripeAccountId);
  }, [settings]);

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin' || password === 'ultimate' || password === 'creator2026') {
      setIsUnlocked(true);
      sessionStorage.setItem('ultimate_trail_creator_unlocked', 'true');
      setPasswordError('');
    } else {
      setPasswordError('❌ Mot de passe incorrect.');
    }
  };

  const handleLockDashboard = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('ultimate_trail_creator_unlocked');
    setPassword('');
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetch('/api/stripe/platform-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commissionPercent: Number(commission),
          creatorStripeAccountId: stripeAccountId
        })
      });
      onRefresh();
      alert('⚙️ Configuration globale mise à jour avec succès.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations
  const totalRawVolume = transactions.reduce((acc, t) => acc + t.amount, 0);
  const totalPlatformCommissions = transactions.reduce((acc, t) => acc + t.platformFeePaid, 0);
  const totalOrganizerPayouts = transactions.reduce((acc, t) => acc + t.organizerShare, 0);

  // Lock Screen Rendering
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 animate-in fade-in zoom-in duration-300">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-indigo-500 to-indigo-700" />
          
          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm animate-pulse">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase font-sans">
              Espace Créateur Sécurisé
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Ce tableau de bord contient des informations financières de la plateforme. Saisissez le code d'accès créateur pour continuer.
            </p>
          </div>

          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Mot de Passe Créateur :
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Entrez le mot de passe..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-10 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-[10.5px] text-rose-500 font-bold mt-1 text-center">
                  {passwordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Déverrouiller l'Espace</span>
            </button>
          </form>

          <div className="bg-amber-50/65 border border-dashed border-amber-200 rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-600 font-sans leading-relaxed">
              💡 Astuce Démo : Le mot de passe par défaut est <strong className="text-amber-700 font-black">admin</strong> ou <strong className="text-amber-700 font-black">creator2026</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Chart data format
  const chartData = transactions.map(tx => ({
    name: new Date(tx.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    recettes: tx.amount,
    commission: tx.platformFeePaid
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER ROW */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-slate-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm animate-bounce">
              PROFIL CRÉATEUR
            </span>
            <span className="text-xs font-mono text-indigo-200 uppercase tracking-widest">Monétisation Intégrée</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight leading-none">Supervision Générale de la Plateforme</h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed font-medium">
            En tant que concepteur de la plateforme, Stripe Connect splitte automatiquement les paiements : votre commission de service de {settings.commissionPercent}% est déposée directement sur votre compte créateur, le reste étant envoyé à l'organisateur.
          </p>
        </div>

        <button
          onClick={handleLockDashboard}
          className="flex-shrink-0 bg-white/10 hover:bg-white/20 text-white hover:text-amber-300 border border-white/20 hover:border-white/40 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Lock className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>Verrouiller</span>
        </button>
      </div>

      {/* METRIC CARD BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-1.5">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Volume Brut Transigé</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{totalRawVolume.toFixed(2)} €</span>
            <span className="text-xs text-emerald-600 font-bold">100% Split</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-1.5">
          <span className="text-[10px] font-black uppercase text-indigo-500 block">Commissions Créateur ({settings.commissionPercent}%)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600">{totalPlatformCommissions.toFixed(2)} €</span>
            <span className="text-xs text-indigo-400 font-semibold">Net Direct</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-1.5">
          <span className="text-[10px] font-black uppercase text-slate-400 block">Reversements Organisateurs ({100 - settings.commissionPercent}%)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{totalOrganizerPayouts.toFixed(2)} €</span>
            <span className="text-xs text-slate-400 font-semibold">Automatique</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* SETTINGS PANEL */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="font-extrabold text-sm uppercase text-slate-800 tracking-tight flex items-center gap-2">
            <Settings className="w-4.5 h-4.5 text-indigo-600" />
            Paramètres Généraux
          </h3>

          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Commission de Service (%)</label>
                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{commission}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={commission}
                onChange={e => setCommission(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 leading-normal font-medium">
                Cette commission est prélevée en temps réel au moment du paiement via Stripe Connect sur chaque inscription.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">ID Compte Bancaire Stripe Créateur (Destinataire)</label>
              <input
                type="text"
                required
                value={stripeAccountId}
                onChange={e => setStripeAccountId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Sauvegarder les Paramètres
            </button>
          </form>
        </div>

        {/* ANALYTICS CHARTS & LOGS */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm uppercase text-slate-800 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-indigo-600" />
              Courbe des Flux de Paiement (EUR)
            </h3>

            {transactions.length > 0 ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRecettes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="recettes" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRecettes)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400 font-bold uppercase">
                En attente de transactions Stripe...
              </div>
            )}
          </div>

          {/* TRANSACTION LEDGER */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm uppercase text-slate-800 tracking-tight flex items-center gap-2">
              <Coins className="w-4.5 h-4.5 text-indigo-600" />
              Journal des Enregistrements & Transactions Stripe
            </h3>

            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {transactions.map(tx => (
                <div key={tx.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <strong className="text-slate-800 font-black">{tx.runnerName}</strong>
                      <span className="text-slate-400 font-semibold">({tx.routeName})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Session : {tx.stripeSessionId} • {new Date(tx.timestamp).toLocaleString('fr-FR')}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-slate-800 block">{tx.amount} €</span>
                    <span className="text-[10px] text-indigo-600 font-bold">Comm: {tx.platformFeePaid} €</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
