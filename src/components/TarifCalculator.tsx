import { useState } from 'react';
import { ShieldCheck, CircleDollarSign, Info } from 'lucide-react';

interface TarifCalculatorProps {
  lang?: 'fr' | 'en';
}

export default function TarifCalculator({ lang = 'fr' }: TarifCalculatorProps) {
  const [estimateCount, setEstimateCount] = useState<number>(10);

  const isFr = lang === 'fr';

  // Formula details
  const getTierDetails = (count: number) => {
    if (count <= 10) {
      return { 
        price: 0, 
        title: isFr ? "Formule Standard Gratuite" : "Free Standard Tier", 
        rate: isFr ? "0€ / course" : "0€ / event", 
        desc: isFr ? "Idéal pour les petites sorties ou les tests." : "Perfect for small local trips or initial test runs.", 
        includes: isFr 
          ? ["Suivi en direct de 10 coureurs", "Support GPX de base", "SOS & alertes de chute", "Hébergement mutualisé"]
          : ["Live tracking of 10 runners", "Basic GPX mapping setup", "SOS & physical shock alerts", "Shared micro-server hosting"]
      };
    } else if (count <= 20) {
      return { 
        price: 15, 
        title: isFr ? "Forfait Découverte VTT Rando" : "Club Discovery Pack", 
        rate: isFr ? "15€ fixe / course" : "15€ flat / event", 
        desc: isFr ? "Idéal pour les sorties de clubs locaux." : "Ideal for weekly runs and small club outings.", 
        includes: isFr
          ? ["Suivi en direct de 20 coureurs", "Panneau de contrôle organisateur", "Alertes d'inactivité optimisées", "Bande passante prioritaire"]
          : ["Live tracking of 20 runners", "Full operator control deck", "Optimised immobility alerts", "Priority bandwidth channel"]
      };
    } else if (count <= 50) {
      return { 
        price: 45, 
        title: isFr ? "Forfait Club Randonnée" : "Trail Club Package", 
        rate: isFr ? "45€ fixe / course" : "45€ flat / event", 
        desc: isFr ? "Idéal pour les petits tournois ou interclubs." : "Great choice for localized tournaments or interclubs.", 
        includes: isFr
          ? ["Suivi de 50 coureurs", "Tableau des temps intermédiaires", "Extraction des statistiques de sécurité", "Hébergement dédié haute disponibilité"]
          : ["Live tracking of 50 runners", "Intermediate check times board", "Safety logs & data export", "High-availability dedicated node"]
      };
    } else if (count <= 100) {
      return { 
        price: 90, 
        title: isFr ? "Forfait Élite Trail" : "Elite Trail Premium", 
        rate: isFr ? "90€ fixe / course" : "90€ flat / event", 
        desc: isFr ? "Pour les concours d'importance moyenne." : "Engineered for medium-size public outdoor matches.", 
        includes: isFr
          ? ["Suivi en direct de 100 coureurs", "Données de vitesse interpolées au mètre", "Export des chronos au format Excel/CSV", "Support mail technique 24/7"]
          : ["Live tracking of 100 runners", "Granular meter velocity calculations", "Time metrics export (Excel/CSV)", "Priority 24/7 email support"]
      };
    } else {
      return { 
        price: 150, 
        title: isFr ? "Forfait Compétition Ultime" : "Ultimate Competition Tier", 
        rate: isFr ? "150€ fixe / course" : "150€ flat / event", 
        desc: isFr ? "Hébergement ultra-performant pour grands trails." : "Ultra-high performance dedicated environment for big events.", 
        includes: isFr
          ? ["Suivi en direct de 200 coureurs (Max)", "Canal d'alerte SOS par SMS intégrateur", "Serveur dédié Redondé", "Rapports d'incident PDF automatiques"]
          : ["Live tracking of 200 runners (Max)", "Emergency SMS gateway options", "Redundant backup infrastructure", "Automatic PDF incident reports"]
      };
    }
  };

  const currentTier = getTierDetails(estimateCount);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-full">
      <div className="flex items-center gap-2.5 mb-2">
        <CircleDollarSign className="w-5 h-5 text-indigo-600" />
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-850">
          {isFr ? "Simulateur de Tarification" : "Pricing Rates Simulator"}
        </h3>
      </div>
      <p className="text-xs text-slate-500 mb-4 font-normal">
        {isFr
          ? "L'organisateur paye au forfait de manière transparente. Aucun frais caché par randonneur. Simulez vos tarifs pour de futurs évènements :"
          : "The organizer pays a transparent, flat price per event. No sneaky per-runner commissions. View pricing simulations for future matches:"}
      </p>

      {/* Slider Control */}
      <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5 shadow-inner">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500">
            {isFr ? "Nb de participants estimés :" : "Estimated total participants:"}
          </span>
          <span className="font-mono text-sm font-black text-indigo-600">
            {estimateCount} {isFr ? "coureurs" : "runners"}
          </span>
        </div>
        <input
          id="pricing-slider"
          type="range"
          min="1"
          max="200"
          value={estimateCount}
          onChange={(e) => setEstimateCount(parseInt(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono font-bold">
          <span>1 ({isFr ? "Gratuit" : "Free"})</span>
          <span>10 ({isFr ? "Gratuit" : "Free"})</span>
          <span>20 (15€)</span>
          <span>50 (45€)</span>
          <span>100 (90€)</span>
          <span>200 (150€)</span>
        </div>
      </div>

      {/* Recommended Box Result */}
      <div className="border border-indigo-100 bg-indigo-50/15 rounded-xl p-4 mb-4">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <span className="text-[9px] bg-indigo-100 text-indigo-800 font-mono font-black py-0.5 px-2 rounded-full border border-indigo-150 uppercase tracking-widest mb-1 inline-block">
              {isFr ? "RECOMMANDATION FORFAIT" : "PACKAGE RECOMMENDATION"}
            </span>
            <h4 className="font-black text-sm text-slate-800">{currentTier.title}</h4>
            <p className="text-[11px] text-slate-500 italic font-medium mt-0.5">{currentTier.desc}</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-mono font-black text-indigo-600">{currentTier.price} €</span>
            <span className="block text-[8px] text-slate-500 uppercase tracking-wider font-bold">
              {isFr ? "Par Évènement" : "Per Event"}
            </span>
          </div>
        </div>

        {/* Benefits list */}
        <div className="mt-4 space-y-1 bg-white p-3 rounded-lg border border-slate-150 shadow-sm">
          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
            {isFr ? "INCLUS DANS LA FORMULE :" : "INCLUDED IN THE PLAN:"}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-sans">
            {currentTier.includes.map((benefit, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] text-slate-600 font-sans font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-650 flex-shrink-0" />
                <span className="truncate">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notes / Term Rules */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] text-slate-500 flex gap-1.5 items-start font-mono">
        <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <p>
          {isFr
            ? "Conformément au règlement du concours : base gratuite jusqu'à 10 coureurs. Au-delà, un forfait unique est calculé. Paiement sécurisé intégré via Stripe / Apple Pay pour l'organisateur. Les participants n'ont rien à régler."
            : "In accordance with event policies: free tier covers up to 10 runners. Beyond that, a simple flat plan is offered. Fully integrated secure checkout via Stripe / Apple Pay. Competitors do not pay anything."}
        </p>
      </div>
    </div>
  );
}
