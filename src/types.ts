export type RunnerType = 'VTT' | 'Rando' | 'Cavalier';

export interface Checkpoint {
  id: string;
  name: string;
  location: [number, number]; // [lat, lng]
  distance: number; // km from the start along the track
}

export interface RouteData {
  id: string;
  name: string;
  points: [number, number][]; // Array of [lat, lng]
  length: number; // total distance in km
  checkpoints: Checkpoint[];
  category: RunnerType;
  region?: string; // Région géographique (Vosges, Alpes, Provence, Bretagne, etc.)
  organizerId?: string; // ID de l'organisateur propriétaire
  organizerName?: string; // Nom de l'organisation
  entryFee?: number; // Frais d'inscription en EUR (ex: 15€)
}

export interface Organizer {
  id: string;
  username: string; // email ou identifiant
  name: string; // Nom de l'organisation (ex: Club Vosgien)
  region?: string; // Région principale d'exploitation
  password?: string; // mot de passe facultatif pour simulation
  stripeAccountId?: string; // ID du compte Stripe Connect
  stripeStatus?: 'pending' | 'active' | 'none'; // Statut d'intégration Stripe Connect
}

export interface Runner {
  id: string;
  name: string;
  type: RunnerType;
  bibNumber: string; // Dossard
  currentPos: [number, number]; // [lat, lng]
  speed: number; // km/h
  lastActive: Date;
  status: 'active' | 'warning' | 'sos' | 'finished';
  statusReason?: string; // "Immobile > 5 min", "Collision ou choc", "Appel SOS manuel"
  progress: number; // Percentage (0 to 1) along the route
  distanceCovered: number; // km
  distanceRemaining: number; // km
  checkpointsCleared: string[]; // List of checkpoint IDs
  checkpointTimes: Record<string, string>; // checkpointId -> time "HH:MM:SS"
  currentRank: number;
  paymentStatus?: 'pending' | 'paid' | 'free'; // Statut de paiement des frais d'inscription
  paymentSessionId?: string; // ID de session de paiement Stripe
  entryFeePaid?: number; // Montant payé
}

export interface CompetitionStats {
  totalParticipants: number;
  activeCount: number;
  warningCount: number;
  sosCount: number;
  finishedCount: number;
  averageSpeed: number;
}
