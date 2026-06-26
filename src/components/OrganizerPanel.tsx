import React, { useState, useRef } from 'react';
import { RouteData, RunnerType, Runner } from '../types';
import { parseGPXString, getPathLength, generateDummyGPX } from '../data';
import { Upload, Trash2, Plus, ArrowRight, ShieldAlert, Sparkles, AlertCircle, FileText, Check, QrCode, Printer, Link2, Copy, Landmark, CreditCard, Lock, RefreshCw } from 'lucide-react';

interface OrganizerPanelProps {
  currentRoute: RouteData;
  onUploadGPX: (name: string, points: [number, number][]) => void;
  onResetRace: () => void;
  onClearNames: () => void;
  onAddRunner: (name: string, type: RunnerType) => boolean;
  runnersCount: number;
  onSimulateBulkRunners: (count: number) => void;
  currentOrganizer?: any;
  onStripeConnect?: () => void;
  stripeLoading?: boolean;
  onUpdateRouteFee?: (fee: number) => void;
}

export default function OrganizerPanel({
  currentRoute,
  onUploadGPX,
  onResetRace,
  onClearNames,
  onAddRunner,
  runnersCount,
  onSimulateBulkRunners,
  currentOrganizer,
  onStripeConnect,
  stripeLoading = false,
  onUpdateRouteFee
}: OrganizerPanelProps) {
  const [newRunnerName, setNewRunnerName] = useState('');
  const [newRunnerType, setNewRunnerType] = useState<RunnerType>('VTT');
  const [errorMessage, setErrorMessage] = useState('');
  const [gpxError, setGpxError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedGpx, setCopiedGpx] = useState(false);

  // States for sharing / QR codes copying
  const [copiedRunner, setCopiedRunner] = useState(false);
  const [copiedSpectator, setCopiedSpectator] = useState(false);

  // Stripe local configuration state
  const [localFee, setLocalFee] = useState<string>('0');
  const [feeUpdateSuccess, setFeeUpdateSuccess] = useState(false);
  const [platformCommission, setPlatformCommission] = useState<number>(5);

  React.useEffect(() => {
    if (currentRoute) {
      setLocalFee(String(currentRoute.entryFee || 0));
    }
  }, [currentRoute?.entryFee]);

  React.useEffect(() => {
    // Fetch platform commission percent from server
    fetch('/api/stripe/platform-settings')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(data => {
        if (typeof data.commissionPercent === 'number') {
          setPlatformCommission(data.commissionPercent);
        }
      })
      .catch(() => {
        // Fallback to default
        setPlatformCommission(5);
      });
  }, []);

  const runnerUrl = `${window.location.origin}?tab=coureur&routeId=${currentRoute.id}`;
  const spectatorUrl = `${window.location.origin}?tab=spectateur&routeId=${currentRoute.id}`;

  const runnerQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(runnerUrl)}`;
  const spectatorQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(spectatorUrl)}`;

  const handleCopyLink = (url: string, type: 'runner' | 'spectator') => {
    navigator.clipboard.writeText(url);
    if (type === 'runner') {
      setCopiedRunner(true);
      setTimeout(() => setCopiedRunner(false), 2000);
    } else {
      setCopiedSpectator(true);
      setTimeout(() => setCopiedSpectator(false), 2000);
    }
  };

  const handlePrintQR = (title: string, subtitle: string, qrUrl: string, url: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Impression QR Code - Ultimate Trail</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
              body {
                font-family: 'Inter', system-ui, sans-serif;
                text-align: center;
                color: #0f172a;
                background-color: #ffffff;
                margin: 0;
                padding: 40px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 90vh;
              }
              .card {
                max-width: 580px;
                border: 4px solid #4f46e5;
                border-radius: 32px;
                padding: 45px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
              }
              .logo {
                font-size: 14px;
                font-weight: 900;
                color: #4f46e5;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 20px;
              }
              h1 {
                font-size: 32px;
                font-weight: 900;
                letter-spacing: -1px;
                margin: 10px 0;
                color: #1e1b4b;
              }
              p {
                font-size: 15px;
                line-height: 1.6;
                color: #475569;
                margin-bottom: 35px;
                max-width: 480px;
              }
              .qr-container {
                background: #f8fafc;
                border: 3px dashed #cbd5e1;
                border-radius: 24px;
                padding: 30px;
                display: inline-block;
                margin-bottom: 25px;
              }
              .qr-container img {
                display: block;
                width: 250px;
                height: 250px;
              }
              .link {
                font-family: monospace;
                font-size: 13px;
                font-weight: 700;
                color: #4f46e5;
                background: #f1f5f9;
                padding: 8px 16px;
                border-radius: 20px;
                word-break: break-all;
                display: inline-block;
              }
              .print-tip {
                margin-top: 40px;
                font-size: 11px;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              @media print {
                body { padding: 0; }
                .card { border: none; box-shadow: none; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">🌲 ULTIMATE TRAIL VTT RANDO</div>
              <h1>${title}</h1>
              <p>${subtitle}</p>
              <div class="qr-container">
                <img src="${qrUrl}" alt="QR Code" />
              </div>
              <div>
                <span class="link">${url}</span>
              </div>
              <p class="print-tip">Scannez d'un geste pour vous connecter instantanément</p>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 800);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Calculate pricing based on the runner count
  const calculateBilling = (count: number) => {
    if (count <= 10) {
      return { price: 0, label: "Formule Offerte", description: "Inclus jusqu'à 10 compétiteurs" };
    } else if (count <= 20) {
      return { price: 15, label: "Forfait Découverte VTT/Rando", description: "Prix fixe de 11 à 20 coureurs" };
    } else if (count <= 50) {
      return { price: 45, label: "Forfait Club Randonnée", description: "Tarif ajusté de 21 à 50 coureurs" };
    } else if (count <= 100) {
      return { price: 90, label: "Forfait Élite Trail", description: "Tarif ajusté de 51 à 100 coureurs" };
    } else {
      return { price: 150, label: "Forfait Compétition Ultime", description: "Tarif ajusté jusqu'à 200 coureurs (Max)" };
    }
  };

  const billing = calculateBilling(runnersCount);

  // Handle file inputs
  const handleGPXFile = (file: File) => {
    if (!file.name.endsWith('.gpx') && !file.name.endsWith('.xml')) {
      setGpxError('Seuls les fichiers avec extension .gpx ou .xml sont acceptés.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const points = parseGPXString(text);
        if (points.length > 5) {
          onUploadGPX(file.name.replace('.gpx', ''), points);
          setGpxError('');
        } else {
          setGpxError('Le fichier GPX ne contient pas assez de points de tracé exploitables.');
        }
      } catch (err) {
        setGpxError('Erreur de lecture ou fichier GPX corrompu.');
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

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleGPXFile(e.target.files[0]);
    }
  };

  const handleAddRunnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRunnerName.trim()) {
      setErrorMessage('Veuillez spécifier le nom complet du randonneur.');
      return;
    }
    const success = onAddRunner(newRunnerName.trim(), newRunnerType);
    if (success) {
      setNewRunnerName('');
      setErrorMessage('');
    } else {
      setErrorMessage('La limite maximale de 200 coureurs pour cette compétition a été atteinte.');
    }
  };

  // Generate and download a sample GPX file to help users
  const handleDownloadSampleGPX = () => {
    const dummyGpxContent = generateDummyGPX();
    const blob = new Blob([dummyGpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'parcours_test_ultimate_trail.gpx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. GPX Upload Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-black tracking-wide uppercase text-slate-800 mb-2 flex items-center gap-2">
          <Upload className="w-4 h-4 text-indigo-600" />
          Importer le Fichier de Trace GPX
        </h3>
        <p className="text-xs text-slate-500 mb-4 font-normal">
          Les cavaliers et coureurs suivent une ligne. Importez un fichier XML GPX pour dessiner l'itinéraire exact sur la carte.
        </p>

        {/* Drag and Drop Box */}
        <div
          onDragEnter={onDrag}
          onDragOver={onDrag}
          onDragLeave={onDrag}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-indigo-400 bg-indigo-50/50'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".gpx,.xml"
            onChange={handleManualUpload}
          />
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">
            Déposez votre fichier .gpx ici, ou <span className="text-indigo-600 underline">parcourez vos fichiers</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">Format .gpx normalisé ou XML (Wpt/Trk)</p>
          
          {currentRoute.id === 'uploaded' && (
            <div className="mt-3 inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              ✓ Itinéraire Customisé Actif ({currentRoute.name})
            </div>
          )}
        </div>

        {gpxError && (
          <div className="mt-2 text-[10px] font-mono font-bold text-red-650 flex items-center gap-1">
            <AlertCircle className="w-3" /> {gpxError}
          </div>
        )}

        {/* Dummy GPX Generator for Testing */}
        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-[11px] gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="text-slate-500 font-semibold">Besoin d'un fichier GPX de test ?</span>
          </div>
          <button
            onClick={handleDownloadSampleGPX}
            className="text-[10px] bg-white hover:bg-slate-100 font-extrabold px-2.5 py-1.5 rounded-lg text-indigo-600 border border-slate-200 transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-sm"
          >
            Télécharger GPX Test
          </button>
        </div>
      </div>

      {/* --- 💰 STRIPE CONNECT & FEE MANAGEMENT --- */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-black tracking-wide uppercase text-slate-800 mb-2 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-indigo-600" />
          Tarification & Stripe Connect Direct
        </h3>
        <p className="text-xs text-slate-500 mb-4 font-normal">
          Percevez directement les frais d'inscription des participants sur votre compte bancaire. Les fonds sont déposés de manière autonome et sécurisée.
        </p>

        {!currentOrganizer ? (
          <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-250 text-center space-y-2">
            <Lock className="w-5 h-5 text-slate-400 mx-auto" />
            <h4 className="text-[11.5px] font-extrabold text-slate-700 uppercase tracking-wider">Configuration Restreinte</h4>
            <p className="text-[10.5px] text-slate-500 max-w-sm mx-auto leading-relaxed font-sans">
              Veuillez vous authentifier en tant qu'organisateur (via le bouton de profil en haut à droite) pour configurer les tarifs et connecter Stripe.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Display / Update Route Fee */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-inner">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                Frais d'inscription coureur (€) :
              </label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">€</span>
                  <input
                    type="number"
                    min="0"
                    max="250"
                    value={localFee}
                    onChange={(e) => {
                      setLocalFee(e.target.value);
                      setFeeUpdateSuccess(false);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-7 pr-3.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateRouteFee) {
                      onUpdateRouteFee(Number(localFee) || 0);
                      setFeeUpdateSuccess(true);
                      setTimeout(() => setFeeUpdateSuccess(false), 2500);
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl border border-indigo-500 transition-all active:scale-95 cursor-pointer shadow"
                >
                  Mettre à jour
                </button>
              </div>
              {feeUpdateSuccess && (
                <p className="text-[9.5px] text-emerald-650 font-bold mt-1.5 flex items-center gap-1 animate-bounce">
                  ✓ Tarif mis à jour avec succès pour ce parcours !
                </p>
              )}
              <p className="text-[9.5px] text-slate-450 mt-1.5 leading-normal">
                Les coureurs devront s'acquitter de ce montant par carte avant d'enregistrer leur position GPS. Laissez à 0 pour un parcours gratuit.
              </p>
            </div>

            {/* Connection status */}
            {currentOrganizer.stripeStatus === 'active' ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-emerald-850 tracking-wider">
                      Stripe Connect Actif
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">
                    ID: {currentOrganizer.stripeAccountId}
                  </span>
                </div>
                <p className="text-[10.5px] text-emerald-800 leading-normal font-sans">
                  Votre compte bancaire est correctement lié ! Les frais d'inscription seront automatiquement reversés sur votre compte, déduction faite de {platformCommission}% de frais de service.
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5">
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Réception des paiements non configurée
                  </h4>
                  <p className="text-[10.5px] text-slate-500 mt-1 leading-normal font-sans">
                    Pour recevoir les inscriptions en direct de vos coureurs directement sur votre compte bancaire, liez votre compte avec Stripe Connect.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onStripeConnect}
                  disabled={stripeLoading}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-850 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-850 shadow cursor-pointer disabled:opacity-50"
                >
                  {stripeLoading ? (
                    <RefreshCw className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Landmark className="w-4 h-4 text-indigo-400" />
                  )}
                  <span>
                    {stripeLoading ? "Lancement Stripe..." : "Activer la réception des fonds (Stripe)"}
                  </span>
                </button>

                <p className="text-[9px] text-slate-450 leading-relaxed text-center font-sans">
                  Sécurisé par Stripe. En mode test/démo sans clé d'API réelle configurée, une liaison test instantanée sera simulée.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Partage & QR Code Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-black tracking-wide uppercase text-slate-800 mb-2 flex items-center gap-2">
          <QrCode className="w-4 h-4 text-indigo-600 animate-pulse" />
          Partage de la Course & Inscription Coureurs
        </h3>
        <p className="text-xs text-slate-500 mb-4 font-normal">
          Envoyez ce QR code ou ce lien à vos coureurs pour cette randonnée spécifiquement (<span className="font-extrabold text-slate-800">{currentRoute.name}</span>). Dès qu'ils scannent et démarrent leur trace GPS, vous les verrez s'enregistrer et s'animer en temps réel sur la carte ci-contre.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between items-center text-center shadow-inner">
          <div className="w-full">
            <span className="inline-block bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider mb-2">
              🏃‍♂️ QR Code : {currentRoute.name}
            </span>
            <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-tight mb-1">Inscription & Suivi GPS Direct</h4>
            <p className="text-[10px] text-slate-500 font-medium leading-normal mb-3 max-w-[340px] mx-auto">
              À faire scanner par les participants à la ligne de départ pour qu'ils rejoignent instantanément votre console de suivi.
            </p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm mb-3.5">
            <img 
              src={runnerQrUrl} 
              alt="QR Inscription" 
              className="w-[140px] h-[140px] object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="w-full space-y-2 max-w-sm">
            <button
              onClick={() => handleCopyLink(runnerUrl, 'runner')}
              className="w-full bg-white hover:bg-slate-100 text-[10.5px] font-extrabold py-2 px-3 border border-slate-200 rounded-lg text-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
            >
              {copiedRunner ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-650 animate-bounce" />
                  <span>Lien copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copier le lien d'inscription</span>
                </>
              )}
            </button>
            
            <button
              onClick={() => handlePrintQR(
                `INSCRIPTION RANDONNÉE : ${currentRoute.name.toUpperCase()}`,
                `Scannez ce QR Code pour vous enregistrer sur le parcours "${currentRoute.name}" (${currentRoute.length} km) et diffuser votre position GPS en direct. Aucun compte requis.`,
                runnerQrUrl,
                runnerUrl
              )}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[10.5px] font-extrabold py-2 px-3 border border-indigo-500 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow hover:shadow-indigo-100 active:scale-98"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer l'affiche d'inscription</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Add Runner Form / Forfait Management */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-black tracking-wide uppercase text-slate-800 mb-2 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-600" />
          Gestion des Participants & Forfait
        </h3>
        <p className="text-xs text-slate-500 mb-4 font-normal">
          Inscrivez un nouveau participant en spécifiant son sport. La tarification est à la charge de l'organisateur.
        </p>

        <form onSubmit={handleAddRunnerSubmit} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                id="runner-name-input"
                type="text"
                placeholder="Ex: Jean-Marc Dumont"
                value={newRunnerName}
                onChange={(e) => setNewRunnerName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
              />
            </div>
            <div>
              <select
                id="runner-type-select"
                value={newRunnerType}
                onChange={(e) => setNewRunnerType(e.target.value as RunnerType)}
                className="bg-slate-50 text-xs font-bold border border-slate-200 rounded-xl px-2 py-2 text-slate-750 focus:outline-none focus:indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="VTT">🚲 VTT</option>
                <option value="Rando">🥾 Rando</option>
                <option value="Cavalier">🐎 Cavalier</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2.5 rounded-xl border border-indigo-500 transition-colors flex items-center justify-center h-full active:scale-95 cursor-pointer"
              title="Valider l'inscription"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {errorMessage && (
            <div className="text-[10px] font-mono font-bold text-red-600">
              * {errorMessage}
            </div>
          )}
        </form>

        {/* Pricing Dashboard */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2 shadow-inner">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coureurs inscrits:</span>
            <span className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-full ${runnersCount > 10 ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-150'}`}>
              {runnersCount} / 200 compétiteurs
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <div>
              <h4 className="text-xs font-black text-slate-800">{billing.label}</h4>
              <p className="text-[10px] text-slate-500 font-semibold">{billing.description}</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-black font-mono text-indigo-600">{billing.price} €</span>
              <span className="block text-[8px] text-slate-500 font-bold uppercase">Par Compétition</span>
            </div>
          </div>

          {runnersCount > 10 && (
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-[10px] text-amber-800 flex items-start gap-1.5 leading-normal">
              <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600 animate-pulse" />
              <span>Forfait applicable : Le fait d'héberger plus de 10 coureurs bascule l'application sur un hébergement dédié payant (facturé 15€ fixes).</span>
            </div>
          )}
        </div>

        {/* Bulk Mock runners generator */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-200 flex flex-col gap-2">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Générateur rapide de participants</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSimulateBulkRunners(10)}
              className="bg-white hover:bg-slate-50 text-slate-700 p-2 rounded-lg text-[10px] font-bold border border-slate-200 tracking-wide transition-colors active:scale-95 text-center flex items-center justify-center gap-1 cursor-pointer shadow-sm"
            >
              🏇 Set Standard (10 coureurs)
            </button>
            <button
              onClick={() => onSimulateBulkRunners(25)}
              className="bg-white hover:bg-slate-50 text-slate-700 p-2 rounded-lg text-[10px] font-bold border border-slate-200 tracking-wide transition-colors active:scale-95 text-center flex items-center justify-center gap-1 cursor-pointer shadow-sm"
            >
              🏁 Concurrence (25 coureurs)
            </button>
          </div>
        </div>
      </div>

      {/* 3. Global Control / Reset Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-black tracking-wide uppercase text-red-600 mb-2 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-600" />
          Réinitialisation & Sécurité
        </h3>
        <p className="text-xs text-slate-500 mb-4 font-normal">
          Bouton d'effacement complet pour clore une compétition et réattaquer une nouvelle course d'un seul clic.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onResetRace}
            className="flex-1 bg-white hover:bg-slate-100 text-[10.5px] font-extrabold py-2 px-3 border border-slate-200 text-amber-600 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            Réinitialiser Position / Chrono
          </button>
          <button
            onClick={onClearNames}
            className="flex-1 bg-red-600 hover:bg-red-700 text-[10.5px] font-extrabold py-2 px-3 text-white rounded-xl transition-all border border-red-550 flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" /> Supprimer Noms (Wipe)
          </button>
        </div>
      </div>
    </div>
  );
}
