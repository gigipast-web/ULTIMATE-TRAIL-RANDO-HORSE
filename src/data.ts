import { RouteData, Runner, Checkpoint } from './types';

// Helper to generate coordinates in a smooth line (Vosges, France region: 48.08, 6.95)
function generatePath(startLat: number, startLng: number, numPoints: number, scaleX = 1, scaleY = 1): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    // Sine wave path to make a beautiful circuit or loop
    const lat = startLat + 0.04 * Math.sin(t * Math.PI) * scaleY + 0.01 * Math.sin(t * 4 * Math.PI);
    const lng = startLng + 0.06 * t * scaleX + 0.015 * Math.sin(t * 3 * Math.PI);
    points.push([lat, lng]);
  }
  return points;
}

// Calculate distance between two lat/lng coordinates in km (Haversine formula)
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Number(d.toFixed(3));
}

// Calculate the total length of a path
export function getPathLength(points: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += getDistance(points[i][0], points[i][1], points[i+1][0], points[i+1][1]);
  }
  return Number(total.toFixed(2));
}

// Generate preset routes in different regions
export function getPresetRoutes(): RouteData[] {
  // 1. Chamonix (Alpes) Center Point (45.923, 6.868)
  const aLat = 45.923;
  const aLng = 6.868;
  const randoPoints = generatePath(aLat, aLng, 60, 0.8, 1.2);
  const randoLength = getPathLength(randoPoints);
  const randoCheckpoints: Checkpoint[] = [
    {
      id: 'cp-rando-1',
      name: 'Belvédère Lac Blanc',
      location: randoPoints[Math.floor(randoPoints.length * 0.33)],
      distance: Number((randoLength * 0.33).toFixed(1)),
    },
    {
      id: 'cp-rando-2',
      name: 'Refuge du Plan de l\'Aiguille',
      location: randoPoints[Math.floor(randoPoints.length * 0.75)],
      distance: Number((randoLength * 0.75).toFixed(1)),
    }
  ];

  // 3. Gorges du Verdon (Provence) Center Point (43.74, 6.25)
  const pLat = 43.74;
  const pLng = 6.25;
  const cavalierPoints = generatePath(pLat, pLng, 100, 1.5, 1.0);
  const cavalierLength = getPathLength(cavalierPoints);
  const cavalierCheckpoints: Checkpoint[] = [
    {
      id: 'cp-cav-1',
      name: 'Belvédère du Couloir Samson',
      location: cavalierPoints[Math.floor(cavalierPoints.length * 0.2)],
      distance: Number((cavalierLength * 0.2).toFixed(1)),
    },
    {
      id: 'cp-cav-2',
      name: 'Gué du Verdon',
      location: cavalierPoints[Math.floor(cavalierPoints.length * 0.5)],
      distance: Number((cavalierLength * 0.5).toFixed(1)),
    },
    {
      id: 'cp-cav-3',
      name: 'Crête des Lavandins',
      location: cavalierPoints[Math.floor(cavalierPoints.length * 0.8)],
      distance: Number((cavalierLength * 0.8).toFixed(1)),
    }
  ];

  // 4. Brocéliande (Bretagne) Center Point (48.01, -2.17)
  const bLat = 48.01;
  const bLng = -2.17;
  const bretagnePoints = generatePath(bLat, bLng, 75, 1.0, 1.1);
  const bretagneLength = getPathLength(bretagnePoints);
  const bretagneCheckpoints: Checkpoint[] = [
    {
      id: 'cp-bret-1',
      name: 'Tombeau de Merlin',
      location: bretagnePoints[Math.floor(bretagnePoints.length * 0.3)],
      distance: Number((bretagneLength * 0.3).toFixed(1)),
    },
    {
      id: 'cp-bret-2',
      name: 'Val sans Retour',
      location: bretagnePoints[Math.floor(bretagnePoints.length * 0.7)],
      distance: Number((bretagneLength * 0.7).toFixed(1)),
    }
  ];

  return [
    {
      id: 'route-rando',
      name: 'Sentier d\'Altitude Chamonix Rando',
      points: randoPoints,
      length: randoLength,
      checkpoints: randoCheckpoints,
      category: 'Rando',
      region: 'Auvergne-Rhône-Alpes (Alpes)'
    },
    {
      id: 'route-cavalier',
      name: 'Piste des Gorges du Verdon Cavalier',
      points: cavalierPoints,
      length: cavalierLength,
      checkpoints: cavalierCheckpoints,
      category: 'Cavalier',
      region: 'Provence-Alpes-Côte d\'Azur (Provence)'
    },
    {
      id: 'route-bretagne',
      name: 'Sentier des Légendes de Brocéliande',
      points: bretagnePoints,
      length: bretagneLength,
      checkpoints: bretagneCheckpoints,
      category: 'Rando',
      region: 'Bretagne (Morbihan)'
    }
  ];
}

// French Names for participants
const FRENCH_NAMES = [
  { name: 'Julien Mercier', type: 'VTT' },
  { name: 'Lucas Dubois', type: 'VTT' },
  { name: 'Chloé Girard', type: 'Rando' },
  { name: 'Sarah Lefort', type: 'Rando' },
  { name: 'Antoine Morel', type: 'Cavalier' },
  { name: 'Pierre Simon', type: 'VTT' },
  { name: 'Thomas Vidal', type: 'Cavalier' },
  { name: 'Émilie Roux', type: 'Rando' },
  { name: 'Maxime Caron', type: 'VTT' },
  { name: 'Hugo Bernard', type: 'Cavalier' },
  { name: 'Léa Fontaine', type: 'Rando' },
  { name: 'Alice Chevalier', type: 'VTT' },
  { name: 'Corentin Lemaire', type: 'VTT' },
  { name: 'Manon Picard', type: 'Rando' },
  { name: 'Nicolas Bertrand', type: 'Cavalier' },
  { name: 'Zoe Gautier', type: 'Rando' },
  { name: 'Alexandre Renard', type: 'VTT' },
  { name: 'Clara Clement', type: 'Cavalier' },
  { name: 'Mathieu Royer', type: 'VTT' },
  { name: 'Charlotte Lopez', type: 'Rando' }
];

// Initialize empty runner list by default so users can register their own coureurs
export function getInitialRunners(route: RouteData): Runner[] {
  return [];
}

// Generate 10 default demo runners based on selected route on demand
export function getDemoRunners(route: RouteData): Runner[] {
  const runners: Runner[] = [];
  const startPos = route.points[0];

  // Pick first 10 names from our list matching the route's primary type or mixed
  for (let i = 0; i < 10; i++) {
    const isPrimaryType = i < 6; // 6 of route's type, 4 other types to show mixed trail tracking
    const info = FRENCH_NAMES[i];
    const type = isPrimaryType ? route.category : (info.type as any);

    // Initial speeds in km/h: VTT (15-28), Rando (4-6), Cavalier (12-20)
    let speed = 0;
    if (type === 'VTT') speed = 16 + Math.random() * 8;
    else if (type === 'Rando') speed = 4 + Math.random() * 1.5;
    else speed = 12 + Math.random() * 6;

    // Distribute runners slightly along the start line (progress 0.0 to 0.05)
    const progress = Math.random() * 0.02;
    const pointIndex = Math.floor(progress * (route.points.length - 1));
    const currentPos = route.points[pointIndex] || startPos;
    const distCovered = Number((route.length * progress).toFixed(2));

    runners.push({
      id: `runner-${i + 1}`,
      name: info.name,
      type,
      bibNumber: String(100 + i + 1),
      currentPos,
      speed: Number(speed.toFixed(1)),
      lastActive: new Date(),
      status: 'active',
      progress,
      distanceCovered: distCovered,
      distanceRemaining: Number((route.length - distCovered).toFixed(2)),
      checkpointsCleared: [],
      checkpointTimes: {},
      currentRank: i + 1
    });
  }

  return sortRunners(runners);
}

// Sort runners by progress/distance covered (descending) and assign current rank
export function sortRunners(runners: Runner[]): Runner[] {
  const sorted = [...runners].sort((a, b) => {
    if (a.status === 'finished' && b.status !== 'finished') return -1;
    if (b.status === 'finished' && a.status !== 'finished') return 1;
    return b.progress - a.progress;
  });

  return sorted.map((runner, index) => ({
    ...runner,
    currentRank: index + 1
  }));
}

// Format real GPX coordinates loaded from an uploaded GPX file
export function parseGPXString(gpxText: string): [number, number][] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxText, 'application/xml');
  const trackpts = xmlDoc.getElementsByTagName('trkpt');
  
  const points: [number, number][] = [];
  for (let i = 0; i < trackpts.length; i++) {
    const lat = parseFloat(trackpts[i].getAttribute('lat') || '0');
    const lon = parseFloat(trackpts[i].getAttribute('lon') || '0');
    if (lat !== 0 && lon !== 0) {
      points.push([lat, lon]);
    }
  }

  // If no trkpt, let's try wpt
  if (points.length === 0) {
    const wpts = xmlDoc.getElementsByTagName('wpt');
    for (let i = 0; i < wpts.length; i++) {
      const lat = parseFloat(wpts[i].getAttribute('lat') || '0');
      const lon = parseFloat(wpts[i].getAttribute('lon') || '0');
      if (lat !== 0 && lon !== 0) {
        points.push([lat, lon]);
      }
    }
  }

  return points;
}

// Helper to generate a GPX dummy string to download and test
export function generateDummyGPX(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Ultimate Trail GPS Generator" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Parcours de Test Ultimate Trail VTT</name>
  </metadata>
  <trk>
    <name>Tracé GPX de Test</name>
    <trkseg>
      <trkpt lat="48.0500" lon="6.9200"><ele>720</ele></trkpt>
      <trkpt lat="48.0620" lon="6.9350"><ele>745</ele></trkpt>
      <trkpt lat="48.0750" lon="6.9550"><ele>812</ele></trkpt>
      <trkpt lat="48.0820" lon="6.9800"><ele>860</ele></trkpt>
      <trkpt lat="48.0780" lon="7.0100"><ele>840</ele></trkpt>
      <trkpt lat="48.0650" lon="7.0300"><ele>795</ele></trkpt>
      <trkpt lat="48.0520" lon="7.0500"><ele>750</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;
}
