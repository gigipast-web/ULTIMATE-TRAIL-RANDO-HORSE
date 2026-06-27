import { Route, Organizer, Runner, Transaction, PlatformSettings } from './types';

export const DEFAULT_ROUTES: Route[] = [
  {
    id: 'route-1',
    name: 'Le Chamonix Express',
    description: 'Une ascension spectaculaire face au Mont-Blanc. Un tracé exigeant avec des passages rocheux, des balcons panoramiques splendides et une descente technique en forêt.',
    distance: 14.8,
    elevation: 920,
    entryFee: 35,
    coordinates: [
      [10, 80], [20, 72], [30, 60], [40, 48], [48, 25], [52, 23], [60, 45], [70, 58], [80, 70], [90, 82]
    ],
    checkpoints: ['Départ Place de Chamonix', 'Refuge du Plan de l\'Aiguille', 'La Flégère', 'Arrivée Chamonix'],
    organizerId: 'org-chamonix',
    createdAt: '2026-05-15T09:00:00Z'
  },
  {
    id: 'route-2',
    name: 'La Diagonale des Alpages',
    description: 'Un trail de moyenne distance traversant des crêtes sauvages et des pâturages d\'altitude. Idéal pour les coureurs intermédiaires recherchant des vues à 360°.',
    distance: 28.5,
    elevation: 1650,
    entryFee: 55,
    coordinates: [
      [5, 45], [15, 35], [25, 42], [35, 20], [45, 12], [55, 30], [65, 50], [75, 45], [85, 38], [95, 42]
    ],
    checkpoints: ['Départ Vallorcine', 'Col des Montets', 'Lac Blanc', 'L\'Index', 'Arrivée Argentière'],
    organizerId: 'org-alpes',
    createdAt: '2026-06-01T10:30:00Z'
  },
  {
    id: 'route-3',
    name: 'Le Sprint Vert de l\'Oisans',
    description: 'Parcours court et nerveux à travers les sous-bois odorants et les torrents tumultueux. Parfait pour une initiation au trail de montagne ou un sprint explosif.',
    distance: 8.2,
    elevation: 380,
    entryFee: 18,
    coordinates: [
      [50, 90], [45, 75], [38, 62], [42, 50], [55, 48], [62, 55], [70, 72], [65, 85], [52, 90]
    ],
    checkpoints: ['Départ Bourg d\'Oisans', 'Cascade de la Sarenne', 'Pont Romain', 'Arrivée Parc des Écrins'],
    organizerId: 'org-oisans',
    createdAt: '2026-06-10T14:15:00Z'
  }
];

export const DEFAULT_ORGANIZERS: Organizer[] = [
  {
    id: 'org-chamonix',
    name: 'Chamonix Trail Club',
    email: 'contact@chamonix-trail.org',
    stripeAccountId: 'acct_1OppS3E6f7g4h8i9',
    stripeStatus: 'active',
    stripeLinkedAt: '2026-05-10T08:00:00Z'
  },
  {
    id: 'org-alpes',
    name: 'Alpes Événements Sportifs',
    email: 'info@alpes-events.fr',
    stripeAccountId: 'acct_1OpqT8H9g0f1j2k3',
    stripeStatus: 'active',
    stripeLinkedAt: '2026-05-20T11:00:00Z'
  },
  {
    id: 'org-oisans',
    name: 'Oisans Vert Trail',
    email: 'oisans-trail@gmail.com',
    stripeAccountId: '',
    stripeStatus: 'none'
  }
];

export const DEFAULT_RUNNERS: Runner[] = [
  {
    id: 'runner-1',
    name: 'Pierre Laurent',
    email: 'pierre.laurent@gmail.com',
    phone: '+33 6 12 34 56 78',
    bibNumber: '104',
    routeId: 'route-1',
    status: 'running',
    registeredAt: '2026-06-15T08:30:00Z',
    checkpointProgress: 2,
    liveSpeed: 11.2,
    currentPositionIndex: 5,
    lastUpdateTime: '2026-06-26T14:45:00Z'
  },
  {
    id: 'runner-2',
    name: 'Sophie Martin',
    email: 'sophie.martin@outlook.fr',
    phone: '+33 6 87 65 43 21',
    bibNumber: '108',
    routeId: 'route-1',
    status: 'completed',
    registeredAt: '2026-06-16T10:15:00Z',
    checkpointProgress: 3,
    finalTime: '01:38:42',
    liveSpeed: 0,
    currentPositionIndex: 9,
    lastUpdateTime: '2026-06-26T15:10:00Z'
  },
  {
    id: 'runner-3',
    name: 'Thomas Dubois',
    email: 'thomas.dubois@yahoo.fr',
    phone: '+33 7 44 55 66 77',
    bibNumber: '202',
    routeId: 'route-2',
    status: 'checked_in',
    registeredAt: '2026-06-18T14:22:00Z',
    checkpointProgress: 0,
    currentPositionIndex: 0,
    lastUpdateTime: '2026-06-26T12:00:00Z'
  },
  {
    id: 'runner-4',
    name: 'Amandine Petit',
    email: 'amandine.p@gmail.com',
    phone: '+33 6 00 11 22 33',
    bibNumber: '215',
    routeId: 'route-2',
    status: 'paid',
    registeredAt: '2026-06-20T09:40:00Z',
    checkpointProgress: 0
  },
  {
    id: 'runner-5',
    name: 'Marc Bernard',
    email: 'marc.bernard@laposte.net',
    phone: '+33 6 99 88 77 66',
    bibNumber: '301',
    routeId: 'route-3',
    status: 'running',
    registeredAt: '2026-06-22T17:05:00Z',
    checkpointProgress: 1,
    liveSpeed: 14.5,
    currentPositionIndex: 4,
    lastUpdateTime: '2026-06-26T15:24:00Z'
  }
];

export const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    amount: 35,
    platformFeePaid: 1.75,
    organizerShare: 33.25,
    routeId: 'route-1',
    routeName: 'Le Chamonix Express',
    runnerId: 'runner-1',
    runnerName: 'Pierre Laurent',
    timestamp: '2026-06-15T08:30:00Z',
    stripeSessionId: 'cs_live_123_456_789',
    status: 'success'
  },
  {
    id: 'tx-2',
    amount: 35,
    platformFeePaid: 1.75,
    organizerShare: 33.25,
    routeId: 'route-1',
    routeName: 'Le Chamonix Express',
    runnerId: 'runner-2',
    runnerName: 'Sophie Martin',
    timestamp: '2026-06-16T10:15:00Z',
    stripeSessionId: 'cs_live_987_654_321',
    status: 'success'
  },
  {
    id: 'tx-3',
    amount: 55,
    platformFeePaid: 2.75,
    organizerShare: 52.25,
    routeId: 'route-2',
    routeName: 'La Diagonale des Alpages',
    runnerId: 'runner-3',
    runnerName: 'Thomas Dubois',
    timestamp: '2026-06-18T14:22:00Z',
    stripeSessionId: 'cs_live_abc_def_ghi',
    status: 'success'
  },
  {
    id: 'tx-4',
    amount: 55,
    platformFeePaid: 2.75,
    organizerShare: 52.25,
    routeId: 'route-2',
    routeName: 'La Diagonale des Alpages',
    runnerId: 'runner-4',
    runnerName: 'Amandine Petit',
    timestamp: '2026-06-20T09:40:00Z',
    stripeSessionId: 'cs_live_jkl_mno_pqr',
    status: 'success'
  }
];

export const DEFAULT_SETTINGS: PlatformSettings = {
  id: 'platform-settings',
  commissionPercent: 5,
  creatorStripeAccountId: 'acct_1OppX4G8h9j0k1l2',
  isDemoMode: false
};
