import { Router, raw } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { subscription as subscriptionTable } from "../db/schema.js";
import { attachSession, requireAuth } from "../middleware/session.js";
import { getStripe, isBillingConfigured } from "../billing/stripe.js";
import type Stripe from "stripe";

export const billingRouter = Router();
export const billingWebhookRouter = Router();

const APP_URL = process.env.CORS_ORIGIN ?? "http://localhost:5173";

async function getOrCreateSubscription(userId: string) {
  const [existing] = await db
    .select()
    .from(subscriptionTable)
    .where(eq(subscriptionTable.userId, userId));
  if (existing) return existing;

  // Defensive fallback for users created before the subscription table existed.
  const [created] = await db
    .insert(subscriptionTable)
    .values({
      userId,
      plan: "free",
      status: "trialing",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    })
    .returning();
  return created;
}

billingRouter.get("/subscription", attachSession, requireAuth, async (req, res) => {
  const sub = await getOrCreateSubscription(req.session!.user.id);
  res.json({ ...sub, configured: isBillingConfigured() });
});

// POST /api/billing/checkout — start a Stripe Checkout session for the Team plan
billingRouter.post("/checkout", attachSession, requireAuth, async (req, res) => {
  if (!isBillingConfigured()) {
    return res.status(400).json({ error: "Billing isn't configured on the server yet." });
  }

  const stripe = getStripe();
  const sub = await getOrCreateSubscription(req.session!.user.id);

  let customerId = sub.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.session!.user.email,
      metadata: { userId: req.session!.user.id },
    });
    customerId = customer.id;
    await db
      .update(subscriptionTable)
      .set({ stripeCustomerId: customerId })
      .where(eq(subscriptionTable.id, sub.id));
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID_TEAM!, quantity: 1 }],
    success_url: `${APP_URL}/settings?billing=success`,
    cancel_url: `${APP_URL}/settings?billing=cancel`,
    metadata: { userId: req.session!.user.id },
  });

  res.json({ url: session.url });
});

// POST /api/billing/portal — manage/cancel an existing subscription
billingRouter.post("/portal", attachSession, requireAuth, async (req, res) => {
  if (!isBillingConfigured()) {
    return res.status(400).json({ error: "Billing isn't configured on the server yet." });
  }

  const stripe = getStripe();
  const sub = await getOrCreateSubscription(req.session!.user.id);
  if (!sub.stripeCustomerId) {
    return res.status(400).json({ error: "No billing account yet — subscribe first." });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${APP_URL}/settings`,
  });

  res.json({ url: session.url });
});

// POST /api/billing/webhook — Stripe calls this directly (no user session).
// Registered on its own router, mounted BEFORE the global express.json() in
// index.ts, since Stripe's signature check needs the raw request body.
billingWebhookRouter.post("/webhook", raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (!process.env.STRIPE_WEBHOOK_SECRET || !signature) {
    return res.status(400).send("Missing webhook signature or secret");
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${(err as Error).message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId && session.subscription) {
        await db
          .update(subscriptionTable)
          .set({
            plan: "team",
            status: "active",
            stripeSubscriptionId: String(session.subscription),
            updatedAt: new Date(),
          })
          .where(eq(subscriptionTable.userId, userId));
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const status =
        sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled";
      await db
        .update(subscriptionTable)
        .set({
          status,
          plan: status === "canceled" ? "free" : "team",
          currentPeriodEnd: sub.items.data[0]?.current_period_end
            ? new Date(sub.items.data[0].current_period_end * 1000)
            : null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionTable.stripeCustomerId, String(sub.customer)));
      break;
    }
  }

  res.json({ received: true });
});
