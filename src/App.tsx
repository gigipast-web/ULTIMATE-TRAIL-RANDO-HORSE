import { useState, useEffect, useRef } from 'react';
import { RouteData, Runner, RunnerType, Organizer } from './types';
import { getPresetRoutes, getInitialRunners, getDemoRunners, sortRunners, getPathLength } from './data';
import MapComponent from './components/MapComponent';
import Leaderboard from './components/Leaderboard';
import { db, auth } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import OrganizerPanel from './components/OrganizerPanel';
import RunnerMobileMode from './components/RunnerMobileMode';
import TarifCalculator from './components/TarifCalculator';
import SpectatorPanel from './components/SpectatorPanel';
import OrganizerAuth from './components/OrganizerAuth';
import RouteCreator from './components/RouteCreator';
import UserGuide from './components/UserGuide';
import CreatorDashboard from './components/CreatorDashboard';
import { 
  Play, Pause, AlertTriangle, ShieldAlert, Navigation, Settings, HelpCircle, 
  RefreshCw, Eye, Landmark, User, Zap, Users, Globe, Radio, Layers, Check, Info, LogOut, BookOpen, Sparkles
} from 'lucide-react';

// Helper to generate a tailored track in the organizer's operating region
const generateDefaultOrganizerRoute = (orgId: string, orgName: string, regionName: string): RouteData => {
  let baseLat = 48.05;
  let baseLng = 6.92;
  let catName = "VTT" as RunnerType;
  let pathName = "Trail des Crêtes Vosgiennes";

  const regionLower = regionName.toLowerCase();
  if (regionLower.includes('alpe')) {
    baseLat = 45.923;
    baseLng = 6.868;
    catName = "Rando";
    pathName = "Boucle d'Altitude des Alpes";
  } else if (regionLower.includes('provence') || regionLower.includes('verdon')) {
    baseLat = 43.74;
    baseLng = 6.25;
    catName = "Cavalier";
    pathName = "Escapade des Gorges du Verdon";
  } else if (regionLower.includes('bretagne') || regionLower.includes('brocéliande')) {
    baseLat = 48.01;
    baseLng = -2.17;
    catName = "Rando";
    pathName = "Sentier de Brocéliande";
  }

  // Create a beautiful physical track line
  const points: [number, number][] = [];
  const numPoints = 80;
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const lat = baseLat + 0.03 * Math.sin(t * Math.PI) + 0.012 * Math.sin(t * 3 * Math.PI);
    const lng = baseLng + 0.05 * t + 0.01 * Math.sin(t * 4 * Math.PI);
    points.push([lat, lng]);
  }

  const length = getPathLength(points);
  const checkpoints = [
    {
      id: `cp-def-1`,
      name: 'Col du Belvédère',
      location: points[Math.floor(points.length * 0.35)],
      distance: Number((length * 0.35).toFixed(1))
    },
    {
      id: `cp-def-2`,
      name: 'Poste Ravitaillement',
      location: points[Math.floor(points.length * 0.75)],
      distance: Number((length * 0.75).toFixed(1))
    }
  ];

  return {
    id: `route-default-${orgId}`,
    name: `${pathName} (${orgName})`,
    points,
    length,
    checkpoints,
    category: catName,
    region: regionName,
    organizerId: orgId,
    organizerName: orgName
  };
};

export default function App() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const presetRoutes = getPresetRoutes();

  // Current session persistence for Organizer Profile
  const [currentOrganizer, setCurrentOrganizer] = useState<Organizer | null>(() => {
    const stored = localStorage.getItem('ultimate_trail_current_organizer');
    return stored ? JSON.parse(stored) : null;
  });

  const [stripeLoading, setStripeLoading] = useState(false);

  const getOrganizerRoutes = (orgId: string, orgName?: string, regionName?: string): RouteData[] => {
    const data = localStorage.getItem(`ultimate_trail_routes_${orgId}`);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        // Fallback
      }
    }
    
    // Auto-create a beautiful default course for first-time profile login
    if (orgName && regionName) {
      const fallback = generateDefaultOrganizerRoute(orgId, orgName, regionName);
      localStorage.setItem(`ultimate_trail_routes_${orgId}`, JSON.stringify([fallback]));
      return [fallback];
    }
    return [];
  };

  const getInitialActiveRoutes = (): RouteData[] => {
    const initialOrgStr = localStorage.getItem('ultimate_trail_current_organizer');
    if (initialOrgStr) {
      const org = JSON.parse(initialOrgStr) as Organizer;
      return getOrganizerRoutes(org.id, org.name, org.region || 'Grand Est');
    }
    return presetRoutes;
  };

  const [routes, setRoutes] = useState<RouteData[]>(getInitialActiveRoutes);
  
  const [selectedRoute, setSelectedRoute] = useState<RouteData>(() => {
    const initial = getInitialActiveRoutes();
    return initial[0] || presetRoutes[0];
  });
  
  // Espace Multi-Organisateur State (concurrent races state)
  const [raceStates, setRaceStates] = useState<Record<string, {
    runners: Runner[];
    elapsedSeconds: number;
    isPlaying: boolean;
    simMultiplier: number;
  }>>(() => {
    const initial: Record<string, {
      runners: Runner[];
      elapsedSeconds: number;
      isPlaying: boolean;
      simMultiplier: number;
    }> = {};

    const presets = getPresetRoutes();
    presets.forEach(route => {
      initial[route.id] = {
        runners: getInitialRunners(route),
        elapsedSeconds: 0,
        isPlaying: true, // Default running simultaneously!
        simMultiplier: 1
      };
    });

    return initial;
  });

  const [selectedRunnerId, setSelectedRunnerId] = useState<string | null>(null);
  
  // Tabs Navigation
  const [activeTab, setActiveTab] = useState<'organisateur' | 'spectateur' | 'coureur' | 'tarifs' | 'guide' | 'createur'>('guide');

  // User live location sharing via Geolocation API
  const [userSharing, setUserSharing] = useState<boolean>(false);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [userRunnerInfo, setUserRunnerInfo] = useState<{ name: string; bib: string } | null>(null);

  // Synchronized values for the CURRENT selected route to maintain complete backward-compatibility
  const currentRace = raceStates[selectedRoute.id] || {
    runners: [],
    elapsedSeconds: 0,
    isPlaying: false,
    simMultiplier: 1
  };
  const runners = currentRace.runners;
  const elapsedSeconds = currentRace.elapsedSeconds;
  const isPlaying = currentRace.isPlaying;
  const simMultiplier = currentRace.simMultiplier;

  // State wrappers to seamlessly bridge existing code
  const setRunners = (updater: Runner[] | ((prev: Runner[]) => Runner[])) => {
    setRaceStates(prev => {
      const current = prev[selectedRoute.id] || { runners: [], elapsedSeconds: 0, isPlaying: false, simMultiplier: 1 };
      const nextRunners = typeof updater === 'function' ? updater(current.runners) : updater;
      return {
        ...prev,
        [selectedRoute.id]: {
          ...current,
          runners: nextRunners
        }
      };
    });
  };

  const setElapsedSeconds = (updater: number | ((prev: number) => number)) => {
    setRaceStates(prev => {
      const current = prev[selectedRoute.id] || { runners: [], elapsedSeconds: 0, isPlaying: false, simMultiplier: 1 };
      const nextSec = typeof updater === 'function' ? updater(current.elapsedSeconds) : updater;
      return {
        ...prev,
        [selectedRoute.id]: {
          ...current,
          elapsedSeconds: nextSec
        }
      };
    });
  };

  const setIsPlaying = (updater: boolean | ((prev: boolean) => boolean)) => {
    setRaceStates(prev => {
      const current = prev[selectedRoute.id] || { runners: [], elapsedSeconds: 0, isPlaying: false, simMultiplier: 1 };
      const nextPlaying = typeof updater === 'function' ? updater(current.isPlaying) : updater;
      return {
        ...prev,
        [selectedRoute.id]: {
          ...current,
          isPlaying: nextPlaying
        }
      };
    });
  };

  const setSimMultiplier = (updater: number | ((prev: number) => number)) => {
    setRaceStates(prev => {
      const current = prev[selectedRoute.id] || { runners: [], elapsedSeconds: 0, isPlaying: false, simMultiplier: 1 };
      const nextMult = typeof updater === 'function' ? updater(current.simMultiplier) : updater;
      return {
        ...prev,
        [selectedRoute.id]: {
          ...current,
          simMultiplier: nextMult
        }
      };
    });
  };

  // Handle Stripe Connect & Stripe Checkout success callbacks from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // 1. Onboarding callback success
    if (params.get('stripe_callback') === 'success') {
      const accountId = params.get('accountId');
      const organizerId = params.get('organizerId');
      
      if (accountId && organizerId) {
        const updateStripeInfo = async () => {
          try {
            // Update Firestore
            const orgRef = doc(db, 'organizers', organizerId);
            await setDoc(orgRef, {
              stripeAccountId: accountId,
              stripeStatus: 'active'
            }, { merge: true });

            // Update local state if it matches the current organizer
            if (currentOrganizer && currentOrganizer.id === organizerId) {
              const updated = {
                ...currentOrganizer,
                stripeAccountId: accountId,
                stripeStatus: 'active' as const
              };
              setCurrentOrganizer(updated);
              localStorage.setItem('ultimate_trail_current_organizer', JSON.stringify(updated));
            }

            alert(lang === 'fr' 
              ? "🎉 Compte Stripe Connect configuré et lié avec succès ! Vous pouvez maintenant percevoir les inscriptions en direct." 
              : "🎉 Stripe Connect account linked successfully! You can now receive registrations.");
          } catch (err) {
            console.error("Failed to update Stripe status in Firestore:", err);
          } finally {
            // Clean URL query parameters
            window.history.replaceState({}, document.title, window.location.pathname + '?tab=organisateur');
          }
        };
        updateStripeInfo();
      }
    }

    // 2. Checkout callback success
    if (params.get('checkout_callback') === 'success') {
      const routeId = params.get('routeId');
      const runnerId = params.get('runnerId');
      const amount = params.get('amount');

      if (routeId && runnerId) {
        const updateRunnerPayment = async () => {
          try {
            // Update Firestore with paymentStatus 'paid'
            const rRef = doc(db, 'routes', routeId, 'runners', runnerId);
            await setDoc(rRef, {
              paymentStatus: 'paid',
              entryFeePaid: Number(amount) || 0
            }, { merge: true });

            // Ensure tab switches to 'coureur' so they see tracking can start
            setActiveTab('coureur');
            
            alert(lang === 'fr'
              ? "💳 Paiement validé avec succès ! Votre dossard est actif. Vous pouvez démarrer votre randonnée."
              : "💳 Payment successful! Your bib is active. You can now start your adventure.");
          } catch (err) {
            console.error("Failed to update runner payment in Firestore:", err);
          } finally {
            // Clean URL query parameters
            window.history.replaceState({}, document.title, window.location.pathname + `?tab=coureur&routeId=${routeId}`);
          }
        };
        updateRunnerPayment();
      }
    }
  }, [currentOrganizer, lang]);

  // Switch tabs dynamically on application load based on query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'coureur' || tabParam === 'spectateur' || tabParam === 'organisateur' || tabParam === 'tarifs') {
      setActiveTab(tabParam);
    }
  }, []);

  // Set selected route based on routeId in query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const routeIdParam = params.get('routeId');
    if (routeIdParam && routes.length > 0) {
      const found = routes.find(r => r.id === routeIdParam);
      if (found) {
        setSelectedRoute(found);
      }
    }
  }, [routes]);

  // 1. Synchronize remote Firestore routes into state real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'routes'), (snapshot) => {
      const firestoreRoutes: RouteData[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        firestoreRoutes.push({
          id: docSnap.id,
          name: data.name,
          points: data.points,
          length: data.length,
          checkpoints: data.checkpoints,
          category: data.category,
          region: data.region,
          organizerId: data.organizerId,
          organizerName: data.organizerName
        } as RouteData);
      });
      
      const presets = getPresetRoutes();

      // If currentOrganizer is logged in, sync any missing tracks from Firestore to localStorage to keep them persisted
      if (currentOrganizer) {
        const myFirestoreRoutes = firestoreRoutes.filter(r => r.organizerId === currentOrganizer.id);
        if (myFirestoreRoutes.length > 0) {
          const localOrgRoutes = getOrganizerRoutes(currentOrganizer.id, currentOrganizer.name, currentOrganizer.region || 'Grand Est');
          let updated = [...localOrgRoutes];
          let changed = false;
          myFirestoreRoutes.forEach(fr => {
            if (!updated.some(ur => ur.id === fr.id)) {
              updated.push(fr);
              changed = true;
            }
          });
          if (changed) {
            localStorage.setItem(`ultimate_trail_routes_${currentOrganizer.id}`, JSON.stringify(updated));
          }
        }
      }

      setRoutes(prev => {
        const combined = [...presets];

        // Keep local organizer routes
        if (currentOrganizer) {
          const localOrgRoutes = getOrganizerRoutes(currentOrganizer.id, currentOrganizer.name, currentOrganizer.region || 'Grand Est');
          localOrgRoutes.forEach(or => {
            if (!combined.some(r => r.id === or.id)) {
              combined.push(or);
            }
          });
        }

        firestoreRoutes.forEach(fr => {
          if (!combined.some(r => r.id === fr.id)) {
            combined.push(fr);
          }
        });
        return combined;
      });
    }, (error) => {
      console.warn("Firestore routes sync issue, using local presets:", error);
    });
    
    return () => unsubscribe();
  }, [currentOrganizer]);

  // 2. Spectator/Runner Real-time subscription to runner telemetry from Firestore
  useEffect(() => {
    if (currentOrganizer || !selectedRoute) return;
    
    const unsubscribe = onSnapshot(collection(db, 'routes', selectedRoute.id, 'runners'), (snapshot) => {
      if (snapshot.empty) return;
      
      const firestoreRunners: Runner[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        firestoreRunners.push({
          id: docSnap.id,
          name: data.name,
          type: data.type,
          bibNumber: data.bibNumber,
          currentPos: [data.lat, data.lng],
          speed: data.speed,
          lastActive: new Date(data.lastActive),
          status: data.status,
          statusReason: data.statusReason || undefined,
          progress: data.progress,
          distanceCovered: data.distanceCovered,
          distanceRemaining: data.distanceRemaining,
          checkpointsCleared: data.checkpointsCleared || [],
          checkpointTimes: data.checkpointTimes || {},
          currentRank: data.currentRank
        });
      });
      
      const sorted = sortRunners(firestoreRunners);
      setRaceStates(prev => ({
        ...prev,
        [selectedRoute.id]: {
          ...prev[selectedRoute.id],
          runners: sorted
        }
      }));
    }, (error) => {
      console.warn("Firestore runners sync read issue:", error);
    });
    
    return () => unsubscribe();
  }, [selectedRoute.id, currentOrganizer]);

  // 3. Synchronize master simulation runners state to Firestore (Debounced 500ms)
  useEffect(() => {
    if (!currentOrganizer || !selectedRoute || runners.length === 0) return;
    
    const syncRunnersToFirestore = async () => {
      try {
        await Promise.all(
          runners.map(runner => 
            setDoc(doc(db, 'routes', selectedRoute.id, 'runners', runner.id), {
              name: runner.name,
              type: runner.type,
              bibNumber: runner.bibNumber,
              lat: runner.currentPos[0],
              lng: runner.currentPos[1],
              speed: runner.speed,
              lastActive: runner.lastActive instanceof Date ? runner.lastActive.toISOString() : new Date().toISOString(),
              status: runner.status,
              statusReason: runner.statusReason || '',
              progress: runner.progress,
              distanceCovered: runner.distanceCovered,
              distanceRemaining: runner.distanceRemaining,
              checkpointsCleared: runner.checkpointsCleared,
              checkpointTimes: runner.checkpointTimes,
              currentRank: runner.currentRank
            })
          )
        );
      } catch (err) {
        console.warn("Firestore runners sync write issue:", err);
      }
    };
    
    const timer = setTimeout(syncRunnersToFirestore, 500);
    return () => clearTimeout(timer);
  }, [runners, selectedRoute.id, currentOrganizer]);

  // Synchronize custom tracks when organizer logs in or signs up
  useEffect(() => {
    if (currentOrganizer) {
      const orgRoutes = getOrganizerRoutes(currentOrganizer.id, currentOrganizer.name, currentOrganizer.region || 'Grand Est');
      setRoutes(orgRoutes);
      if (orgRoutes.length > 0) {
        setSelectedRoute(orgRoutes[0]);
      }
    } else {
      const presets = getPresetRoutes();
      setRoutes(presets);
      setSelectedRoute(presets[0]);
    }
  }, [currentOrganizer]);

  const handleLogin = (org: Organizer) => {
    setCurrentOrganizer(org);
    localStorage.setItem('ultimate_trail_current_organizer', JSON.stringify(org));
  };

  const handleLogout = () => {
    setCurrentOrganizer(null);
    localStorage.removeItem('ultimate_trail_current_organizer');
  };

  const handleRouteCreated = async (newRoute: RouteData) => {
    if (!currentOrganizer) return;
    const orgRoutes = [...getOrganizerRoutes(currentOrganizer.id, currentOrganizer.name, currentOrganizer.region), newRoute];
    localStorage.setItem(`ultimate_trail_routes_${currentOrganizer.id}`, JSON.stringify(orgRoutes));
    setRoutes(orgRoutes);
    setSelectedRoute(newRoute);

    try {
      await setDoc(doc(db, 'routes', newRoute.id), {
        name: newRoute.name,
        length: newRoute.length,
        points: newRoute.points,
        checkpoints: newRoute.checkpoints,
        category: newRoute.category,
        region: newRoute.region || 'Grand Est',
        organizerId: currentOrganizer.id,
        organizerName: currentOrganizer.name
      });
    } catch (error) {
      console.error("Failed to save route to Firestore:", error);
    }
  };

  // Dynamically load all organizer tracks + public presets for spectator and runner views
  const getAllAvailableRoutes = (): RouteData[] => {
    const presets = getPresetRoutes();
    const storedOrgs = localStorage.getItem('ultimate_trail_organizers');
    if (!storedOrgs) return presets;
    
    try {
      const orgs = JSON.parse(storedOrgs) as Organizer[];
      const customRoutes: RouteData[] = [];
      orgs.forEach(org => {
        const data = localStorage.getItem(`ultimate_trail_routes_${org.id}`);
        if (data) {
          const parsed = JSON.parse(data) as RouteData[];
          parsed.forEach(cr => {
            if (!customRoutes.some(existing => existing.id === cr.id) && !presets.some(p => p.id === cr.id)) {
              customRoutes.push(cr);
            }
          });
        }
      });
      return [...presets, ...customRoutes];
    } catch (e) {
      return presets;
    }
  };

  // Ensure selected route is initialized in race states (like when a trace gets uploaded)
  useEffect(() => {
    if (selectedRoute && !raceStates[selectedRoute.id]) {
      setRaceStates(prev => ({
        ...prev,
        [selectedRoute.id]: {
          runners: getInitialRunners(selectedRoute),
          elapsedSeconds: 0,
          isPlaying: true,
          simMultiplier: 1
        }
      }));
    }
    setSelectedRunnerId(null);
  }, [selectedRoute, routes]);

  // Concurrent Multi-Race Simulation Loop (processes all playing routes in parallel)
  useEffect(() => {
    const interval = setInterval(() => {
      setRaceStates(prev => {
        const next = { ...prev };
        let stateChanged = false;

        Object.keys(next).forEach(routeId => {
          const state = next[routeId];
          if (!state || !state.isPlaying) return;

          stateChanged = true;
          const route = routes.find(r => r.id === routeId);
          if (!route) return;

          const currentElapsed = state.elapsedSeconds + 1 * state.simMultiplier;
          const nextRunners = state.runners.map(runner => {
            if (runner.status === 'finished') return runner;

            const distanceDelta = (runner.speed / 3600) * state.simMultiplier;
            const newDistance = Number((runner.distanceCovered + distanceDelta).toFixed(3));
            
            let progress = newDistance / route.length;
            let status = runner.status;
            let statusReason = runner.statusReason;
            let currentPos = runner.currentPos;
            
            if (progress >= 1) {
              progress = 1.0;
              status = 'finished';
              statusReason = undefined;
              currentPos = route.points[route.points.length - 1];
            } else {
              const pointIndex = Math.floor(progress * (route.points.length - 1));
              currentPos = route.points[pointIndex] || route.points[0];
            }

            const newCheckpointsCleared = [...runner.checkpointsCleared];
            const newCheckpointTimes = { ...runner.checkpointTimes };

            route.checkpoints.forEach(cp => {
              if (newDistance >= cp.distance && !newCheckpointsCleared.includes(cp.id)) {
                newCheckpointsCleared.push(cp.id);
                const hours = Math.floor(currentElapsed / 3600);
                const minutes = Math.floor((currentElapsed % 3600) / 60);
                const seconds = currentElapsed % 60;
                const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                newCheckpointTimes[cp.id] = timeString;
              }
            });

            let speed = runner.speed;
            if (status === 'active' && Math.random() < 0.005) {
              status = 'warning';
              statusReason = 'Immobile > 5 min';
              speed = 0;
            } else if (status === 'warning' && Math.random() < 0.1) {
              status = 'active';
              statusReason = undefined;
              if (runner.type === 'VTT') speed = 18 + Math.random() * 6;
              else if (runner.type === 'Rando') speed = 4 + Math.random() * 1.5;
              else speed = 12 + Math.random() * 4;
            }

            return {
              ...runner,
              currentPos,
              progress,
              status,
              statusReason,
              speed: Number(speed.toFixed(1)),
              distanceCovered: Number(newDistance.toFixed(2)),
              distanceRemaining: Number(Math.max(0, route.length - newDistance).toFixed(2)),
              checkpointsCleared: newCheckpointsCleared,
              checkpointTimes: newCheckpointTimes
            };
          });

          next[routeId] = {
            ...state,
            elapsedSeconds: currentElapsed,
            runners: sortRunners(nextRunners)
          };
        });

        return stateChanged ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [routes]);

  // Handler for direct GPX uploads from user
  const handleUploadGPX = async (gpxName: string, points: [number, number][]) => {
    const customLength = getPathLength(points);
    
    // Create checkpoints along the custom route
    const checkpoints = [
      {
        id: 'upload-cp1',
        name: 'Zone Escarpée',
        location: points[Math.floor(points.length * 0.35)],
        distance: Number((customLength * 0.35).toFixed(1))
      },
      {
        id: 'upload-cp2',
        name: 'Col de Ravitaillement',
        location: points[Math.floor(points.length * 0.75)],
        distance: Number((customLength * 0.75).toFixed(1))
      }
    ];

    const newRoute: RouteData = {
      id: `uploaded-${Date.now()}`,
      name: `Trace Importée: ${gpxName}`,
      points,
      length: customLength,
      checkpoints,
      category: 'VTT',
      region: 'Région Importée 🌍',
      organizerId: currentOrganizer ? currentOrganizer.id : undefined,
      organizerName: currentOrganizer ? currentOrganizer.name : undefined
    };

    if (currentOrganizer) {
      const orgRoutes = [...getOrganizerRoutes(currentOrganizer.id, currentOrganizer.name, currentOrganizer.region), newRoute];
      localStorage.setItem(`ultimate_trail_routes_${currentOrganizer.id}`, JSON.stringify(orgRoutes));
      setRoutes(orgRoutes);
      setSelectedRoute(newRoute);

      try {
        await setDoc(doc(db, 'routes', newRoute.id), {
          name: newRoute.name,
          length: newRoute.length,
          points: newRoute.points,
          checkpoints: newRoute.checkpoints,
          category: newRoute.category,
          region: newRoute.region || 'Région Importée 🌍',
          organizerId: currentOrganizer.id,
          organizerName: currentOrganizer.name
        });
      } catch (error) {
        console.error("Failed to save uploaded route to Firestore:", error);
      }
    } else {
      setRoutes(prev => [newRoute, ...prev.filter(r => !r.id.startsWith('uploaded'))]);
      setSelectedRoute(newRoute);
    }
  };

  // Stripe Connect onboarding initialization
  const handleStripeConnect = async () => {
    if (!currentOrganizer) return;
    setStripeLoading(true);
    try {
      const response = await fetch('/api/stripe/create-connected-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizerId: currentOrganizer.id,
          email: currentOrganizer.email
        })
      });

      if (!response.ok) {
        throw new Error(lang === 'fr' ? "Erreur lors de la création du compte Stripe Connect." : "Failed to initiate Stripe Connect account.");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(lang === 'fr' ? "Lien d'onboarding introuvable." : "Onboarding link not found.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setStripeLoading(false);
    }
  };

  // Update entry fee for the current route (both locally and in Firestore)
  const handleUpdateRouteFee = async (fee: number) => {
    if (!selectedRoute?.id) return;
    
    // 1. Update Firestore
    try {
      const routeRef = doc(db, 'routes', selectedRoute.id);
      await setDoc(routeRef, { entryFee: fee }, { merge: true });
    } catch (err) {
      console.error("Failed to update route fee in Firestore:", err);
    }

    // 2. Update local state RouteData
    const updatedRoute = {
      ...selectedRoute,
      entryFee: fee
    };
    setSelectedRoute(updatedRoute);

    // 3. Update routes list
    setRoutes(prev => prev.map(r => r.id === selectedRoute.id ? updatedRoute : r));

    // 4. Update local storage routes list if it's an organizer route
    if (currentOrganizer) {
      const stored = getOrganizerRoutes(currentOrganizer.id, currentOrganizer.name, currentOrganizer.region);
      const updatedStored = stored.map(r => r.id === selectedRoute.id ? updatedRoute : r);
      localStorage.setItem(`ultimate_trail_routes_${currentOrganizer.id}`, JSON.stringify(updatedStored));
    }
  };

  // Reset progress and timers
  const handleResetRace = () => {
    setElapsedSeconds(0);
    setRunners(getInitialRunners(selectedRoute));
    setSelectedRunnerId(null);
  };

  // Reset event to empty list to register custom runners
  const handleEmptyRunnersToRegister = () => {
    if (confirm("Voulez-vous réinitialiser l'événement à vide ? Tous les coureurs de démonstration actuels seront supprimés afin que vous puissiez inscrire vos propres compétiteurs.")) {
      setRunners([]);
      setElapsedSeconds(0);
      setSelectedRunnerId(null);
    }
  };

  // Restore the 10 demo runners
  const handleRestoreDemoRunners = () => {
    setRunners(getDemoRunners(selectedRoute));
    setElapsedSeconds(0);
    setSelectedRunnerId(null);
  };

  // Reset runners to placeholders/template names
  const handleClearNames = () => {
    if (confirm("Supprimer tous les coureurs et réinitialiser les noms par défaut ?")) {
      handleResetRace();
    }
  };

  // Add individual participant dynamically
  const handleAddRunner = (name: string, type: RunnerType): boolean => {
    if (runners.length >= 200) return false;

    setRunners(prevRunners => {
      // Pick initial speeds based on sport
      let speed = 12;
      if (type === 'VTT') speed = 20;
      else if (type === 'Rando') speed = 5;

      const newBib = String(100 + prevRunners.length + 1);
      const newRunner: Runner = {
        id: `runner-${Date.now()}`,
        name,
        type,
        bibNumber: newBib,
        currentPos: selectedRoute.points[0],
        speed,
        lastActive: new Date(),
        status: 'active',
        progress: 0.0,
        distanceCovered: 0.0,
        distanceRemaining: selectedRoute.length,
        checkpointsCleared: [],
        checkpointTimes: {},
        currentRank: prevRunners.length + 1
      };

      const updated = [...prevRunners, newRunner];
      return sortRunners(updated);
    });

    return true;
  };

  // Generate bulk participants (e.g. 10 or 25 participants to test billing or trails scales)
  const handleSimulateBulkRunners = (count: number) => {
    // Reinitialize base runners but pad with simulated profiles up to target count
    const baseRunners = getInitialRunners(selectedRoute);
    let updatedRunners = [...baseRunners];

    if (count > 10) {
      const extraCount = count - 10;
      const extraNames = [
        { name: 'Sébastien Brun', type: 'VTT' },
        { name: 'Manon Colin', type: 'Rando' },
        { name: 'Guillaume Gaudin', type: 'VTT' },
        { name: 'Marine Thomas', type: 'Rando' },
        { name: 'Thierry Bonnet', type: 'Cavalier' },
        { name: 'Isabelle Vincent', type: 'Rando' },
        { name: 'Ludovic Renard', type: 'VTT' },
        { name: 'Sophie Prevost', type: 'Cavalier' },
        { name: 'Damien Aubert', type: 'VTT' },
        { name: 'Virginie Gauthier', type: 'Rando' },
        { name: 'Franck Marchand', type: 'Cavalier' },
        { name: 'Sylvie Caron', type: 'Rando' },
        { name: 'Benoît Masson', type: 'VTT' },
        { name: 'Caroline Dupuy', type: 'Cavalier' },
        { name: 'Anthony Lacroix', type: 'VTT' }
      ];

      for (let i = 0; i < extraCount; i++) {
        const index = i % extraNames.length;
        const profile = extraNames[index];
        const type = profile.type as RunnerType;
        
        let speed = 10;
        if (type === 'VTT') speed = 15 + Math.random() * 8;
        else if (type === 'Rando') speed = 4 + Math.random() * 1.2;
        else speed = 11 + Math.random() * 5;

        const progress = Math.random() * 0.1; // disperse near launch pads
        const pointIndex = Math.floor(progress * (selectedRoute.points.length - 1));
        const currentPos = selectedRoute.points[pointIndex] || selectedRoute.points[0];
        const dist = Number((selectedRoute.length * progress).toFixed(2));

        updatedRunners.push({
          id: `bulk-runner-${i}`,
          name: `${profile.name} (${i + 11})`,
          type,
          bibNumber: String(100 + updatedRunners.length + 1),
          currentPos,
          speed: Number(speed.toFixed(1)),
          lastActive: new Date(),
          status: 'active',
          progress,
          distanceCovered: dist,
          distanceRemaining: Number((selectedRoute.length - dist).toFixed(2)),
          checkpointsCleared: [],
          checkpointTimes: {},
          currentRank: updatedRunners.length + 1
        });
      }
    } else {
      // slice down to exactly 10
      updatedRunners = updatedRunners.slice(0, 10);
    }

    setRunners(sortRunners(updatedRunners));
  };

  // SOS direct triggers from organizer panel for instant feedback
  const handleTriggerSOS = (runnerId: string) => {
    setRunners(prev => prev.map(r => {
      if (r.id === runnerId) {
        return {
          ...r,
          status: 'sos',
          statusReason: 'Collission ou choc violent'
        };
      }
      return r;
    }));
  };

  const handleResolveSOS = (runnerId: string) => {
    setRunners(prev => prev.map(r => {
      if (r.id === runnerId) {
        let speed = 15;
        if (r.type === 'Rando') speed = 4.5;
        else if (r.type === 'Cavalier') speed = 14;

        return {
          ...r,
          status: 'active',
          statusReason: undefined,
          speed
        };
      }
      return r;
    }));
  };

  // Quick safety test presets from simulations
  const handleTriggerMockAlert = (type: 'fall' | 'gps' | 'all-clean') => {
    if (runners.length === 0) return;
    
    setRunners(prev => {
      if (type === 'all-clean') {
        return prev.map(r => ({ ...r, status: 'active', statusReason: undefined }));
      }

      return prev.map((r, idx) => {
        if (type === 'fall' && idx === 1) {
          return { ...r, status: 'sos', statusReason: 'Arrêt brutal : Chute probable ⚠️', speed: 0 };
        }
        if (type === 'gps' && idx === 3) {
          return { ...r, status: 'warning', statusReason: 'Perte balise : Inactif 12m', speed: 0 };
        }
        return r;
      });
    });
  };

  // Toggle true GPS sharing from current user's mobile simulation
  const handleToggleUserSharing = async (active: boolean, name: string, bib: string, pos?: [number, number], runnerId?: string) => {
    setUserSharing(active);
    const rId = runnerId || 'user_runner';
    if (active) {
      setUserRunnerInfo({ name, bib });
      if (pos) {
        setUserPosition(pos);
        // Write to Firestore in real-time so other consoles see us immediately
        try {
          await setDoc(doc(db, 'routes', selectedRoute.id, 'runners', rId), {
            name,
            type: 'Rando',
            bibNumber: bib,
            lat: pos[0],
            lng: pos[1],
            speed: 15.4,
            lastActive: new Date().toISOString(),
            status: 'active',
            progress: 0.1,
            distanceCovered: 1.5,
            distanceRemaining: Number(Math.max(0, selectedRoute.length - 1.5).toFixed(2)),
            checkpointsCleared: [],
            checkpointTimes: {},
            currentRank: 1
          }, { merge: true });
        } catch (e) {
          console.warn("Could not sync live runner coordinates to Firestore:", e);
        }
      }
    } else {
      setUserPosition(null);
      setUserRunnerInfo(null);
      // Remove the runner from Firestore on stop
      try {
        await deleteDoc(doc(db, 'routes', selectedRoute.id, 'runners', rId));
      } catch (e) {
        console.warn("Could not delete live runner from Firestore:", e);
      }
    }
  };

  // Calculate high-level metrics
  const activeCount = runners.filter(r => r.status === 'active').length;
  const warningCount = runners.filter(r => r.status === 'warning').length;
  const sosCount = runners.filter(r => r.status === 'sos').length;
  const finishedCount = runners.filter(r => r.status === 'finished').length;
  const avgSpeed = runners.length > 0
    ? Number((runners.reduce((acc, curr) => acc + curr.speed, 0) / runners.length).toFixed(1))
    : 0;

  // Format Elapsed time
  const formatTimer = (totSeconds: number) => {
    const hrs = Math.floor(totSeconds / 3600);
    const mins = Math.floor((totSeconds % 3600) / 60);
    const secs = totSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* 1. Header Toolbar */}
      <header className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-[1000] px-4 py-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-sm">
              🏔️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-800">ULTIMATE TRAIL <span className="text-indigo-600 font-black">VTT RANDO</span></h1>
                <span className="hidden sm:inline bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                  {lang === 'fr' ? "Espace Sécurisé" : "Secure Environment"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">
                {lang === 'fr' ? "Console Organisateur • Live Tracking" : "Organizer Console • Live Tracking"}
              </p>
            </div>
          </div>

          {/* Center/Spectator selective quick route navigator */}
          {(activeTab === 'spectateur' || activeTab === 'coureur') && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl self-start md:self-auto font-sans">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 font-mono whitespace-nowrap">
                {lang === 'fr' ? "🎯 Suivi Actif :" : "🎯 Active Track:"}
              </span>
              <select
                value={selectedRoute.id}
                onChange={(e) => {
                  const available = getAllAvailableRoutes();
                  const found = available.find(r => r.id === e.target.value);
                  if (found) setSelectedRoute(found);
                }}
                className="bg-transparent text-xs text-indigo-900 border-none font-bold py-0.5 focus:outline-none cursor-pointer pr-4"
              >
                {getAllAvailableRoutes().map(r => (
                  <option key={r.id} value={r.id} className="text-slate-800 font-medium bg-white">
                    [{r.organizerName ? r.organizerName.split(' ')[0] : 'Démo'}] {r.name} ({r.length} km)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tab Navigation Controls, Language Switcher & Organizer Account Hub */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto font-sans">
            
            {/* Sleek Flag Toggle Group */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
              <button
                onClick={() => setLang('fr')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  lang === 'fr'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-505 hover:text-slate-800'
                }`}
                title="Passer en Français"
              >
                <span>🇫🇷</span> <span>FR</span>
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  lang === 'en'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-505 hover:text-slate-800'
                }`}
                title="Switch to English"
              >
                <span>🇬🇧</span> <span>EN</span>
              </button>
            </div>

            {currentOrganizer ? (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 pl-3 pr-2 py-1 rounded-xl">
                <div className="flex flex-col text-left">
                  <span className="text-[8px] uppercase font-black tracking-wider text-indigo-600">
                    {lang === 'fr' ? "Compte Organisateur" : "Organizer Account"}
                  </span>
                  <span className="text-xs font-black text-slate-850 truncate max-w-[140px]" title={currentOrganizer.name}>
                    👤 {currentOrganizer.name}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title={lang === 'fr' ? "Déconnecter mon profil" : "Logout my profile"}
                >
                  <LogOut className="w-3.5 h-3.5 animate-pulse" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setActiveTab('organisateur'); }}
                className="hidden md:flex items-center gap-1.5 bg-slate-50 text-xs font-bold px-3 py-1.5 border border-slate-250 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-indigo-505" />
                <span>{lang === 'fr' ? "Espace Privé" : "Private Portal"}</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('guide')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'guide'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/55'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-650" />
                <span>{lang === 'fr' ? "Guide d'utilisation" : "User Guide"}</span>
              </button>
              <button
                onClick={() => setActiveTab('organisateur')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'organisateur'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/55'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{lang === 'fr' ? "Organisateur" : "Organizer"}</span>
              </button>
              <button
                onClick={() => setActiveTab('spectateur')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'spectateur'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/55'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{lang === 'fr' ? "Mode Spectateur" : "Spectator Mode"}</span>
              </button>
              <button
                onClick={() => setActiveTab('coureur')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'coureur'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/55'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{lang === 'fr' ? "Espace Coureur" : "Runner Portal"}</span>
              </button>
              <button
                onClick={() => setActiveTab('tarifs')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'tarifs'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/55'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>{lang === 'fr' ? "Simulateur Tarifs" : "Pricing Rates"}</span>
              </button>
              <button
                onClick={() => setActiveTab('createur')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'createur'
                    ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-250 animate-pulse'
                    : 'text-slate-500 hover:text-amber-650 hover:bg-amber-50/20'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-550" />
                <span>{lang === 'fr' ? "Espace Créateur 👑" : "Creator Area 👑"}</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* 2. Top-Level Telemetry Cards (Only visible on Organizer mode) */}
      {activeTab === 'organisateur' && currentOrganizer && (
        <section className="bg-slate-100/50 border-b border-slate-200 py-4 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-3.5">
            
            {/* Stat Card: Total */}
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Inscrits totals</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-mono font-black text-slate-900">{runners.length}</span>
                <span className="text-[10px] text-slate-500 font-semibold">coureurs</span>
              </div>
            </div>

            {/* Stat Card: En course */}
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-emerald-700 uppercase font-black tracking-wider">Actifs en course</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-mono font-black text-emerald-600">{activeCount}</span>
                <span className="text-[10px] text-emerald-600 font-semibold">coordonnées</span>
              </div>
            </div>

            {/* Stat Card: Suspicious halts */}
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-amber-700 uppercase font-black tracking-wider">Alertes Statiques</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-mono font-black text-amber-600">{warningCount}</span>
                <span className="text-[10px] text-amber-500 font-semibold font-mono">haltes</span>
              </div>
            </div>

            {/* Stat Card: Emergency SOS */}
            <div className={`border p-3.5 rounded-xl border-slate-200 shadow-sm flex flex-col justify-between transition-colors ${
              sosCount > 0 ? 'bg-rose-50 border-rose-300' : 'bg-white'
            }`}>
              <span className={`text-[10px] uppercase font-black tracking-wider ${sosCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`}>
                Rapports SOS Secours
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className={`text-2xl font-mono font-black ${sosCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {sosCount}
                </span>
                <span className={`text-[10px] font-semibold ${sosCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>urgents</span>
              </div>
            </div>

            {/* Stat Card: Speed averages */}
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
              <span className="text-[10px] text-indigo-700 uppercase font-black tracking-wider font-sans">Vitesse Moyenne</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-mono font-black text-indigo-600">{avgSpeed}</span>
                <span className="text-[10px] text-slate-500 font-semibold">km/h</span>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* 3. Main Body Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6">
        
        {/* Tab 1: Organizer Realtime Control / Dashboard */}
        {activeTab === 'organisateur' && !currentOrganizer && (
          <div className="py-2">
            <OrganizerAuth onLogin={handleLogin} />
          </div>
        )}

        {activeTab === 'organisateur' && currentOrganizer && (
          <div className="space-y-6">
            
            {/* Side-by-side Live Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
              
              {/* Left Sidebar or Control column */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Live Track selection and Simulation Timings */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                  
                  {/* Route choosing dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="route-select" className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Tracé de la compétition actif :</label>
                    <div className="flex items-center gap-2">
                      <select
                        id="route-select"
                        value={selectedRoute.id}
                        onChange={(e) => {
                          const selected = routes.find(r => r.id === e.target.value);
                          if (selected) setSelectedRoute(selected);
                        }}
                        className="bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2.5 rounded-xl font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        {routes.map(r => (
                          <option key={r.id} value={r.id}>
                            [{r.region ? r.region.split(' ')[0] : 'GPS'}] {r.name} ({r.length} km)
                          </option>
                        ))}
                      </select>
                      <span className="text-xs bg-indigo-50 text-indigo-700 font-mono font-black border border-indigo-150 px-2.5 py-1.5 rounded-xl">
                        {selectedRoute.region || 'France'}
                      </span>
                    </div>
                  </div>

                  {/* Simulated Timing and Clock */}
                  <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-center">
                    <div>
                      <span className="text-[8px] tracking-wider text-slate-500 uppercase block leading-none font-sans font-bold">Chronomètre</span>
                      <span className="text-sm font-black text-slate-800">{formatTimer(elapsedSeconds)}</span>
                    </div>
                    <div className="border-l border-slate-200 pl-4 flex items-center gap-1.5">
                      
                      {/* Play/Pause Button */}
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`p-2 rounded-lg transition-colors active:scale-95 flex items-center justify-center cursor-pointer ${
                          isPlaying ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/40' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250'
                        }`}
                        title={isPlaying ? "Mettre la simulation en pause" : "Lancer ou reprendre la simulation"}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>

                      {/* Speed Multipliers */}
                      <div className="flex gap-1">
                        {[1, 5, 15, 30].map(multiplier => (
                          <button
                            key={multiplier}
                            onClick={() => setSimMultiplier(multiplier)}
                            className={`text-[9px] font-black px-1.5 py-1 rounded transition-colors cursor-pointer ${
                              simMultiplier === multiplier
                                ? 'bg-indigo-600 text-white shadow font-extrabold'
                                : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            {multiplier}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Map Box Component (Standard Leaflet inside container) */}
                <div className="relative">
                  <MapComponent
                    route={selectedRoute}
                    runners={runners}
                    selectedRunnerId={selectedRunnerId}
                    onSelectRunner={setSelectedRunnerId}
                    userPosition={userPosition}
                    userSharing={userSharing}
                    userRunnerInfo={userRunnerInfo}
                  />
                </div>

                {/* --- 🎁 CONTROLES RAPIDES D'INSCRIPTION & REINITIALISATION --- */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                      <RefreshCw className="w-5 h-5 text-indigo-450 animate-spin-slow" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[12px] text-white uppercase tracking-wider">
                        Inscriptions & Préparations de la course
                      </h4>
                      <p className="text-[10.5px] text-slate-400 font-medium leading-normal mt-0.5 max-w-sm">
                        L'application démarre vierge pour vous permettre d'inscrire vos propres compétiteurs. Vous pouvez également charger des coureurs de démo.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={handleEmptyRunnersToRegister}
                      className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Réinitialiser à Vide</span>
                    </button>
                    {runners.length === 0 && (
                      <button
                        onClick={handleRestoreDemoRunners}
                        className="flex-1 md:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Recharger Démo (10)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Leaderboard panel (Moved UNDER the Map!) */}
                <Leaderboard
                  runners={runners}
                  selectedRunnerId={selectedRunnerId}
                  onSelectRunner={setSelectedRunnerId}
                  onTriggerSOS={handleTriggerSOS}
                  onResolveSOS={handleResolveSOS}
                  lang={lang}
                />

              </div>

              {/* Right Leaderboard & Organizer Control panel column */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Private Route Creator */}
                <RouteCreator
                  organizerId={currentOrganizer.id}
                  organizerName={currentOrganizer.name}
                  onRouteCreated={handleRouteCreated}
                />

                {/* Organizer configuration panel */}
                <OrganizerPanel
                  currentRoute={selectedRoute}
                  onUploadGPX={handleUploadGPX}
                  onResetRace={handleResetRace}
                  onClearNames={handleClearNames}
                  onAddRunner={handleAddRunner}
                  runnersCount={runners.length}
                  onSimulateBulkRunners={handleSimulateBulkRunners}
                  currentOrganizer={currentOrganizer}
                  onStripeConnect={handleStripeConnect}
                  stripeLoading={stripeLoading}
                  onUpdateRouteFee={handleUpdateRouteFee}
                />

                {/* Interactive Safety Simulation Buttons */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-850">Pupitre d'exercice Secours & Chute ({selectedRoute.region ? selectedRoute.region.split(' ')[0] : 'Parcours'})</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-4 leading-normal font-sans">
                    Simulez instantanément des urgences pour observer le fonctionnement du dispositif de sécurité de l'organisateur (constellation boussole, alerte surbrillance & ping) sur le tracé sélectionné :
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleTriggerMockAlert('fall')}
                      className="p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold rounded-xl transition-all text-center flex flex-col items-center gap-1 active:scale-95 cursor-pointer shadow-sm"
                    >
                      <span className="text-base">🚨</span>
                      <span>Chute Dossard 102</span>
                    </button>
                    <button
                      onClick={() => handleTriggerMockAlert('gps')}
                      className="p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-bold rounded-xl transition-all text-center flex flex-col items-center gap-1 active:scale-95 cursor-pointer shadow-sm"
                    >
                      <span className="text-base">⚠️</span>
                      <span>Arrêt Dossard 104</span>
                    </button>
                    <button
                      onClick={() => handleTriggerMockAlert('all-clean')}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all text-center flex flex-col items-center gap-1 active:scale-95 cursor-pointer shadow-sm"
                    >
                      <span className="text-base">🟢</span>
                      <span>Résoudre Tout (OK)</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Tab 1.5: Spectator Dashboard view */}
        {activeTab === 'spectateur' && (
          <SpectatorPanel
            route={selectedRoute}
            runners={runners}
            selectedRunnerId={selectedRunnerId}
            onSelectRunner={setSelectedRunnerId}
            userPosition={userPosition}
            userSharing={userSharing}
            userRunnerInfo={userRunnerInfo}
            elapsedSeconds={elapsedSeconds}
            lang={lang}
          />
        )}

        {/* Tab 2: Mobile simulation viewport */}
        {activeTab === 'coureur' && (
          <div className="max-w-xl mx-auto py-4">
            <RunnerMobileMode
              onToggleUserSharing={handleToggleUserSharing}
              userSharing={userSharing}
              userPosition={userPosition}
              selectedRoutePoints={selectedRoute.points}
              lang={lang}
              routeName={selectedRoute.name}
              currentRoute={selectedRoute}
            />
          </div>
        )}

        {/* Tab 3: Detailed Billing Calculator */}
        {activeTab === 'tarifs' && (
          <div className="max-w-2xl mx-auto py-4">
            <TarifCalculator lang={lang} />
          </div>
        )}

        {/* Tab 4: User Guide */}
        {activeTab === 'guide' && (
          <UserGuide
            onNavigate={setActiveTab}
            currentOrganizer={currentOrganizer}
            lang={lang}
          />
        )}

        {/* Tab 5: Espace Créateur */}
        {activeTab === 'createur' && (
          <div className="max-w-4xl mx-auto py-4 animate-in fade-in duration-200">
            <CreatorDashboard routes={routes} lang={lang} />
          </div>
        )}

      </main>

      {/* 4. Tiny Legal / Elegant Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-[10px] text-slate-500 font-mono tracking-wide mt-auto">
        <p>
          {lang === 'fr' 
            ? "© 2026 Ultimate Trail VTT Rando — Systèmes de suivi géospatial temps-réel basse-consommation." 
            : "© 2026 Ultimate Trail VTT Rando — Secure low-power real-time geospatial tracking services."}
        </p>
        <p className="mt-1">
          {lang === 'fr' 
            ? "Cartes vectorielles fournies par Leaflet & OpenStreetMap." 
            : "Vector maps rendered via Leaflet & OpenStreetMap contributors."}
        </p>
      </footer>

    </div>
  );
}
