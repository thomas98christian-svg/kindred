import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import Stripe from "stripe";

// Initialize Stripe conditionally to prevent crash on empty env var
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: "2025-01-27-accursed" as any, // fallback to standard stable api version
  });
};

export async function POST(request: Request) {
  try {
    // 1. Authenticate user from session cookie
    const auth = getAdminAuth();
    const sessionCookie = request.headers.get("cookie")
      ?.split("; ")
      .find((row) => row.startsWith("__session="))
      ?.split("=")[1];

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    let decodedClaims;
    try {
      decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (authErr) {
      console.error("Auth verify error:", authErr);
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }

    const userId = decodedClaims.uid;
    const email = decodedClaims.email || "";

    const stripeInstance = getStripe();
    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Sandbox fallbacks
    if (!stripeInstance) {
      console.log("Stripe secret key missing. Using mock checkout flow.");
      return NextResponse.json({
        url: `${origin}/profile?subscription=success&mock=true`,
        mock: true,
      });
    }

    // Create real Stripe checkout session
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Kindred Plus Membership",
              description: "Unlimited Swipes, Priority Discovery, and Premium Custom Themes.",
            },
            unit_amount: 999, // $9.99
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer_email: email,
      metadata: { userId },
      success_url: `${origin}/profile?subscription=success`,
      cancel_url: `${origin}/profile?subscription=cancel`,
    });

    return NextResponse.json({ url: session.url, mock: false });
  } catch (err: any) {
    console.error("Checkout session creation failed:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
