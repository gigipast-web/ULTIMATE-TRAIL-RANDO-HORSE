import React, { useState, useEffect } from 'react';
import { Smartphone, Compass, Battery, Radio, BellRing, UserCheck, Zap, Mail, Lock, LogIn, UserPlus, LogOut, CheckCircle, ShieldAlert, CreditCard, Landmark, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { RouteData } from '../types';

interface RunnerMobileModeProps {
  onToggleUserSharing: (active: boolean, name: string, bib: string, pos?: [number, number], runnerId?: string) => void;
  userSharing: boolean;
  userPosition: [number, number] | null;
  selectedRoutePoints: [number, number][];
  lang?: 'fr' | 'en';
  routeName?: string;
  currentRoute: RouteData;
}

export default function RunnerMobileMode({
  onToggleUserSharing,
  userSharing,
  userPosition,
  selectedRoutePoints,
  lang = 'fr',
  routeName,
  currentRoute
}: RunnerMobileModeProps) {
  const isFr = lang === 'fr';

  const [runnerName, setRunnerName] = useState(isFr ? 'Marc le Randonneur' : 'Mark the Hiker');
  const [bibNumber, setBibNumber] = useState('777');
  const [batteryLevel, setBatteryLevel] = useState(88);
  const [batteryOptimized, setBatteryOptimized] = useState(true);
  const [sosActive, setSosActive] = useState(false);
  const [simulatedSpeed, setSimulatedSpeed] = useState(0);
  const [simulatedDistance, setSimulatedDistance] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState(() => isFr ? 'Excellent (3m)' : 'Excellent (3m)');
  const [statusMessage, setStatusMessage] = useState(() => isFr ? 'En attente de départ' : 'Ready to start');
  const [watchId, setWatchId] = useState<number | null>(null);

  // Firebase auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);

  // Unique stable guest ID if not logged in
  const [guestId] = useState<string>(() => {
    let id = localStorage.getItem('ultimate_trail_runner_id');
    if (!id) {
      id = 'runner_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('ultimate_trail_runner_id', id);
    }
    return id;
  });

  const runnerId = currentUser ? currentUser.uid : guestId;
  const [routeProgress, setRouteProgress] = useState(0);

  // Stripe & Firestore real-time runner payment tracking
  const [dbRunner, setDbRunner] = useState<any>(null);
  const [organizerStripeId, setOrganizerStripeId] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const needsPayment = !!(currentRoute?.entryFee && currentRoute.entryFee > 0 && (!dbRunner || dbRunner.paymentStatus !== 'paid'));

  useEffect(() => {
    if (!currentRoute?.id || !runnerId) return;
    const rRef = doc(db, 'routes', currentRoute.id, 'runners', runnerId);
    const unsub = onSnapshot(rRef, (snap) => {
      if (snap.exists()) {
        setDbRunner(snap.data());
      } else {
        setDbRunner(null);
      }
    });
    return () => unsub();
  }, [currentRoute?.id, runnerId]);

  useEffect(() => {
    if (!currentRoute?.organizerId) {
      setOrganizerStripeId(null);
      return;
    }
    const orgRef = doc(db, 'organizers', currentRoute.organizerId);
    getDoc(orgRef).then((snap) => {
      if (snap.exists()) {
        setOrganizerStripeId(snap.data().stripeAccountId || null);
      }
    }).catch(err => {
      console.log("Error loading organizer Stripe info:", err);
    });
  }, [currentRoute?.organizerId]);

  // Sync default name if changed and not logged in
  useEffect(() => {
    if (!currentUser) {
      setRunnerName(isFr ? 'Marc le Randonneur' : 'Mark the Hiker');
    }
  }, [isFr, currentUser]);

  // Listen to Auth State changes for the runner
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        if (user.displayName) {
          setRunnerName(user.displayName);
        } else {
          const prefix = user.email ? user.email.split('@')[0] : 'Coureur';
          setRunnerName(prefix.charAt(0).toUpperCase() + prefix.slice(1));
        }

        // Fetch stored runner profile defaults if any
        const loadSavedProfile = async () => {
          try {
            const docRef = doc(db, 'organizers', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.name) setRunnerName(data.name);
              if (data.bibNumber) setBibNumber(data.bibNumber);
            }
          } catch (e) {
            console.log("Could not load stored profile defaults:", e);
          }
        };
        loadSavedProfile();
      }
    });

    return () => unsubscribe();
  }, []);

  // Quick Sign out action for runners
  const handleSignOut = async () => {
    try {
      if (currentUser && currentUser.uid === 'guest_mode_user') {
        setCurrentUser(null);
      } else {
        await signOut(auth);
      }
      setRunnerName(isFr ? 'Marc le Randonneur' : 'Mark the Hiker');
      setBibNumber('777');
    } catch (e) {
      console.error(e);
    }
  };

  // Guest / Demo Login bypass for runners
  const handleGuestLogin = () => {
    const mockUser = {
      uid: 'guest_mode_user',
      email: 'invite-coureur@ultimate-trail.fr',
      displayName: runnerName || (isFr ? 'Marc le Randonneur' : 'Mark the Hiker')
    };
    setCurrentUser(mockUser as any);
    setAuthSuccess(isFr ? "Connexion réussie en mode Invité !" : "Successfully connected as Guest!");
    setTimeout(() => {
      setShowAuthForm(false);
      setAuthSuccess('');
      setAuthError('');
    }, 1200);
  };

  // Sign up / Log in Action using normal email/password
  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    if (!email || !password) {
      setAuthError(isFr ? "Veuillez remplir tous les champs." : "Please fill in all fields.");
      setAuthLoading(false);
      return;
    }

    if (password.length < 6) {
      setAuthError(isFr ? "Le mot de passe doit comporter au moins 6 caractères." : "Password must be at least 6 characters.");
      setAuthLoading(false);
      return;
    }

    const lowerEmail = email.toLowerCase().trim();
    if (lowerEmail.endsWith('@gmail.com') || lowerEmail.endsWith('@googlemail.com')) {
      setAuthError(isFr 
        ? "Les e-mails Google (@gmail.com) ne sont pas autorisés. Utilisez votre mail d'un autre opérateur (ex: @orange.fr, @sfr.fr, @yahoo.com, @outlook.fr...)." 
        : "Google / Gmail accounts are not permitted for runners. Please use your standard operator email address (e.g. Orange, SFR, Yahoo, Outlook).");
      setAuthLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        setAuthSuccess(isFr ? "Compte créé avec succès !" : "Account successfully created!");
        const user = credential.user;
        
        // Save runner profile config in Firestore db
        await setDoc(doc(db, 'organizers', user.uid), {
          username: user.email,
          name: runnerName,
          bibNumber: bibNumber,
          createdAt: new Date().toISOString()
        }, { merge: true });

        setTimeout(() => {
          setShowAuthForm(false);
          setAuthSuccess('');
        }, 1200);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setAuthSuccess(isFr ? "Connexion réussie !" : "Logged in successfully!");
        setTimeout(() => {
          setShowAuthForm(false);
          setAuthSuccess('');
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      let localizedError = err.message;
      if (err.code === 'auth/email-already-in-use') {
        localizedError = isFr ? "Cet email est déjà utilisé par un autre compte." : "This email is already in use.";
      } else if (err.code === 'auth/invalid-email') {
        localizedError = isFr ? "Format de l'adresse email invalide." : "Invalid email address format.";
      } else if (err.code === 'auth/weak-password') {
        localizedError = isFr ? "Le mot de passe est trop simple." : "Password too weak.";
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        localizedError = isFr ? "Email ou mot de passe incorrect." : "Invalid email or password.";
      } else if (err.code === 'auth/operation-not-allowed') {
        localizedError = isFr 
          ? "Action requise dans Firebase : Veuillez activer la méthode de connexion 'Adresse e-mail/mot de passe' dans votre Firebase Console > Onglet 'Authentication' > 'Sign-in method'."
          : "Firebase Action Required: Please enable the 'Email/Password' provider in your Firebase Console under 'Authentication' > 'Sign-in method'.";
      }
      setAuthError(localizedError);
    } finally {
      setAuthLoading(false);
    }
  };

  // Sync profile details on start adventure if updated
  const syncProfileToCloud = async (nameToSync: string, bibToSync: string) => {
    if (!currentUser || currentUser.uid === 'guest_mode_user') return;
    try {
      await setDoc(doc(db, 'organizers', currentUser.uid), {
        name: nameToSync,
        bibNumber: bibToSync
      }, { merge: true });
    } catch (err) {
      console.log('Profile sync error:', err);
    }
  };

  // Auto speed and position animation when active
  useEffect(() => {
    let interval: any;
    if (userSharing) {
      setStatusMessage(isFr ? 'Suivi GPS Actif 📡' : 'GPS Tracking Active 📡');
      setSimulatedSpeed(15.4);
      interval = setInterval(() => {
        // fluctuate speed slightly
        setSimulatedSpeed(prev => {
          const delta = (Math.random() - 0.5) * 2;
          return Number(Math.max(5, Math.min(30, prev + delta)).toFixed(1));
        });
        setSimulatedDistance(prev => Number((prev + 0.05).toFixed(2)));
        
        // Progress along the route points and notify parent of updated position
        setRouteProgress(prev => {
          const nextProgress = Math.min(1.0, prev + 0.015);
          const pointIndex = Math.min(
            selectedRoutePoints.length - 1,
            Math.floor(nextProgress * (selectedRoutePoints.length - 1))
          );
          const currentPos = selectedRoutePoints[pointIndex] || selectedRoutePoints[0] || [48.05, 6.92];
          onToggleUserSharing(true, runnerName, bibNumber, currentPos, runnerId);
          return nextProgress;
        });

        // consume battery very slowly
        if (Math.random() > 0.8) {
          setBatteryLevel(b => Math.max(5, b - 1));
        }
      }, 3000);
    } else {
      setStatusMessage(isFr ? 'Partage désactivé' : 'Sharing inactive');
      setSimulatedSpeed(0);
      setSimulatedDistance(0);
      setRouteProgress(0);
    }

    return () => clearInterval(interval);
  }, [userSharing, isFr, selectedRoutePoints, runnerName, bibNumber, runnerId]);

  const handlePaymentCheckout = async () => {
    setPaymentLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          routeId: currentRoute.id,
          routeName: currentRoute.name,
          entryFee: currentRoute.entryFee || 10,
          connectedAccountId: organizerStripeId || 'acct_sim_dummy',
          runnerId: runnerId,
          runnerName: runnerName
        })
      });

      if (!response.ok) {
        throw new Error(isFr ? "Erreur d'initialisation du paiement." : "Failed to initialize payment session.");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(isFr ? "Pas de redirection de paiement disponible." : "No payment checkout link returned.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle GPS tracking activation via standard HTML Geolocation
  const handleStartTracking = () => {
    if (!userSharing) {
      if (!navigator.geolocation) {
        alert(isFr 
          ? "La géolocalisation n'est pas supportée par votre navigateur." 
          : "Geolocation tracking is not supported by your mobile device.");
        return;
      }

      setStatusMessage(isFr ? 'Recherche du signal GPS...' : 'Locating GPS satellites...');
      
      // Also sync current inputs to Firebase if user is logged in
      syncProfileToCloud(runnerName, bibNumber);

      // Request browser coordinates
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.latitude,
            position.coords.longitude
          ];
          setGpsAccuracy(isFr 
            ? `Très précis (${Math.round(position.coords.accuracy)}m)` 
            : `High Accuracy (${Math.round(position.coords.accuracy)}m)`);
          onToggleUserSharing(true, runnerName, bibNumber, coords, runnerId);
        },
        (error) => {
          console.error(error);
          setGpsAccuracy(isFr ? 'Signal Faible (Simulé)' : 'Weak Signal (Simulated)');
          // Fallback to selected route start point if browser permissions denied
          const fallbackPos = selectedRoutePoints[0] || [48.05, 6.92];
          onToggleUserSharing(true, runnerName, bibNumber, fallbackPos, runnerId);
          setStatusMessage(isFr ? 'GPS Simulé (Autorisation refusée)' : 'Simulated (Permission Denied)');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      setWatchId(id);
    } else {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      onToggleUserSharing(false, runnerName, bibNumber, undefined, runnerId);
      setSosActive(false);
    }
  };

  const handleTriggerSOS = () => {
    if (!userSharing) {
      alert(isFr 
        ? "Veuillez d'abord démarrer le partage GPS pour pouvoir déclencher un SOS." 
        : "Please start the GPS tracking stream before triggering SOS alerts.");
      return;
    }
    const newSosState = !sosActive;
    setSosActive(newSosState);
    
    // Pass SOS state to parent by appending status or through name tag
    const updatedName = newSosState 
      ? (isFr ? `⚠️ Marc (SOS EN COURS)` : `⚠️ Mark (SOS ACTIVE)`) 
      : runnerName;
    
    // Emit GPS pos update with the updated state names
    if (userPosition) {
      onToggleUserSharing(true, updatedName, bibNumber, userPosition, runnerId);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center">
      <div className="w-full text-left mb-4">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-indigo-600" />
          {isFr ? "Simulateur Mobile du Coureur" : "Mobile App Companion"}
        </h3>
        <p className="text-xs text-slate-500 font-normal">
          {isFr
            ? "Interface simplifiée que le randonneur/cavalier ou cycliste ouvre sur son téléphone portable en forêt."
            : "Optimised interface designed for hikers, horse-riders, or cyclers to stream telemetry on the go."}
        </p>
      </div>

      {/* Realistic Smartphone Screen Mock */}
      <div className="w-full max-w-[320px] bg-slate-150 border-[6px] border-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl relative flex flex-col h-[520px]">
        
        {/* Smartphone Notch */}
        <div className="absolute top-0 inset-x-0 h-4 bg-slate-900 rounded-b-xl flex items-center justify-center z-50">
          <div className="w-20 h-2 bg-slate-800 rounded-full"></div>
        </div>

        {/* Smartphone Header / Status Bar */}
        <div className="bg-slate-950 text-[10px] text-slate-400 px-6 pt-5 pb-2 flex justify-between items-center font-mono select-none">
          <div className="flex items-center gap-1 font-bold">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>LTE</span>
          </div>
          <div className="text-white font-extrabold">12:30</div>
          <div className="flex items-center gap-1">
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">{batteryLevel}%</span>
          </div>
        </div>

        {/* Smartphone Screen Content */}
        <div className="flex-1 bg-slate-950 p-4 flex flex-col justify-between overflow-y-auto font-sans">
          
          {/* Active Course Banner */}
          {routeName && (
            <div className="bg-indigo-950/80 border border-indigo-500/30 rounded-xl p-2.5 mb-3.5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2 text-left">
                <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-indigo-300 font-extrabold">Parcours unique</span>
                  <span className="block text-white text-[10px] font-black truncate max-w-[170px]">{routeName}</span>
                </div>
              </div>
              <span className="bg-indigo-500/10 text-indigo-300 font-extrabold text-[8px] px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-wide">
                Live Map
              </span>
            </div>
          )}
          
          {showAuthForm ? (
            /* Email Signup & Login form */
            <div className="flex-1 flex flex-col justify-between text-left py-2 font-sans">
              <div>
                <button
                  type="button"
                  onClick={() => setShowAuthForm(false)}
                  className="text-slate-450 hover:text-white text-[9.5px] font-bold flex items-center gap-1 mb-4 border border-slate-800 px-2 py-1 rounded bg-slate-900/50 cursor-pointer"
                >
                  ← {isFr ? "Retour" : "Back"}
                </button>

                <h4 className="text-white text-xs font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-indigo-400 animate-pulse" />
                  {isFr ? "E-mail (Hors compte Google)" : "Operator Email Account"}
                </h4>
                <p className="text-[9.5px] text-slate-500 mb-3.5 leading-normal">
                  {isFr 
                    ? "Inscrivez-vous ou connectez-vous avec l'e-mail de votre choix (Orange, Yahoo, Outlook, SFR etc.). L'utilisation d'adresses Google/Gmail est désactivée."
                    : "Register or log in using any standard operator address. Google or Gmail accounts are disabled for runners."}
                </p>

                {authError && (
                  <div className="bg-red-950/60 border border-red-900/55 p-2 rounded-lg text-red-300 text-[10px] mb-3.5 font-bold font-mono">
                    ⚠️ {authError}
                  </div>
                )}

                {authSuccess && (
                  <div className="bg-emerald-950/60 border border-emerald-900/50 p-2 rounded-lg text-emerald-300 text-[10px] mb-3.5 font-bold">
                    ✓ {authSuccess}
                  </div>
                )}

                <form onSubmit={handleAuthAction} className="space-y-3">
                  <div>
                    <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">
                      {isFr ? "Adresse Email (Orange, SFR, Yahoo, etc.)" : "Email Address (No Gmail)"}
                    </label>
                    <div className="relative">
                      <Mail className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-500" />
                      <input
                        type="email"
                        required
                        autoComplete="new-email"
                        placeholder="exemple@orange.fr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-white pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 font-normal"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] uppercase tracking-wider text-slate-400 font-extrabold mb-1">
                      {isFr ? "Mot de passe" : "Password"}
                    </label>
                    <div className="relative">
                      <Lock className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-white pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 font-normal"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 border border-indigo-505 text-white font-extrabold text-[11px] py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-97 disabled:opacity-50 mt-1"
                  >
                    {isSignUp ? <UserPlus className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                    <span>
                      {authLoading 
                        ? (isFr ? "Traitement..." : "Processing...") 
                        : (isSignUp 
                          ? (isFr ? "Créer mon Compte" : "Create My Account") 
                          : (isFr ? "Se connecter" : "Log In"))}
                    </span>
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-900"></div>
                    <span className="flex-shrink mx-2 text-[8px] text-slate-500 font-bold uppercase tracking-wider">ou</span>
                    <div className="flex-grow border-t border-slate-900"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGuestLogin}
                    className="w-full bg-slate-900 hover:bg-slate-850 border border-amber-500/35 hover:border-amber-500 text-amber-400 font-extrabold text-[10.5px] py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-97"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-450" />
                    <span>{isFr ? "Bypass : Connexion Rapide Invité" : "Bypass: Quick Guest Login"}</span>
                  </button>
                </form>
              </div>

              <div className="border-t border-slate-900 pt-3 text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-indigo-400 hover:text-indigo-300 text-[9.5px] font-bold underline cursor-pointer"
                >
                  {isSignUp
                    ? (isFr ? "Déjà un compte ? Connectez-vous" : "Have an account? Log In")
                    : (isFr ? "Nouveau ? Créer un compte e-mail" : "New? Create email account")}
                </button>
              </div>
            </div>
          ) : (
            /* Standard Simulator UI screen content */
            <>
              {/* Identity Header */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 text-center shadow">
                <h4 className="text-[11px] uppercase tracking-wider text-indigo-400 font-extrabold mb-1">
                  {isFr ? "PROFIL COUREUR CONNECTÉ" : "MOBILE ATHLETE IDENTITY"}
                </h4>
                
                {userSharing ? (
                  <div className="space-y-0.5">
                    <span className="block text-white text-xs font-black">{runnerName}</span>
                    <span className="inline-block bg-slate-950 text-indigo-300 px-2 py-0.5 rounded font-mono text-[9px] font-bold border border-indigo-900/40">
                      {isFr ? `Dossard : #${bibNumber}` : `Bib Number: #${bibNumber}`}
                    </span>
                    {currentUser && (
                      <span className="block text-[8px] text-slate-500 font-mono truncate max-w-full">
                        {isFr ? "Compte :" : "Account:"} {currentUser.email}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 mt-1.5 font-sans">
                    {currentUser && (
                      <div className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded border border-indigo-950/40 text-[9px] mb-1">
                        <span className="text-slate-400 truncate max-w-[130px] font-mono leading-none">{currentUser.email}</span>
                        <button 
                          onClick={handleSignOut} 
                          className="text-red-400 hover:text-red-300 font-extrabold underline cursor-pointer leading-none"
                        >
                          {isFr ? 'Déco.' : 'Log Out'}
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-1.5 font-sans">
                      <input
                        id="mobile-runner-name-input"
                        type="text"
                        placeholder={isFr ? "Votre Nom" : "Your Name"}
                        value={runnerName}
                        onChange={(e) => setRunnerName(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-[10px] text-white p-1 rounded font-normal focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        id="mobile-runner-bib-input"
                        type="text"
                        placeholder={isFr ? "Dossard" : "Bib #"}
                        value={bibNumber}
                        onChange={(e) => setBibNumber(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-[10px] text-white p-1 rounded font-mono font-bold text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {!currentUser && (
                      <button
                        type="button"
                        onClick={() => { setShowAuthForm(true); setAuthError(''); setAuthSuccess(''); }}
                        className="w-full bg-indigo-950/45 hover:bg-indigo-900/60 text-indigo-400 border border-indigo-900/40 hover:border-indigo-505/60 text-[9.5px] font-bold py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{isFr ? "S'inscrire avec Email (Orange, SFR, Yahoo... Sans compte Google!)" : "Register with Email (Orange, SFR, Yahoo... No Google account!)"}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Central Circular Gauge / Payment Block */}
              {needsPayment ? (
                <div className="flex-1 flex flex-col items-center justify-between py-4 px-2 font-sans overflow-y-auto">
                  <div className="text-center space-y-3 my-auto">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-500/10 text-indigo-450 rounded-2xl border border-indigo-500/20 shadow-md mb-1 animate-pulse mx-auto">
                      <CreditCard className="w-7 h-7 text-indigo-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase bg-indigo-950/40 py-1 px-3.5 rounded-full border border-indigo-900/40">
                        {isFr ? "Frais d'Inscription" : "Registration Fee"}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-white leading-tight px-1 max-w-[240px] mx-auto">
                      {currentRoute.name}
                    </h4>
                    <p className="text-[10px] text-slate-450 max-w-[240px] mx-auto leading-relaxed">
                      {isFr 
                        ? `Frais d'accès requis pour valider votre dossard et activer votre balise de sécurité GPS en direct.` 
                        : `Entry fee required to validate your bib number and activate your live GPS security beacon.`}
                    </p>

                    <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl max-w-[240px] mx-auto shadow-inner">
                      <div className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">
                        {isFr ? "Montant à régler" : "Amount to pay"}
                      </div>
                      <div className="text-3xl font-mono font-black text-white mt-0.5">
                        {currentRoute.entryFee} €
                      </div>
                      <div className="text-[8px] text-emerald-400 font-bold mt-1.5 flex items-center justify-center gap-1 uppercase tracking-wider">
                        <Landmark className="w-3 h-3 text-emerald-400" />
                        <span>{isFr ? "Stripe Connect Sécurisé" : "Secure Stripe Connect"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full space-y-2 mt-auto px-1.5">
                    <button
                      onClick={handlePaymentCheckout}
                      disabled={paymentLoading}
                      className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-450 hover:to-indigo-550 border border-indigo-400 rounded-xl font-black text-xs text-white uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-950/40 disabled:opacity-50"
                    >
                      {paymentLoading ? (
                        <span>{isFr ? "Chargement..." : "Loading..."}</span>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 text-white" />
                          <span>{isFr ? `Régler ${currentRoute.entryFee} €` : `Pay ${currentRoute.entryFee} €`}</span>
                        </>
                      )}
                    </button>

                    {/* Simulation override */}
                    <button
                      type="button"
                      onClick={async () => {
                        const rRef = doc(db, 'routes', currentRoute.id, 'runners', runnerId);
                        await setDoc(rRef, {
                          paymentStatus: 'paid',
                          entryFeePaid: currentRoute.entryFee,
                          name: runnerName,
                          type: currentRoute.category || 'VTT',
                          bibNumber: bibNumber,
                          lastActive: new Date().toISOString()
                        }, { merge: true });
                        alert(isFr ? "Simulation : Inscription payée avec succès !" : "Simulation: Entry fee paid successfully!");
                      }}
                      className="w-full py-2 border border-dashed border-slate-800 hover:border-slate-700 text-[9px] font-bold text-slate-500 hover:text-indigo-400 rounded-xl transition-colors cursor-pointer"
                    >
                      ⚡ {isFr ? "Bypass simulation : Régler en démo" : "Demo Bypass: Set as Paid"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center justify-center my-4 py-2 relative">
                    <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-500 ${
                      sosActive
                        ? 'border-red-650 bg-red-950/20 shadow-[0_0_15px_rgba(224,36,36,0.3)]'
                        : userSharing
                        ? 'border-indigo-500 bg-indigo-950/10 shadow-[0_0_15px_rgba(99,102,241,0.15)] animate-pulse'
                        : 'border-slate-800 bg-slate-900/50'
                    }`}>
                      {userSharing ? (
                        <>
                          <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                            {isFr ? "VITESSE" : "VELOCITY"}
                          </div>
                          <span className="text-3xl font-black font-mono text-white leading-none my-1">{simulatedSpeed}</span>
                          <div className="text-[9px] text-indigo-400 font-bold">KM / H</div>
                        </>
                      ) : (
                        <div className="text-center p-3 font-sans">
                          <Compass className="w-6 h-6 text-slate-500 mx-auto animate-spin" style={{ animationDuration: '8s' }} />
                          <span className="text-[10px] text-slate-450 font-bold block mt-1 leading-normal">
                            {isFr ? "Prêt au Départ" : "Staged & Ready"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Simulated Live telemetry stats if sharing */}
                    {userSharing && (
                      <div className="grid grid-cols-2 gap-4 w-full mt-3 px-2 text-center text-[10px] font-sans">
                        <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                          <span className="block text-[8px] text-slate-505 uppercase font-extrabold leading-normal">
                            {isFr ? "Chrono Actif" : "Direct Time"}
                          </span>
                          <span className="font-mono text-white font-extrabold">00:18:42</span>
                        </div>
                        <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                          <span className="block text-[8px] text-slate-550 uppercase font-black leading-normal">
                            {isFr ? "Dist. Estimée" : "Est. Range"}
                          </span>
                          <span className="font-mono text-indigo-400 font-extrabold">+{simulatedDistance} km</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Controls Panel */}
                  <div className="space-y-2 text-center font-sans w-full">
                    
                    {/* Battery Saver Alert Toggle */}
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-850 p-2 rounded-xl text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-slate-300 font-semibold">
                          {isFr ? "Batterie Optimisée" : "Save Battery Pack"}
                        </span>
                      </div>
                      <button
                        onClick={() => setBatteryOptimized(!batteryOptimized)}
                        className={`w-8 h-4 rounded-full transition-colors relative ${batteryOptimized ? 'bg-indigo-600' : 'bg-slate-700'}`}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${batteryOptimized ? 'left-4.5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {/* GPS Signal bar indicator */}
                    <div className="flex justify-between items-center px-1 text-[9px] text-slate-500 font-mono">
                      <span>{isFr ? "Précision GPS:" : "GPS Precision:"} {gpsAccuracy}</span>
                      <span className="text-emerald-400 font-bold">{statusMessage}</span>
                    </div>

                    {/* Primary START/STOP Trail button */}
                    <button
                      onClick={handleStartTracking}
                      className={`w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden cursor-pointer ${
                        userSharing
                          ? 'bg-gradient-to-r from-red-650 to-rose-700 hover:from-red-600 hover:to-rose-650 border border-red-600 text-white shadow-lg shadow-rose-950/40'
                          : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-550 border border-indigo-400 text-white font-black shadow-lg shadow-indigo-950/20'
                      }`}
                    >
                      <Radio className={`w-4 h-4 ${userSharing ? 'animate-ping' : ''}`} />
                      {userSharing 
                        ? (isFr ? 'Arrêter mon partage GPS' : 'Stop GPS Broadcast') 
                        : (isFr ? 'Démarrer ma randonnée' : 'Start My Adventure')
                      }
                    </button>

                    {/* Real emergency SOS button */}
                    {userSharing && (
                      <button
                        onClick={handleTriggerSOS}
                        className={`w-full py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide border transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
                          sosActive
                            ? 'bg-white text-red-600 border-white hover:bg-slate-100 animate-pulse'
                            : 'bg-red-950/25 text-red-300 border-red-900 hover:bg-red-950/40'
                        }`}
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        {sosActive 
                          ? (isFr ? 'Annuler mon Alerte SOS' : 'Cancel SOS Broadcaster') 
                          : (isFr ? '🚨 ENVOYER SOS SECOURS' : '🚨 DISPATCH EMERGENCY SOS')
                        }
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}

        </div>

        {/* Home bar footer */}
        <div className="bg-slate-950 pb-2 pt-1 flex items-center justify-center">
          <div className="w-24 h-1 bg-slate-800 rounded-full"></div>
        </div>

      </div>

      <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1 w-full max-w-[320px] shadow-sm font-sans text-left">
        <div className="text-indigo-600 font-extrabold flex items-center gap-1 uppercase tracking-wider text-[10px]">
          <UserCheck className="w-3.5 h-3.5" /> {isFr ? "COMMENT TESTER ?" : "HOW TO TEST ?"}
        </div>
        <p className="font-normal font-sans text-slate-500 text-[11px] leading-relaxed">
          {isFr
            ? <><strong>Aucun compte requis !</strong> Saisissez simplement votre nom et dossard ci-dessus, puis cliquez sur <strong className="text-indigo-600 font-bold">DÉMARRER MA RANDONNÉE</strong>. Votre mobile commencera à émettre votre trace GPS en temps réel. Si vous souhaitez tester l'interface connectée sans configurer Firebase Auth, cliquez sur <strong>Bypass : Connexion Rapide Invité</strong>.</>
            : <><strong>No account required!</strong> Simply enter your name and bib number above, then click <strong className="text-indigo-600 font-bold">START MY ADVENTURE</strong>. Your phone will instantly broadcast its live GPS trace. If you want to test the authenticated runner view without configuring Firebase Auth, use the <strong>Bypass: Quick Guest Login</strong> button.</>}
        </p>
      </div>

    </div>
  );
}
