import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { Firestore } from '@google-cloud/firestore';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { Route, Organizer, Runner, Transaction, PlatformSettings } from './src/types';
import { DEFAULT_ROUTES, DEFAULT_ORGANIZERS, DEFAULT_RUNNERS, DEFAULT_TRANSACTIONS, DEFAULT_SETTINGS } from './src/data';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from /app/.dev.env.json if available
let stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
let stripePublishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

try {
  if (fs.existsSync('/app/.dev.env.json')) {
    const devEnv = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf8'));
    if (devEnv.STRIPE_SECRET_KEY) stripeSecretKey = devEnv.STRIPE_SECRET_KEY;
    if (devEnv.VITE_STRIPE_PUBLISHABLE_KEY) stripePublishableKey = devEnv.VITE_STRIPE_PUBLISHABLE_KEY;
  }
} catch (e) {
  console.log('Could not read /app/.dev.env.json:', e);
}

// Lazy load Stripe
let stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!stripe && stripeSecretKey) {
    try {
      stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-04-10' as any,
      });
    } catch (err) {
      console.error('Failed to initialize Stripe client:', err);
    }
  }
  return stripe;
}

// Database setup
let db: Firestore | null = null;
let isFirestoreAvailable = false;

try {
  db = new Firestore({
    databaseId: 'ai-studio-360072fa-6a17-42e4-8844-94fdda77b3f7',
  });
  isFirestoreAvailable = true;
  console.log('Firestore client initialized with databaseId: ai-studio-360072fa-6a17-42e4-8844-94fdda77b3f7');
} catch (e) {
  console.error('Firestore failed to initialize, using memory fallback:', e);
}

// In-Memory Fallbacks (Pre-seeded with mock data)
let memoryRoutes: Route[] = [...DEFAULT_ROUTES];
let memoryOrganizers: Organizer[] = [...DEFAULT_ORGANIZERS];
let memoryRunners: Runner[] = [...DEFAULT_RUNNERS];
let memoryTransactions: Transaction[] = [...DEFAULT_TRANSACTIONS];
let memorySettings: PlatformSettings = { ...DEFAULT_SETTINGS };

// Helper to interact with DB or Memory
async function getRoutes(): Promise<Route[]> {
  if (isFirestoreAvailable && db) {
    try {
      const snap = await db.collection('routes').get();
      if (snap.empty) {
        for (const r of memoryRoutes) {
          await db.collection('routes').doc(r.id).set(r);
        }
        return memoryRoutes;
      }
      return snap.docs.map(doc => doc.data() as Route);
    } catch (err) {
      console.error('Error fetching routes from Firestore, falling back to memory:', err);
      return memoryRoutes;
    }
  }
  return memoryRoutes;
}

async function saveRoute(route: Route): Promise<void> {
  if (isFirestoreAvailable && db) {
    try {
      await db.collection('routes').doc(route.id).set(route);
    } catch (err) {
      console.error('Firestore save route error:', err);
      const idx = memoryRoutes.findIndex(r => r.id === route.id);
      if (idx >= 0) memoryRoutes[idx] = route;
      else memoryRoutes.push(route);
    }
  } else {
    const idx = memoryRoutes.findIndex(r => r.id === route.id);
    if (idx >= 0) memoryRoutes[idx] = route;
    else memoryRoutes.push(route);
  }
}

async function getOrganizers(): Promise<Organizer[]> {
  if (isFirestoreAvailable && db) {
    try {
      const snap = await db.collection('organizers').get();
      if (snap.empty) {
        for (const o of memoryOrganizers) {
          await db.collection('organizers').doc(o.id).set(o);
        }
        return memoryOrganizers;
      }
      return snap.docs.map(doc => doc.data() as Organizer);
    } catch (err) {
      console.error('Error fetching organizers:', err);
      return memoryOrganizers;
    }
  }
  return memoryOrganizers;
}

async function saveOrganizer(org: Organizer): Promise<void> {
  if (isFirestoreAvailable && db) {
    try {
      await db.collection('organizers').doc(org.id).set(org);
    } catch (err) {
      console.error('Firestore save organizer error:', err);
      const idx = memoryOrganizers.findIndex(o => o.id === org.id);
      if (idx >= 0) memoryOrganizers[idx] = org;
      else memoryOrganizers.push(org);
    }
  } else {
    const idx = memoryOrganizers.findIndex(o => o.id === org.id);
    if (idx >= 0) memoryOrganizers[idx] = org;
    else memoryOrganizers.push(org);
  }
}

async function getRunners(): Promise<Runner[]> {
  if (isFirestoreAvailable && db) {
    try {
      const snap = await db.collection('runners').get();
      if (snap.empty) {
        for (const r of memoryRunners) {
          await db.collection('runners').doc(r.id).set(r);
        }
        return memoryRunners;
      }
      return snap.docs.map(doc => doc.data() as Runner);
    } catch (err) {
      console.error('Error fetching runners:', err);
      return memoryRunners;
    }
  }
  return memoryRunners;
}

async function saveRunner(runner: Runner): Promise<void> {
  if (isFirestoreAvailable && db) {
    try {
      await db.collection('runners').doc(runner.id).set(runner);
    } catch (err) {
      console.error('Firestore save runner error:', err);
      const idx = memoryRunners.findIndex(r => r.id === runner.id);
      if (idx >= 0) memoryRunners[idx] = runner;
      else memoryRunners.push(runner);
    }
  } else {
    const idx = memoryRunners.findIndex(r => r.id === runner.id);
    if (idx >= 0) memoryRunners[idx] = runner;
    else memoryRunners.push(runner);
  }
}

async function deleteRunner(id: string): Promise<void> {
  const idx = memoryRunners.findIndex(r => r.id === id);
  if (idx >= 0) memoryRunners.splice(idx, 1);
  if (isFirestoreAvailable && db) {
    try {
      await db.collection('runners').doc(id).delete();
    } catch (err) {
      console.error('Firestore delete runner error:', err);
    }
  }
}

async function clearRunners(): Promise<void> {
  memoryRunners = [];
  if (isFirestoreAvailable && db) {
    try {
      const snap = await db.collection('runners').get();
      const batch = db.batch();
      snap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (err) {
      console.error('Firestore clear runners error:', err);
    }
  }
}

async function deleteRoute(id: string): Promise<void> {
  const idx = memoryRoutes.findIndex(r => r.id === id);
  if (idx >= 0) memoryRoutes.splice(idx, 1);
  if (isFirestoreAvailable && db) {
    try {
      await db.collection('routes').doc(id).delete();
    } catch (err) {
      console.error('Firestore delete route error:', err);
    }
  }
}

async function clearRoutes(): Promise<void> {
  memoryRoutes = [];
  if (isFirestoreAvailable && db) {
    try {
      const snap = await db.collection('routes').get();
      const batch = db.batch();
      snap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (err) {
      console.error('Firestore clear routes error:', err);
    }
  }
}

async function getTransactions(): Promise<Transaction[]> {
  if (isFirestoreAvailable && db) {
    try {
      const snap = await db.collection('transactions').get();
      if (snap.empty) {
        for (const t of memoryTransactions) {
          await db.collection('transactions').doc(t.id).set(t);
        }
        return memoryTransactions;
      }
      return snap.docs.map(doc => doc.data() as Transaction);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      return memoryTransactions;
    }
  }
  return memoryTransactions;
}

async function saveTransaction(tx: Transaction): Promise<void> {
  if (isFirestoreAvailable && db) {
    try {
      await db.collection('transactions').doc(tx.id).set(tx);
    } catch (err) {
      console.error('Firestore save transaction error:', err);
      memoryTransactions.push(tx);
    }
  } else {
    memoryTransactions.push(tx);
  }
}

async function getSettings(): Promise<PlatformSettings> {
  if (isFirestoreAvailable && db) {
    try {
      const doc = await db.collection('settings').doc('platform-settings').get();
      if (!doc.exists) {
        await db.collection('settings').doc('platform-settings').set(memorySettings);
        return memorySettings;
      }
      return doc.data() as PlatformSettings;
    } catch (err) {
      console.error('Error fetching settings:', err);
      return memorySettings;
    }
  }
  return memorySettings;
}

async function saveSettings(settings: PlatformSettings): Promise<void> {
  if (isFirestoreAvailable && db) {
    try {
      await db.collection('settings').doc('platform-settings').set(settings);
    } catch (err) {
      console.error('Firestore save settings error:', err);
      memorySettings = settings;
    }
  } else {
    memorySettings = settings;
  }
}

async function startServer() {
  const app = express();
  const port = 3000;

  app.use(cors());
  app.use(express.json());

  // --- API ROUTES ---

  // Get current environment config for Stripe Client
  app.get('/api/stripe/config', (_req: Request, res: Response) => {
    return res.json({
      publicKey: stripePublishableKey,
      hasSecretKey: !!stripeSecretKey,
    });
  });

  // Get Platform Settings
  app.get('/api/stripe/platform-settings', async (_req: Request, res: Response) => {
    try {
      const settings = await getSettings();
      return res.json(settings);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch platform settings' });
    }
  });

  // Update Platform Settings
  app.post('/api/stripe/platform-settings', async (req: Request, res: Response) => {
    try {
      const { commissionPercent, creatorStripeAccountId, isDemoMode } = req.body;
      const settings = await getSettings();
      if (typeof commissionPercent === 'number') settings.commissionPercent = commissionPercent;
      if (creatorStripeAccountId !== undefined) settings.creatorStripeAccountId = creatorStripeAccountId;
      if (isDemoMode !== undefined) settings.isDemoMode = isDemoMode;
      await saveSettings(settings);
      return res.json(settings);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to update platform settings' });
    }
  });

  // Get Routes
  app.get('/api/routes', async (_req: Request, res: Response) => {
    const routesList = await getRoutes();
    return res.json(routesList);
  });

  // Create Route
  app.post('/api/routes', async (req: Request, res: Response) => {
    try {
      const { name, description, distance, elevation, entryFee, coordinates, checkpoints, organizerId } = req.body;
      const newRoute: Route = {
        id: `route-${Date.now()}`,
        name: name || 'Nouveau Parcours',
        description: description || '',
        distance: Number(distance) || 0,
        elevation: Number(elevation) || 0,
        entryFee: Number(entryFee) || 0,
        coordinates: coordinates || [],
        checkpoints: checkpoints || [],
        organizerId: organizerId || 'org-chamonix',
        createdAt: new Date().toISOString(),
      };
      await saveRoute(newRoute);
      return res.status(201).json(newRoute);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to create route' });
    }
  });

  // Delete Route
  app.post('/api/routes/delete', async (req: Request, res: Response) => {
    try {
      const { id } = req.body;
      await deleteRoute(id);
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete route' });
    }
  });

  // Clear All Routes
  app.post('/api/routes/clear-all', async (_req: Request, res: Response) => {
    try {
      await clearRoutes();
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to clear routes' });
    }
  });

  // Get Organizers
  app.get('/api/organizers', async (_req: Request, res: Response) => {
    const list = await getOrganizers();
    return res.json(list);
  });

  // Update/Save Organizer
  app.post('/api/organizers', async (req: Request, res: Response) => {
    try {
      const { id, name, email, stripeAccountId, stripeStatus } = req.body;
      const orgs = await getOrganizers();
      let target = orgs.find(o => o.id === id);
      if (!target) {
        target = {
          id: id || `org-${Date.now()}`,
          name: name || 'Nouvel Organisateur',
          email: email || '',
          stripeAccountId: stripeAccountId || '',
          stripeStatus: stripeStatus || 'none',
        };
      } else {
        if (name !== undefined) target.name = name;
        if (email !== undefined) target.email = email;
        if (stripeAccountId !== undefined) target.stripeAccountId = stripeAccountId;
        if (stripeStatus !== undefined) {
          target.stripeStatus = stripeStatus;
          if (stripeStatus === 'active') {
            target.stripeLinkedAt = new Date().toISOString();
          }
        }
      }
      await saveOrganizer(target);
      return res.json(target);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to update organizer' });
    }
  });

  // Get Runners
  app.get('/api/runners', async (_req: Request, res: Response) => {
    const list = await getRunners();
    return res.json(list);
  });

  // Register Runner (Pre-payment creation)
  app.post('/api/runners', async (req: Request, res: Response) => {
    try {
      const { name, email, phone, routeId, type } = req.body;
      const bib = Math.floor(100 + Math.random() * 899).toString();
      const newRunner: Runner = {
        id: `runner-${Date.now()}`,
        name: name || 'Coureur Anonyme',
        email: email || '',
        phone: phone || '',
        bibNumber: bib,
        routeId: routeId,
        type: type || 'coureur',
        status: 'pending',
        registeredAt: new Date().toISOString(),
        checkpointProgress: 0,
      };
      await saveRunner(newRunner);
      return res.status(201).json(newRunner);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to register runner' });
    }
  });

  // Delete Runner
  app.post('/api/runners/delete', async (req: Request, res: Response) => {
    try {
      const { id } = req.body;
      await deleteRunner(id);
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete runner' });
    }
  });

  // Clear All Runners
  app.post('/api/runners/clear-all', async (_req: Request, res: Response) => {
    try {
      await clearRunners();
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to clear runners' });
    }
  });

  // Reset Race Progress
  app.post('/api/runners/reset-race', async (_req: Request, res: Response) => {
    try {
      const list = await getRunners();
      for (const r of list) {
        r.status = 'checked_in';
        r.currentPositionIndex = 0;
        r.checkpointProgress = 0;
        r.liveSpeed = 0;
        delete r.finalTime;
        await saveRunner(r);
      }
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to reset race' });
    }
  });

  // Update Runner Live Status
  app.post('/api/runners/update-status', async (req: Request, res: Response) => {
    try {
      const { id, status, checkpointProgress, liveSpeed, currentPositionIndex, finalTime } = req.body;
      const list = await getRunners();
      const r = list.find(runner => runner.id === id);
      if (!r) {
        return res.status(404).json({ error: 'Runner not found' });
      }
      if (status !== undefined) r.status = status;
      if (checkpointProgress !== undefined) r.checkpointProgress = checkpointProgress;
      if (liveSpeed !== undefined) r.liveSpeed = liveSpeed;
      if (currentPositionIndex !== undefined) r.currentPositionIndex = currentPositionIndex;
      if (finalTime !== undefined) r.finalTime = finalTime;
      r.lastUpdateTime = new Date().toISOString();

      await saveRunner(r);
      return res.json(r);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to update runner status' });
    }
  });

  // Get Transactions
  app.get('/api/transactions', async (_req: Request, res: Response) => {
    const txs = await getTransactions();
    return res.json(txs);
  });

  // Simulated direct payout success (bypassing Stripe Checkout if keys not configured or for quick testing)
  app.get('/api/stripe/simulate-payout-success', async (req: Request, res: Response) => {
    try {
      const { routeId, runnerId, amount, runnerName } = req.query;
      if (!routeId || !runnerId) {
        return res.status(400).send('Missing routeId or runnerId');
      }

      // Update runner as paid
      const runnersList = await getRunners();
      const runner = runnersList.find(r => r.id === runnerId);
      if (runner) {
        runner.status = 'paid';
        await saveRunner(runner);
      }

      const routesList = await getRoutes();
      const route = routesList.find(r => r.id === routeId);
      const settings = await getSettings();
      const fee = Number(amount) || (route ? route.entryFee : 0);
      const feePaid = fee * (settings.commissionPercent / 100);
      const orgShare = fee - feePaid;

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        amount: fee,
        platformFeePaid: Number(feePaid.toFixed(2)),
        organizerShare: Number(orgShare.toFixed(2)),
        routeId: String(routeId),
        routeName: route ? route.name : 'Parcours de trail',
        runnerId: String(runnerId),
        runnerName: String(runnerName || (runner ? runner.name : 'Coureur')),
        timestamp: new Date().toISOString(),
        stripeSessionId: `simulated_${Date.now()}`,
        status: 'success',
      };

      await saveTransaction(newTx);
      return res.json({ success: true, transaction: newTx });
    } catch (e) {
      console.error(e);
      return res.status(500).send('Simulation error');
    }
  });

  // Create Stripe Checkout Session (The REAL integration requested!)
  app.post('/api/stripe/create-checkout-session', async (req: Request, res: Response) => {
    try {
      const { routeId, runnerId } = req.body;
      if (!routeId || !runnerId) {
        return res.status(400).json({ error: 'Missing routeId or runnerId' });
      }

      const routesList = await getRoutes();
      const route = routesList.find(r => r.id === routeId);
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      const runnersList = await getRunners();
      const runner = runnersList.find(r => r.id === runnerId);
      if (!runner) {
        return res.status(404).json({ error: 'Runner not found' });
      }

      const organizersList = await getOrganizers();
      const organizer = organizersList.find(o => o.id === route.organizerId);

      const settings = await getSettings();
      const commissionPercent = settings.commissionPercent;

      const stripeClient = getStripe();
      if (!stripeClient) {
        // If Stripe keys are not configured, return a specific response so the frontend can simulate
        return res.json({
          simulated: true,
          message: 'Stripe API keys are missing. Seamlessly falling back to simulation...',
          route,
          runner,
        });
      }

      // Calculate fee splitting
      const unitAmountCents = Math.round(route.entryFee * 100);
      const appFeeCents = Math.round(route.entryFee * (commissionPercent / 100) * 100);

      // Create parameters for destination transfer to Organizer
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Inscription : ${route.name}`,
              description: `Dossard N°${runner.bibNumber} pour le trail de ${route.distance}km (${route.elevation}m D+). Organisé par ${organizer ? organizer.name : 'Club Local'}.`,
            },
            unit_amount: unitAmountCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${req.headers.origin}?checkout_success=true&routeId=${route.id}&runnerId=${runner.id}&amount=${route.entryFee}`,
        cancel_url: `${req.headers.origin}?checkout_cancel=true&runnerId=${runner.id}`,
      };

      // Apply automatic fund partitioning via Stripe Connect destination charge if the organizer is linked!
      if (organizer && organizer.stripeAccountId && organizer.stripeStatus === 'active') {
        sessionConfig.payment_intent_data = {
          application_fee_amount: appFeeCents,
          transfer_data: {
            destination: organizer.stripeAccountId,
          },
        };
      }

      const session = await stripeClient.checkout.sessions.create(sessionConfig);
      return res.json({
        id: session.id,
        url: session.url,
      });

    } catch (err: any) {
      console.error('Error creating Stripe Checkout Session:', err);
      return res.status(500).json({ error: err.message || 'Failed to create payment session' });
    }
  });

  // --- DEV & BUNDLE MIDDLEWARES ---

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets from dist
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server started successfully. Running on http://localhost:${port}`);
  });
}

startServer();
