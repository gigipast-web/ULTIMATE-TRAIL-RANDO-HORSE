import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { RouteData, Runner } from '../types';
import { 
  Sparkles, 
  CircleDollarSign, 
  TrendingUp, 
  Percent, 
  Settings, 
  Users, 
  ArrowRightLeft, 
  HelpCircle, 
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Coins,
  ShieldCheck,
  CreditCard,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from 'lucide-react';

interface CreatorDashboardProps {
  routes: RouteData[];
  lang?: 'fr' | 'en';
}

interface TransactionItem {
  id: string;
  runnerName: string;
  routeName: string;
  routeId: string;
  entryFeePaid: number;
  platformFeePaid: number;
  paidAt?: string;
  bibNumber: string;
}

export default function CreatorDashboard({ routes, lang = 'fr' }: CreatorDashboardProps) {
  const isFr = lang === 'fr';

  // Password Lock state
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('ultimate_trail_creator_unlocked') === 'true';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin' || password === 'ultimate' || password === 'creator2026') {
      setIsUnlocked(true);
      sessionStorage.setItem('ultimate_trail_creator_unlocked', 'true');
      setPasswordError('');
    } else {
      setPasswordError(isFr ? "❌ Mot de passe incorrect." : "❌ Incorrect password.");
    }
  };

  const handleLockDashboard = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('ultimate_trail_creator_unlocked');
    setPassword('');
  };

  // State for platform settings
  const [commissionPercent, setCommissionPercent] = useState<number>(5);
  const [creatorStripeAccountId, setCreatorStripeAccountId] = useState<string>('acct_platform_creator_123');
  const [simulationBalance, setSimulationBalance] = useState<number>(0);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState<boolean>(false);
  const [settingsSuccess, setSettingsSuccess] = useState<boolean>(false);

  // Consolidated transactions from all routes
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState<boolean>(true);

  // Fetch settings from server on mount
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/stripe/platform-settings');
      if (res.ok) {
        const data = await res.json();
        setCommissionPercent(data.commissionPercent ?? 5);
        setCreatorStripeAccountId(data.creatorStripeAccountId ?? 'acct_platform_creator_123');
        setSimulationBalance(data.simulationBalance ?? 0);
      }
    } catch (err) {
      console.error("Failed to load platform settings from server:", err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Sync / Listen to paid runners across ALL loaded routes
  useEffect(() => {
    if (routes.length === 0) {
      setIsLoadingTx(false);
      return;
    }

    setIsLoadingTx(true);
    const unsubscribes: (() => void)[] = [];
    const routeTxMap = new Map<string, TransactionItem[]>();

    routes.forEach(route => {
      const runnersRef = collection(db, 'routes', route.id, 'runners');
      const q = query(runnersRef, where('paymentStatus', '==', 'paid'));

      const unsub = onSnapshot(q, (snapshot) => {
        const txs: TransactionItem[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const entryFee = Number(data.entryFeePaid) || route.entryFee || 0;
          // Calculate platform fee paid based on current or saved commission
          const calculatedPlatformFee = data.platformFeePaid ?? (entryFee * (commissionPercent / 100));

          txs.push({
            id: docSnap.id,
            runnerName: data.name || 'Coureur Anonyme',
            routeName: route.name,
            routeId: route.id,
            entryFeePaid: entryFee,
            platformFeePaid: Number(calculatedPlatformFee.toFixed(2)),
            paidAt: data.paidAt || new Date().toISOString(),
            bibNumber: data.bibNumber || '000'
          });
        });

        routeTxMap.set(route.id, txs);

        // Flatten all transactions and sort by date descending
        const allTxs = Array.from(routeTxMap.values()).flat();
        allTxs.sort((a, b) => {
          const dateA = new Date(a.paidAt || 0).getTime();
          const dateB = new Date(b.paidAt || 0).getTime();
          return dateB - dateA;
        });

        setTransactions(allTxs);
        setIsLoadingTx(false);
      }, (error) => {
        console.error(`Error syncing transactions for route ${route.id}:`, error);
      });

      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [routes, commissionPercent]);

  // Handle saving settings to server (which retains them in memory and applies to new checkout sessions)
  const handleSaveSettings = async () => {
    setIsUpdatingSettings(true);
    setSettingsSuccess(false);
    try {
      // 1. Update server in-memory settings
      const res = await fetch('/api/stripe/platform-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commissionPercent,
          creatorStripeAccountId
        })
      });

      if (!res.ok) throw new Error("Server rejected settings save");

      // 2. Also save to Firestore under platform/settings for durability
      await setDoc(doc(db, 'platform', 'settings'), {
        commissionPercent,
        creatorStripeAccountId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save platform settings:", err);
      alert(isFr ? "Erreur lors de la mise à jour des paramètres" : "Error saving settings");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Simulate a random new checkout session to watch the earnings dashboard grow!
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  const handleSimulatePayment = async () => {
    if (routes.length === 0) {
      alert(isFr ? "Veuillez créer au moins un parcours avec des frais d'inscription." : "Please create at least one route with entry fees.");
      return;
    }
    
    // Find a route with entry fees or pick the first one and temporarily assign some fee
    const validRoutes = routes.filter(r => r.entryFee && r.entryFee > 0);
    const targetRoute = validRoutes.length > 0 ? validRoutes[Math.floor(Math.random() * validRoutes.length)] : routes[0];
    const fee = targetRoute.entryFee || 15;

    setSimulatingPayment(true);
    try {
      const mockRunnerId = 'sim_runner_' + Math.random().toString(36).substring(2, 7);
      const mockRunnerName = ["Thomas Durand", "Marie Dubois", "Lucas Martin", "Chloé Bernard", "Nicolas Petit"][Math.floor(Math.random() * 5)];
      
      // Call mock checkout API to simulate real routing
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: targetRoute.id,
          routeName: targetRoute.name,
          entryFee: fee,
          connectedAccountId: 'acct_sim_mock_organizer',
          runnerId: mockRunnerId,
          runnerName: mockRunnerName
        })
      });

      if (!response.ok) throw new Error("Simulation failed");
      const data = await response.json();

      // Trigger the checkout success callback URL locally to update Firestore automatically!
      const callbackRes = await fetch(`/api/stripe/simulate-payout-success?routeId=${targetRoute.id}&runnerId=${mockRunnerId}&amount=${fee}&runnerName=${encodeURIComponent(mockRunnerName)}`);
      if (callbackRes.ok) {
        await fetchSettings(); // refresh balance
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulatingPayment(false);
    }
  };

  // Metrics calculations
  const totalVolume = transactions.reduce((acc, curr) => acc + curr.entryFeePaid, 0);
  const platformCommissionsReal = transactions.reduce((acc, curr) => acc + curr.platformFeePaid, 0);
  const totalEarnings = platformCommissionsReal + simulationBalance;

  // Lock Screen Rendering
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 animate-in fade-in zoom-in duration-300">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-indigo-500 to-indigo-700" />
          
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-sm animate-pulse">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase font-sans">
              {isFr ? "Espace Créateur Sécurisé" : "Secure Creator Area"}
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {isFr 
                ? "Ce tableau de bord contient des informations financières de la plateforme. Saisissez le code d'accès créateur pour continuer."
                : "This dashboard contains platform financial logs. Please enter the creator passcode to proceed."}
            </p>
          </div>

          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                {isFr ? "Mot de Passe Créateur :" : "Creator Password:"}
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
                  placeholder={isFr ? "Entrez le mot de passe..." : "Enter passcode..."}
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
              <span>{isFr ? "Déverrouiller" : "Unlock Dashboard"}</span>
            </button>
          </form>

          <div className="bg-amber-50/65 border border-dashed border-amber-200 rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-600 font-sans leading-relaxed">
              💡 {isFr 
                ? <span>Astuce Démo : Le mot de passe par défaut est <strong className="text-amber-700 font-black">admin</strong> ou <strong className="text-amber-700 font-black">creator2026</strong></span>
                : <span>Demo Tip: The default password is <strong className="text-amber-700 font-black">admin</strong> or <strong className="text-amber-700 font-black">creator2026</strong></span>}
            </p>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* --- BANNER HEADER --- */}
      <div className="bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-y-1/4 translate-x-1/6 pointer-events-none">
          <Sparkles className="w-96 h-96" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm animate-bounce">
                PROFIL CRÉATEUR
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse" />
              <span className="text-xs font-mono text-indigo-100 uppercase tracking-widest">
                Monétisation Intégrée
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight leading-none">
              {isFr ? "Comment vous gagnez de l'argent" : "How you make money"}
            </h2>
            <p className="text-xs text-indigo-100 max-w-2xl leading-relaxed font-medium">
              {isFr 
                ? "En tant que créateur de l'application, vous percevez une commission automatique sur chaque inscription payée par les coureurs. Stripe Connect splitte automatiquement les fonds : la commission vous est versée, et le reste va à l'organisateur."
                : "As the app creator, you collect an automatic commission on every paid entry. Stripe Connect splits funds automatically: you get your platform fee deposited, and the organizer receives the rest."}
            </p>
          </div>

          <button
            onClick={handleLockDashboard}
            className="flex-shrink-0 bg-white/10 hover:bg-white/20 text-white hover:text-amber-300 border border-white/20 hover:border-white/40 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Lock className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>{isFr ? "Verrouiller" : "Lock Dashboard"}</span>
          </button>
        </div>
      </div>

      {/* --- BENTO-GRID METRICS --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Commissions */}
        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1.5 bg-amber-50 rounded-bl-xl border-l border-b border-amber-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-600">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {isFr ? "Vos Gains Totaux" : "Your Total Earnings"}
            </span>
            <span className="text-lg font-mono font-black text-slate-800 block">
              {totalEarnings.toFixed(2)} €
            </span>
            <span className="text-[9px] text-amber-600 font-bold block mt-0.5">
              {platformCommissionsReal.toFixed(2)}€ réels + {simulationBalance.toFixed(2)}€ simulés
            </span>
          </div>
        </div>

        {/* Metric 2: Total volume transacted */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {isFr ? "Volume d'Affaires" : "Total Volume Transacted"}
            </span>
            <span className="text-lg font-mono font-black text-slate-800 block">
              {totalVolume.toFixed(2)} €
            </span>
            <span className="text-[9px] text-slate-500 block">
              {isFr ? "Flux financier total traité" : "Total financial flow processed"}
            </span>
          </div>
        </div>

        {/* Metric 3: Total Registrations */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {isFr ? "Inscriptions Payées" : "Paid Registrations"}
            </span>
            <span className="text-lg font-mono font-black text-slate-800 block">
              {transactions.length}
            </span>
            <span className="text-[9px] text-slate-500 block">
              {isFr ? "Transactions individuelles" : "Individual transactions"}
            </span>
          </div>
        </div>

        {/* Metric 4: Platform Commission Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {isFr ? "Taux de Commission" : "Commission Rate"}
            </span>
            <span className="text-lg font-mono font-black text-emerald-600 block">
              {commissionPercent} %
            </span>
            <span className="text-[9px] text-slate-500 block">
              {isFr ? "Configurable en temps réel" : "Configurable in real-time"}
            </span>
          </div>
        </div>

      </div>

      {/* --- CORE SPLIT VIEW --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Creator Configuration Settings */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-black tracking-wide uppercase text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Settings className="w-4 h-4 text-indigo-600" />
            {isFr ? "Paramètres de votre Plateforme" : "Your Platform Settings"}
          </h3>

          {/* Config: Stripe Creator ID */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              {isFr ? "Votre compte Stripe Connect (Plateforme) :" : "Your Platform Stripe Account ID:"}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">ID</span>
              <input
                type="text"
                value={creatorStripeAccountId}
                onChange={(e) => setCreatorStripeAccountId(e.target.value)}
                placeholder="acct_xxxxxxxx"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3.5 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <p className="text-[9px] text-slate-450 leading-relaxed font-sans">
              {isFr 
                ? "L'identifiant Stripe de la plateforme où seront reversés les frais de service cumulés."
                : "The master Stripe account of your platform to collect all accumulated application service fees."}
            </p>
          </div>

          {/* Config: Commission Rate Slider */}
          <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {isFr ? "Frais de Commission d'Application :" : "Application Commission Fee:"}
              </span>
              <span className="font-mono text-sm font-black text-indigo-600">
                {commissionPercent} %
              </span>
            </div>
            
            <input
              type="range"
              min="1"
              max="25"
              step="1"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />

            <div className="flex justify-between text-[8.5px] font-mono text-slate-400 font-bold">
              <span>1% (Minimum)</span>
              <span>10%</span>
              <span>25% (Maximum)</span>
            </div>

            <p className="text-[9px] text-slate-500 font-sans leading-relaxed mt-1">
              {isFr
                ? "Modifiez le curseur pour fixer votre commission. Les nouveaux formulaires d'inscriptions utiliseront instantanément ce taux."
                : "Adjust the slider to set your custom platform cut. New registrations will pay this exact fee percentage instantly."}
            </p>
          </div>

          {/* Button: Save Settings */}
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isUpdatingSettings}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow disabled:opacity-50"
          >
            {isUpdatingSettings ? (
              <RefreshCw className="w-4 h-4 text-white animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-white" />
            )}
            <span>
              {isUpdatingSettings ? (isFr ? "Sauvegarde..." : "Saving...") : (isFr ? "Enregistrer les Paramètres" : "Save Platform Settings")}
            </span>
          </button>

          {settingsSuccess && (
            <p className="text-[10px] text-emerald-600 font-extrabold text-center animate-bounce">
              ✓ {isFr ? "Paramètres enregistrés et appliqués sur le serveur !" : "Settings saved and loaded successfully on the server!"}
            </p>
          )}

          {/* SIMULATOR TOOLBOX */}
          <div className="border border-dashed border-slate-250 rounded-xl p-4 bg-slate-50/50 space-y-3.5">
            <h4 className="text-[11px] font-black uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-550" />
              {isFr ? "Bac à sable de Simulation" : "Simulation Sandbox"}
            </h4>
            <p className="text-[10.5px] text-slate-500 font-sans leading-relaxed">
              {isFr 
                ? "Vous n'avez pas de clés Stripe réelles configurées ? Aucun problème ! Vous pouvez simuler instantanément une inscription payante pour voir votre tableau de bord s'actualiser."
                : "No real Stripe API keys configured? No worries! Simulate a competitor paying registration fees to watch your earnings grow instantly."}
            </p>

            <button
              type="button"
              onClick={handleSimulatePayment}
              disabled={simulatingPayment}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-800 shadow cursor-pointer disabled:opacity-50"
            >
              {simulatingPayment ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>
                {simulatingPayment ? (isFr ? "Simulation..." : "Simulating...") : (isFr ? "Simuler une inscription payante" : "Simulate a paid registration")}
              </span>
            </button>
          </div>

        </div>

        {/* Right Column: Transactions & Revenue Splits */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-black tracking-wide uppercase text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
            {isFr ? "Transactions & Répartition Financière" : "Real-time Transactions & Fee Splits"}
          </h3>

          {isLoadingTx ? (
            <div className="py-20 text-center text-slate-400 text-xs font-mono flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <span>{isFr ? "Synchronisation des transactions..." : "Syncing transaction feeds..."}</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-14 text-center border border-dashed border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                {isFr ? "Aucune Transaction Répertoriée" : "No Transactions Recorded Yet"}
              </h4>
              <p className="text-[10px] text-slate-450 max-w-xs mx-auto leading-normal">
                {isFr 
                  ? "Les transactions s'afficheront ici en temps réel dès qu'un coureur s'inscrira sur un parcours payant."
                  : "Paid competitor registrations will display here in real-time as they register on custom-priced routes."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-450 font-black">
                    <th className="py-2.5 font-sans">{isFr ? "Date / Coureur" : "Date / Runner"}</th>
                    <th className="py-2.5 font-sans">{isFr ? "Parcours" : "Route"}</th>
                    <th className="py-2.5 text-right font-sans">{isFr ? "Total" : "Total"}</th>
                    <th className="py-2.5 text-right font-sans text-indigo-600">{isFr ? "Part Org." : "Org. Part"}</th>
                    <th className="py-2.5 text-right font-sans text-amber-600">{isFr ? "Votre Cut" : "Your Cut"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {transactions.map((tx, idx) => {
                    const orgPart = tx.entryFeePaid - tx.platformFeePaid;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors font-sans">
                        <td className="py-2.5">
                          <span className="font-bold text-slate-750 block">{tx.runnerName}</span>
                          <span className="text-[9px] font-mono text-slate-400">
                            Dossard {tx.bibNumber} • {new Date(tx.paidAt || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-2.5 max-w-[120px] truncate">
                          <span className="font-semibold text-slate-650">{tx.routeName}</span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-black text-slate-800">
                          {tx.entryFeePaid.toFixed(2)} €
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-indigo-650">
                          {orgPart.toFixed(2)} €
                        </td>
                        <td className="py-2.5 text-right font-mono font-black text-amber-650 bg-amber-50/15">
                          +{tx.platformFeePaid.toFixed(2)} €
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* SECURE GUARANTEES */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
            <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-650" />
              {isFr ? "Flux Sécurisés par Stripe Connect Direct" : "Secured by Stripe Connect Direct Charges"}
            </h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
              {isFr
                ? "Toutes les transactions transitent via Stripe Connect Direct. Vos commissions de plateforme sont directement collectées et transférées sur votre compte Stripe de manière irrévocable, garantissant des versements automatisés sans risques."
                : "All payments are processed via Stripe Connect Direct Charges. Your platform commissions are securely split during the authorization flow, completely bypassing manual handling."}
            </p>
          </div>

        </div>

      </div>

      {/* --- INFOGRAPHIC FAQ --- */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row gap-5 items-center">
        <HelpCircle className="w-12 h-12 text-indigo-500 flex-shrink-0" />
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-850">
            {isFr ? "Comment configurer les clés d'API Stripe Réelles ?" : "How to configure real Stripe API keys?"}
          </h4>
          <p className="text-[10.5px] text-slate-500 leading-normal font-sans">
            {isFr
              ? "Pour passer en production avec de vraies cartes bancaires, renseignez simplement vos variables d'environnement STRIPE_SECRET_KEY et STRIPE_PUBLISHABLE_KEY dans les réglages de votre espace AI Studio. L'application basculera automatiquement du mode simulé sans fil au mode réel sécurisé."
              : "To go live with real credit cards, simply define your STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY environment variables in your AI Studio workspace settings. The applet will seamlessly transition from demo modes to secure live payments."}
          </p>
        </div>
      </div>

    </div>
  );
}
