import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";

// Helper for lazy initialization of Stripe SDK
let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2023-10-16" as any,
    });
  }
  return stripeClient;
}

// Global Platform Creator settings
let platformSettings = {
  commissionPercent: 5, // Default 5%
  creatorStripeAccountId: "acct_platform_creator_123",
  simulationBalance: 0, // In simulation mode, tracks mock application fees
};

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // GET Platform Settings
  app.get("/api/stripe/platform-settings", (req, res) => {
    res.json(platformSettings);
  });

  // POST Platform Settings
  app.post("/api/stripe/platform-settings", (req, res) => {
    const { commissionPercent, creatorStripeAccountId } = req.body;
    if (typeof commissionPercent === "number") {
      platformSettings.commissionPercent = commissionPercent;
    }
    if (creatorStripeAccountId) {
      platformSettings.creatorStripeAccountId = creatorStripeAccountId;
    }
    res.json({ success: true, settings: platformSettings });
  });

  // Simulate Payout success (adds commission fee to simulator balance)
  app.get("/api/stripe/simulate-payout-success", (req, res) => {
    const amount = Number(req.query.amount) || 0;
    const fee = amount * (platformSettings.commissionPercent / 100);
    platformSettings.simulationBalance = Number((platformSettings.simulationBalance + fee).toFixed(2));
    res.json({ success: true, addedFee: fee, currentBalance: platformSettings.simulationBalance });
  });

  // Stripe Connect Config Endpoint
  app.get("/api/stripe/config", (req, res) => {
    const isConfigured = !!process.env.STRIPE_SECRET_KEY;
    res.json({
      configured: isConfigured,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "pk_test_mock_key_ultimate_trail",
      simulation: !isConfigured
    });
  });

  // Create Stripe Connect Account for Organizer (Supports both standard path and connected-account alias)
  const handleCreateConnectAccount = async (req: any, res: any) => {
    try {
      const { organizerId, organizerName, email } = req.body;
      if (!organizerId) {
        return res.status(400).json({ error: "organizerId is required" });
      }

      const stripe = getStripe();
      if (!stripe) {
        // Simulation mode Connect onboarding
        const mockAccountId = `acct_sim_${Math.random().toString(36).substring(2, 11)}`;
        const hostUrl = process.env.APP_URL || `http://localhost:${PORT}`;
        const mockOnboardingUrl = `${hostUrl}?stripe_callback=success&accountId=${mockAccountId}&organizerId=${organizerId}&sim=true`;
        return res.json({
          accountId: mockAccountId,
          url: mockOnboardingUrl,
          simulation: true
        });
      }

      // Real Stripe Connect Account creation
      const account = await stripe.accounts.create({
        type: 'standard',
        email: email || undefined,
        business_profile: {
          name: organizerName || 'Club VTT Rando',
          url: process.env.APP_URL || `http://localhost:${PORT}`
        },
        metadata: {
          organizerId
        }
      });

      const hostUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${hostUrl}?stripe_callback=refresh&accountId=${account.id}&organizerId=${organizerId}`,
        return_url: `${hostUrl}?stripe_callback=success&accountId=${account.id}&organizerId=${organizerId}`,
        type: 'account_onboarding',
      });

      res.json({
        accountId: account.id,
        url: accountLink.url,
        simulation: false
      });
    } catch (error: any) {
      console.error("Stripe Connect Account creation error:", error);
      res.status(500).json({ error: error.message });
    }
  };

  app.post("/api/stripe/create-connect-account", handleCreateConnectAccount);
  app.post("/api/stripe/create-connected-account", handleCreateConnectAccount);

  // Create Checkout Session to pay organizer fee directly
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      const { routeId, routeName, entryFee, connectedAccountId, runnerId, runnerName } = req.body;
      
      if (!routeId || !entryFee || !runnerId) {
        return res.status(400).json({ error: "Missing required booking details" });
      }

      const stripe = getStripe();
      if (!stripe || !connectedAccountId || connectedAccountId.startsWith('acct_sim_')) {
        // Simulation mode Checkout redirect url
        const mockSessionId = `cs_sim_${Math.random().toString(36).substring(2, 11)}`;
        const hostUrl = process.env.APP_URL || `http://localhost:${PORT}`;
        const mockCheckoutUrl = `${hostUrl}?checkout_callback=success&routeId=${routeId}&runnerId=${runnerId}&amount=${entryFee}&sim=true&sessionId=${mockSessionId}`;
        return res.json({
          sessionId: mockSessionId,
          url: mockCheckoutUrl,
          simulation: true
        });
      }

      // Real Stripe Connect Destination Charge Checkout Session
      const hostUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      
      // Calculate commission fee dynamically based on platformSettings
      const platformFeePercent = platformSettings.commissionPercent / 100;
      const amountInCents = Math.round(entryFee * 100);
      const applicationFeeAmount = Math.max(50, Math.round(amountInCents * platformFeePercent)); // min 50 cents platform fee

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Inscription Randonnée : ${routeName || 'Trail Rando'}`,
              description: `Frais de participation reversés directement au compte organisateur. Participant: ${runnerName || 'Coureur'}`
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: connectedAccountId,
          },
        },
        success_url: `${hostUrl}?checkout_callback=success&routeId=${routeId}&runnerId=${runnerId}&amount=${entryFee}&sessionId={CHECKOUT_SESSION_ID}`,
        cancel_url: `${hostUrl}?checkout_callback=cancel&routeId=${routeId}`,
      });

      res.json({
        sessionId: session.id,
        url: session.url,
        simulation: false
      });
    } catch (error: any) {
      console.error("Stripe Checkout creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
