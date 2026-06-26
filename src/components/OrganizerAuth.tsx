import React, { useState } from 'react';
import { Organizer } from '../types';
import { ShieldAlert, LogIn, UserPlus, FileText, CheckCircle2, Globe, Building2, Lock, Mail, Key } from 'lucide-react';
import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface OrganizerAuthProps {
  onLogin: (organizer: Organizer) => void;
  lang?: 'fr' | 'en';
}

export default function OrganizerAuth({ onLogin, lang = 'fr' }: OrganizerAuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [region, setRegion] = useState('Grand Est');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isFr = lang === 'fr';

  // Google Login Auth
  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const orgRef = doc(db, 'organizers', user.uid);
      const orgSnap = await getDoc(orgRef);
      
      let orgData: Organizer;
      if (orgSnap.exists()) {
        orgData = {
          id: user.uid,
          username: user.email || '',
          name: orgSnap.data().name || user.displayName || 'Club VTT',
          region: orgSnap.data().region || 'Grand Est'
        };
      } else {
        orgData = {
          id: user.uid,
          username: user.email || '',
          name: user.displayName || 'Club VTT / Rando',
          region: 'Grand Est'
        };
        await setDoc(orgRef, {
          username: orgData.username,
          name: orgData.name,
          region: orgData.region
        });
      }
      
      localStorage.setItem('ultimate_trail_current_organizer', JSON.stringify(orgData));
      
      setSuccess(isFr ? `Connecté avec Google en tant que ${orgData.name} !` : `Logged in with Google as ${orgData.name}!`);
      setTimeout(() => {
        onLogin(orgData);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(isFr ? `Erreur d'authentification Google: ${err.message}` : `Google authentication failed: ${err.message}`);
    }
  };

  // Local storage management helpers
  const getRegisteredOrganizers = (): Organizer[] => {
    const data = localStorage.getItem('ultimate_trail_organizers');
    if (!data) {
      localStorage.setItem('ultimate_trail_organizers', JSON.stringify([]));
      return [];
    }
    return JSON.parse(data);
  };

  const saveOrganizer = (org: Organizer) => {
    const list = getRegisteredOrganizers();
    list.push(org);
    localStorage.setItem('ultimate_trail_organizers', JSON.stringify(list));
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError(isFr 
        ? 'Veuillez saisir votre identifiant et votre mot de passe.' 
        : 'Please enter your username and password.');
      return;
    }

    const list = getRegisteredOrganizers();
    const found = list.find(o => o.username.toLowerCase() === username.trim().toLowerCase());

    if (!found || found.password !== password) {
      setError(isFr 
        ? 'Identifiant ou mot de passe incorrect. Veuillez d\'abord vous inscrire.' 
        : 'Incorrect username or password. Please register first.');
      return;
    }

    onLogin(found);
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError(isFr 
        ? "Veuillez saisir le nom de votre organisation." 
        : "Please enter the name of your organization.");
      return;
    }
    if (!username.trim()) {
      setError(isFr 
        ? "Veuillez spécifier votre adresse email de connexion." 
        : "Please provide your login email address.");
      return;
    }
    if (!password.trim() || password.length < 3) {
      setError(isFr 
        ? "Votre mot de passe doit contenir au moins 3 caractères." 
        : "Password must contain at least 3 characters.");
      return;
    }

    const list = getRegisteredOrganizers();
    const alreadyExists = list.some(o => o.username.toLowerCase() === username.trim().toLowerCase());

    if (alreadyExists) {
      setError(isFr 
        ? "Cet identifiant d'adresse email est déjà enregistré." 
        : "This email address is already registered.");
      return;
    }

    const newOrg: Organizer = {
      id: `org-${Date.now()}`,
      name: name.trim(),
      username: username.trim(),
      region: region,
      password: password
    };

    saveOrganizer(newOrg);
    setSuccess(isFr 
      ? `Compte créé avec succès pour ${newOrg.name} ! Connexion en cours...` 
      : `Account successfully created for ${newOrg.name}! Logging in...`);
    
    setTimeout(() => {
      onLogin(newOrg);
    }, 1500);
  };

  return (
    <div className="max-w-md mx-auto my-4 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-600 mb-3">
          <Building2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
          {isSignUp 
            ? (isFr ? "S'inscrire comme Organisateur" : "Sign Up as Organizer") 
            : (isFr ? "Connexion Organisateur" : "Organizer Login")}
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {isSignUp 
            ? (isFr 
                ? "Créez votre espace privé pour gérer vos propres parcours d'altitude et événements de trail en direct." 
                : "Create your private space to manage custom altitude routes and live trail events.")
            : (isFr 
                ? "Connectez-vous pour configurer vos balises GPS et surveiller vos coureurs en temps réel de façon autonome." 
                : "Login to configure GPS signals and monitor your runners in real-time independently.")
          }
        </p>
      </div>

      {/* Google Login Action - Elevated & Primary Option */}
      <div className="mb-5">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 px-4 rounded-xl border border-slate-750 text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-98"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" className="w-4 h-4 bg-white p-0.5 rounded-full" alt="Google" referrerPolicy="no-referrer" />
          <span>{isFr ? "Continuer avec Google (Sécurisé)" : "Continue with Google (Secure)"}</span>
        </button>
        <div className="relative my-5 flex items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
            {isFr ? "ou connexion classique" : "or classic login"}
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>
      </div>

      {/* Form switcher */}
      <div className="flex border border-slate-200 p-1 rounded-xl bg-slate-50 mb-6 font-sans">
        <button
          type="button"
          onClick={() => { setIsSignUp(false); setError(''); }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            !isSignUp 
              ? 'bg-white shadow-sm border border-slate-200 text-indigo-600 font-extrabold' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {isFr ? "Se connecter" : "Login"}
        </button>
        <button
          type="button"
          onClick={() => { setIsSignUp(true); setError(''); }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            isSignUp 
              ? 'bg-white shadow-sm border border-slate-200 text-indigo-600 font-extrabold' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {isFr ? "S'inscrire (Nouveau)" : "Register (New)"}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs font-semibold leading-normal flex items-start gap-2.5 font-sans">
          <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl p-3 text-xs font-bold flex items-start gap-2.5 font-sans">
          <CheckCircle2 className="w-4 h-4 text-emerald-650 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {isSignUp ? (
        /* Sign Up Form */
        <form onSubmit={handleSignUpSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              {isFr ? "Nom de l'organisation :" : "Organization Name:"}
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder={isFr ? "Ex: Club Vosges Nature, Trail des cimes..." : "E.g., Vosges Alpine Club, Trail Peak..."}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              {isFr ? "Adresse Email de connexion :" : "Username (Email Address):"}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="Ex: contact@organisation.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              {isFr ? "Mot de passe :" : "Password:"}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                placeholder={isFr ? "Au moins 3 caractères" : "At least 3 characters"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              {isFr ? "Région principale d'exercice :" : "Primary Operating Area:"}
            </label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Grand Est (Vosges)">{isFr ? "Grand Est (Vosges)" : "Grand Est (Vosges peaks)"}</option>
                <option value="Auvergne-Rhône-Alpes (Alpes)">{isFr ? "Auvergne-Rhône-Alpes (Alpes)" : "Alps range"}</option>
                <option value="Provence-Alpes-Côte d'Azur (Verdon)">{isFr ? "Provence-Alpes-Côte d'Azur (Verdon)" : "Verdon Gorges"}</option>
                <option value="Bretagne (Morbihan)">{isFr ? "Bretagne (Brocéliande)" : "Brocéliande forest"}</option>
                <option value="Pyrénées-Atlantiques">{isFr ? "Pyrénées" : "Pyrenees mountain"}</option>
                <option value="Autre Région">{isFr ? "Autre région / Monde 🌍" : "Other Region / World 🌍"}</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-xl border border-indigo-500 text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer active:scale-98 mt-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isFr ? "M'inscrire et Me Connecter" : "Register and Log In"}</span>
          </button>
        </form>
      ) : (
        /* Login Form */
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              {isFr ? "Adresse Email :" : "Email address:"}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder="Ex: contact@organisation.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              {isFr ? "Mot de passe :" : "Password:"}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                placeholder={isFr ? "Saisissez votre mot de passe" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-xl border border-indigo-500 text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer active:scale-98"
          >
            <LogIn className="w-4 h-4" />
            <span>{isFr ? "Se connecter" : "Log In"}</span>
          </button>
        </form>
      )}

      {/* Safety & Isolation Notes */}
      <div className="mt-6 pt-5 border-t border-slate-150 text-[10px] font-medium leading-relaxed text-slate-500 space-y-1 font-sans">
        <p className="flex items-center gap-1 font-extrabold uppercase tracking-widest text-[#4f46e5] text-[9.5px]">
          🔒 {isFr ? "ISOLATION GARANTIE :" : "GUARANTEED PRIVACY :"}
        </p>
        <p>
          {isFr
            ? "Chaque organisateur dispose d'un espace 100% autonome. Les traces GPX, coordonnées géographiques et coureurs que vous y enregistrez ne seront visibles pour aucun autre administrateur."
            : "Each organizing profile benefits from an fully insulated workspace. GPX drawings, coordinates and competitors will be kept perfectly secure from other organizations."}
        </p>
      </div>
    </div>
  );
}
