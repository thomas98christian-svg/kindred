import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import Stripe from "stripe";

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: "2025-01-27-accursed" as any,
  });
};

export async function POST(request: Request) {
  const stripeInstance = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeInstance || !webhookSecret) {
    return NextResponse.json({ received: false, error: "Stripe webhook unconfigured" }, { status: 400 });
  }

  const payload = await request.text();
  const sig = request.headers.get("Stripe-Signature");

  if (!sig) {
    return NextResponse.json({ received: false, error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripeInstance.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ received: false, error: `Signature verification failed: ${err.message}` }, { status: 400 });
  }

  const db = getAdminDb();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subId = session.subscription as string;

        if (userId && subId) {
          const subscription = (await stripeInstance.subscriptions.retrieve(subId)) as any;
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

          await db.collection("subscriptions").doc(userId).set({
            profileId: userId,
            stripeCustomerId: customerId,
            stripeSubId: subId,
            tier: "plus",
            status: subscription.status,
            currentPeriodEnd,
          }, { merge: true });

          // Also set tier field on profile for quick lookups
          await db.collection("profiles").doc(userId).set({
            subscriptionTier: "plus",
          }, { merge: true });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const subId = subscription.id;
        const customerId = subscription.customer as string;
        
        // Find subscription doc by stripeSubId
        const snap = await db.collection("subscriptions")
          .where("stripeSubId", "==", subId)
          .limit(1)
          .get();

        if (!snap.empty) {
          const userId = snap.docs[0].id;
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          
          let tier = "plus";
          let status = subscription.status;
          
          if (status === "canceled" || status === "unpaid") {
            tier = "free";
          }

          await db.collection("subscriptions").doc(userId).set({
            status,
            currentPeriodEnd,
            tier,
          }, { merge: true });

          await db.collection("profiles").doc(userId).set({
            subscriptionTier: tier,
          }, { merge: true });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const subId = subscription.id;

        const snap = await db.collection("subscriptions")
          .where("stripeSubId", "==", subId)
          .limit(1)
          .get();

        if (!snap.empty) {
          const userId = snap.docs[0].id;

          await db.collection("subscriptions").doc(userId).set({
            status: "cancelled",
            tier: "free",
          }, { merge: true });

          await db.collection("profiles").doc(userId).set({
            subscriptionTier: "free",
          }, { merge: true });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ received: false, error: err.message }, { status: 500 });
  }
}
