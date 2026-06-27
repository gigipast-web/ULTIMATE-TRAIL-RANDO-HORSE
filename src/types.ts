export interface Route {
  id: string;
  name: string;
  description: string;
  distance: number; // in km
  elevation: number; // in meters
  entryFee: number; // in EUR
  coordinates: [number, number][]; // list of 2D points on our map canvas (0-100 x, 0-100 y)
  checkpoints: string[]; // name of check points
  organizerId: string;
  createdAt: string;
}

export interface Organizer {
  id: string;
  name: string;
  email: string;
  stripeAccountId: string;
  stripeStatus: 'active' | 'pending' | 'none';
  stripeLinkedAt?: string;
}

export interface Runner {
  id: string;
  name: string;
  email: string;
  phone: string;
  bibNumber: string; // Dossard
  routeId: string;
  type?: 'coureur' | 'vtt' | 'cavalier'; // Type of participant
  status: 'pending' | 'paid' | 'checked_in' | 'running' | 'completed' | 'dnf';
  registeredAt: string;
  checkpointProgress: number; // index of checkpoint cleared
  liveSpeed?: number;
  currentPositionIndex?: number; // index in route.coordinates
  lastUpdateTime?: string;
  finalTime?: string; // e.g. "02:14:35"
}

export interface Transaction {
  id: string;
  amount: number; // total registration fee paid (EUR)
  platformFeePaid: number; // commission collected by platform creator (EUR)
  organizerShare: number; // payout to organizer (EUR)
  routeId: string;
  routeName: string;
  runnerId: string;
  runnerName: string;
  timestamp: string;
  stripeSessionId: string;
  status: 'success' | 'failed';
}

export interface PlatformSettings {
  id: string;
  commissionPercent: number; // default e.g. 5
  creatorStripeAccountId: string;
  isDemoMode: boolean;
}
