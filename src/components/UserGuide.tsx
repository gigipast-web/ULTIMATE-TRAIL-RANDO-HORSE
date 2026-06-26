import { useState } from 'react';
import { 
  BookOpen, Users, Compass, ShieldCheck, HelpCircle, 
  ArrowRight, Landmark, Smartphone, Trophy, Link, Info,
  MapPin, AlertOctagon, HeartHandshake, Zap, Sparkles
} from 'lucide-react';

interface UserGuideProps {
  onNavigate: (tab: 'organisateur' | 'spectateur' | 'coureur' | 'tarifs') => void;
  currentOrganizer: { name: string; region?: string } | null;
  lang?: 'fr' | 'en';
}

export default function UserGuide({ onNavigate, currentOrganizer, lang = 'fr' }: UserGuideProps) {
  const [activeSubTab, setActiveSubTab] = useState<'intro' | 'organisateur' | 'coureurs' | 'faq'>('intro');

  const isFr = lang === 'fr';

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl max-w-4xl mx-auto my-4 transition-all duration-300 animate-fadeIn">
      
      {/* Header section with icons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 p-2.5 rounded-2xl border border-indigo-100">
            <BookOpen className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {isFr ? "Guide d'Utilisation Officiel" : "Official User Guide"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {isFr 
                ? "Suivi géospatial intelligent, tracés dynamiques et sécurité en temps réel."
                : "Intelligent geospatial tracking, dynamic routing and real-time safety."}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 px-3.5 py-1.5 rounded-full text-[11px] font-black tracking-wide text-amber-800 uppercase self-start md:self-auto shadow-sm">
          <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-600" />
          <span>{isFr ? "Ressources d'Assistance" : "Support Resources"}</span>
        </div>
      </div>

      {/* Sub tabs inside the guide component */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        <button
          onClick={() => setActiveSubTab('intro')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            activeSubTab === 'intro'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{isFr ? "1. Vue d'ensemble" : "1. Overview"}</span>
        </button>
        
        <button
          onClick={() => setActiveSubTab('organisateur')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            activeSubTab === 'organisateur'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{isFr ? "2. Guide Organisateur" : "2. Organizer Guide"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('coureurs')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            activeSubTab === 'coureurs'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>{isFr ? "3. Guide Coureurs" : "3. Runners Guide"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('faq')}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            activeSubTab === 'faq'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{isFr ? "FAQ & Sécurité" : "FAQ & Safety"}</span>
        </button>
      </div>

      {/* ---------------- Sub view 1: INTRO ---------------- */}
      {activeSubTab === 'intro' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              {isFr ? "Bienvenue sur Ultimate Trail Track" : "Welcome to Ultimate Trail Track"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isFr 
                ? "Ce système est une application complète de suivi cartographique en temps réel destinée aux organisateurs de courses outdoor (VTT, trail, randonnée, cavalier, cyclisme) et à leurs spectateurs. Elle permet de tracer des parcours, d'inscrire des sportifs, de simuler leurs avancées physiques, et d'assurer une couverture sécurité optimale grâce à des alertes SOS instantanées."
                : "This system is a complete real-time map-tracking suite tailored for outdoor race organizers (mountain biking, trail, hiking, horse riding, cycling) and spectators. It allows drafting physical tracks, registering runners, simulating their speed, and offering supreme geofencing protection via SOS warning alerts."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-150 rounded-2xl p-4 hover:border-indigo-200 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <h4 className="font-bold text-xs text-slate-850 mb-1">
                {isFr ? "Pour les Organisateurs 👤" : "For Race Organizers 👤"}
              </h4>
              <p className="text-[11px] text-slate-500 leading-normal font-medium mb-3">
                {isFr
                  ? "Configurez vos tracés de course officiels, gérez vos participants, démarrez le chronomètre de la simulation globale, et gardez un œil sur le tableau d'alerte et de classement en direct."
                  : "Draft your official GPX paths, manage list of participants, spin up the active simulation progress, and monitor physical alerts & real-time leaderboard standings."}
              </p>
              <button 
                onClick={() => setActiveSubTab('organisateur')}
                className="text-[10px] text-indigo-600 hover:text-indigo-700 font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                {isFr ? "Consulter les étapes" : "View guide steps"} <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="border border-slate-150 rounded-2xl p-4 hover:border-indigo-200 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                <Smartphone className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="font-bold text-xs text-slate-850 mb-1">
                {isFr ? "Pour les Coureurs 🏃" : "For Active Runners 🏃"}
              </h4>
              <p className="text-[11px] text-slate-500 leading-normal font-medium mb-3">
                {isFr
                  ? "Utilisez l'application sur votre smartphone lors de la course, rejoignez la session via votre dossard, et partagez votre position GPS en temps réel directement sur la carte officielle."
                  : "Load the app on your mobile device on event day, link your official bib number, and stream your direct live GPS tracker data so security and audience can see you."}
              </p>
              <button 
                onClick={() => setActiveSubTab('coureurs')}
                className="text-[10px] text-emerald-600 hover:text-emerald-700 font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                {isFr ? "Découvrir l'Espace Coureur" : "Explore Runner Hub"} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Quick Stats Panel Navigation */}
          <div className="bg-indigo-50/40 rounded-2xl border border-indigo-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl border border-indigo-200/50 shadow-inner">
                <Landmark className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-black tracking-widest text-indigo-600 leading-none block">
                  {isFr ? "Tarification Transparente" : "Transparent Pricing plans"}
                </span>
                <span className="text-xs font-black text-slate-850">
                  {isFr 
                    ? "Utilisez notre simulateur pour évaluer le coût par course."
                    : "Use our built-in simulator to calculate optimal price for your event."}
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('tarifs')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl border border-indigo-500 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              {isFr ? "Simulateur de Tarifs" : "Pricing Simulator"}
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Sub view 2: ORGANISATEUR ---------------- */}
      {activeSubTab === 'organisateur' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="border-l-4 border-indigo-500 bg-indigo-50/20 pl-4 py-1.5">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-indigo-900">
              {isFr ? "Espace Organisateur — Mode Privé" : "Organizer Dashboard — Private Access"}
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              {isFr 
                ? "Comment déployer, paramétrer et superviser une course d'orientation ou un trail officiel."
                : "How to initialize, configure and supervise an official trail event or orientation race."}
            </p>
          </div>

          <div className="space-y-4">
            
            <div className="relative pl-8 pb-1">
              <div className="absolute left-0 top-0.5 w-5 h-5 bg-indigo-100 border border-indigo-300 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-700 font-mono">1</div>
              <h4 className="text-xs font-extrabold text-slate-850">
                {isFr ? "Inscription et Connexion sécurisée" : "Secure Signup & Hub Login"}
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                {isFr
                  ? "Rendez-vous dans l'onglet \"Organisateur\". Créez un profil en renseignant votre Nom d'organisation (ex: Club Alpin des Vosges) et sélectionnez votre Région géographique. Cet espace privé protège vos parcours et vos listes de compétiteurs."
                  : "Go to the \"Organizer\" tab. Enter a unique organization name (e.g., Vosges Alpine Club) and select your geographical area. This private space secures your trails and competitors."}
              </p>
            </div>

            <div className="relative pl-8 pb-1">
              <div className="absolute left-0 top-0.5 w-5 h-5 bg-indigo-100 border border-indigo-300 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-700 font-mono">2</div>
              <h4 className="text-xs font-extrabold text-slate-850">
                {isFr ? "Création de Tracé et Checkpoints Map" : "Interactive Map Drawing & Checkpoints"}
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                {isFr
                  ? "Une fois connecté, descendez tout en bas de votre panneau d'administration pour trouver le \"Créateur de parcours GPX interactif\". Cliquez directement sur la carte pour poser vos points de passage successifs et vos bornes de chronométrage interactives (Points de contrôle)."
                  : "Once logged in, scroll to the bottom of the dashboard to use the \"Interactive Path Creator\". Click directly on the map to draft physical coordinates and assign custom checkpoints with precise metrics."}
              </p>
            </div>

            <div className="relative pl-8 pb-1">
              <div className="absolute left-0 top-0.5 w-5 h-5 bg-indigo-100 border border-indigo-300 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-700 font-mono">3</div>
              <h4 className="text-xs font-extrabold text-slate-850">
                {isFr ? "Inscrire et Administrer les Coureurs" : "Add & Register Competitors"}
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                {isFr
                  ? "Depuis le module \"Inscriptions & Préparations\", ajoutez vos participants manuellement en spécifiant leur nom, type de pratique (Rando, VTT, Cavalier) et attribuez-leur un numéro de dossard unique."
                  : "Under the \"Registration & Lineup\" module, add participants manually by entering their name, category (Hike, VTT, Equestrian) and allocate a one-of-a-kind bib number."}
              </p>
            </div>

            <div className="relative pl-8 pb-1">
              <div className="absolute left-0 top-0.5 w-5 h-5 bg-indigo-100 border border-indigo-300 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-700 font-mono">4</div>
              <h4 className="text-xs font-extrabold text-slate-850">
                {isFr ? "Lancer & Piloter la Simulation Live" : "Start & Controls Simulation"}
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                {isFr
                  ? "Vous disposez d'un player de simulation : Play, Pause, et défilement temporel accéléré (1x, 5x, 20x). Cela permet de simuler le comportement théorique de vos athlètes sur le terrain et de tester la réactivité de vos postes de contrôle avant le jour J."
                  : "Take leverage of our simulation control deck: Play, Pause, and speed multipliers (1x, 5x, 20x). This lets you test security logic, run offline drills, and witness checkpoints validation ahead of time."}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mt-4 flex items-center justify-between gap-4">
            <div className="text-[11px] text-slate-500 font-medium">
              🧑‍💻 {currentOrganizer ? (
                isFr ? (
                  <>Vous êtes actuellement connecté en tant que <strong className="text-indigo-600">{currentOrganizer.name}</strong>.</>
                ) : (
                  <>You are currently logged in as <strong className="text-indigo-600">{currentOrganizer.name}</strong>.</>
                )
              ) : (
                isFr ? (
                  <>Pour commencer, connectez-vous ou créez un compte organisateur.</>
                ) : (
                  <>To start, please sign up or log in to an organizer account.</>
                )
              )}
            </div>
            <button
              onClick={() => onNavigate('organisateur')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2 px-3 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              {isFr ? "Aller vers l'Espace Organisateur" : "Go to Organizer Dashboard"}
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Sub view 3: COUREURS ---------------- */}
      {activeSubTab === 'coureurs' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="border-l-4 border-emerald-500 bg-emerald-50/20 pl-4 py-1.5">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-emerald-900">
              {isFr ? "Espace Coureur / Compétiteur" : "Runner & Competitor Guide"}
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              {isFr
                ? "Comment coupler votre smartphone et partager votre tracking géo-référencé en temps réel durant l'événement."
                : "How to connect your smartphone and stream your geo-localised position during the live event."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs mb-3 font-mono">A</div>
                <h4 className="font-black text-xs text-slate-800 mb-1">
                  {isFr ? "Enregistrer votre Dossard" : "Register Bib Number"}
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                  {isFr
                    ? "L'organisateur doit d'abord inscrire votre dossard sur la liste officielle. Une fois effectué, rendez-vous sur l'\"Espace Coureur\" pour lier votre terminal."
                    : "The race authority must first input your bib inside the system. Once registered, navigate to the \"Runner Space\" tab to bind your device."}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs mb-3 font-mono">B</div>
                <h4 className="font-black text-xs text-slate-800 mb-1">
                  {isFr ? "Autoriser la Géolocalisation" : "Grand Geolocation Access"}
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                  {isFr
                    ? "Cliquez sur \"Autoriser et Activer mon GPS\". Votre navigateur demandera l'accès au capteur GPS de votre mobile. Cela permet d'obtenir des coordonnées de grande précision."
                    : "Toggle \"Enable GPS Tracking\". Your browser will request access to your mobile GPS hardware, enabling hyper-precise coordinates streams on the main map."}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs mb-3 font-mono">C</div>
                <h4 className="font-black text-xs text-slate-800 mb-1">
                  {isFr ? "Suivre son avancement direct" : "Monitor your Progress"}
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                  {isFr
                    ? "Une fois actif, votre appareil transmet périodiquement votre position. Votre trace s'illumine en vert et vous pouvez voir votre distance restante au prochain checkpoint."
                    : "When turned on, your device frequently loops coordinates to the card. Your trace turns neon green and shows precise metrics to the next checkpoint."}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50/20 border border-emerald-100 rounded-2xl p-4">
            <h4 className="font-extrabold text-xs text-slate-850 mb-1 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              {isFr ? "Pourquoi mon tracé s'affiche-t-il séparément ?" : "Why does my track project separately?"}
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
              {isFr
                ? "Durant la course, les spectateurs et l'organisateur verront votre icône clignoter sur la carte principale et dans le classement de l'onglet \"Mode Spectateur\". Le suivi s'effectue même en arrière-plan si votre téléphone est configuré pour ne pas couper l'activité du navigateur."
                : "During the match, audience and security will follow your real-time position live on the main map and list under \"Spectator Mode\". The telemetry streams properly even in background assuming browser active states are kept."}
            </p>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => onNavigate('coureur')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl border border-emerald-500/25 transition-all active:scale-95 cursor-pointer shadow-sm shadow-emerald-100"
            >
              {isFr ? "Ouvrir l'Espace Coureur Mobile 📱" : "Open Mobile Runner Tracker 📱"}
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Sub view 4: FAQ & SECURITY ---------------- */}
      {activeSubTab === 'faq' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="border-l-4 border-amber-500 bg-amber-50/20 pl-4 py-1.5">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-amber-900">
              {isFr ? "Normes de Sécurité, Sauvetage & SOS" : "Safety Standards, Rescue & Emergency"}
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              {isFr 
                ? "Notre protocole matériel et applicatif dédié à la protection des compétiteurs en milieu hostile ou isolé."
                : "Our dedicated software rules engineered to preserve athletes life and track signals in remote terrains."}
            </p>
          </div>

          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <h4 className="font-bold text-xs text-slate-850 mb-1 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-500" />
                {isFr ? "Comment fonctionne l'alerte d'immobilité (SOS) ?" : "How does the immobility SOS watch trigger?"}
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                {isFr
                  ? "Si un coureur actif ne transmet aucune mise à jour GPS de position pendant une période supérieure ou égale à 5 minutes (ou s'il clique sur le bouton SOS de l'onglet Coureurs), un voyant clignotant rouge vif s'allume instantanément sur le panneau de contrôle de l'organisateur avec l'alerte correspondante."
                  : "If an active runner fails to report movement coordinates for a duration of 5 minutes or more (or triggers the live \"SOS Help\" button on their handset), a bright flashing red banner immediately alerts the organizer with detailed coordinates."}
              </p>
            </div>

            <div className="border-b border-slate-100 pb-4">
              <h4 className="font-bold text-xs text-slate-850 mb-1 flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-emerald-600" />
                {isFr ? "Peut-on utiliser l'application hors-ligne ?" : "Does the application operate offline?"}
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                {isFr
                  ? "La carte de suivi géo-spatiale nécessite une connexion Internet au démarrage pour charger la tuilerie topographique. Cependant, l'inscription des coureurs et les profils d'organisation sont sauvegardés localement de manière persistante (localStorage) sur votre terminal. Vous ne perdrez donc jamais vos données en cas de coupure de réseau."
                  : "Map coordinates rendering require active internet signals at startup to load topography layers. However, runners lists, registrations and profiles details are securely persisted on local storage. No data is lost in case of momentary connection downfalls."}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-xs text-slate-850 mb-1 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                {isFr ? "Comment est calculé le classement (Leaderboard) ?" : "How is the leaderboard calculated?"}
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                {isFr
                  ? "Le podium virtuel est dynamique : il classe les athlètes d'abord par ordonnance de point de contrôle validé (ex: CP2 est supérieur à CP1), puis par pourcentage de complétion du trajet s'ils sont entre deux checkpoints, et enfin par temps écoulé. Ceux ayant le statut \"En détresse\" ou \"Disqualifiés (Abandon)\" sont automatiquement isolés pour un tri clair du staff."
                  : "Our dynamic leaderboard organizes competitors primarily by checkpoints checked (CP3 beats CP2), secondly by physical route completion ratios, and thirdly by elapsed times. Runners listed with 'SOS' or 'Withdrawn' status tags are filtered instantly to the bottom for clear tactical visibility."}
              </p>
            </div>
          </div>

          <div className="bg-slate-100/60 p-4 rounded-xl text-center">
            <p className="text-[11px] text-slate-500 font-semibold mb-2">
              {isFr 
                ? "Besoin de faire une démonstration de suivi rapide pour vos collaborateurs ?"
                : "Need to run a fast tracking demonstration for your team?"}
            </p>
            <button
              onClick={() => onNavigate('spectateur')}
              className="bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs py-2 px-4 rounded-xl border border-slate-200 transition-all active:scale-95 cursor-pointer shadow-sm mx-auto flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isFr ? "Ouvrir la Carte de Suivi (Spectateur)" : "Open Spectator Tracking Hub"}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
