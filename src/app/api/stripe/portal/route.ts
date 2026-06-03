import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import Stripe from "stripe";

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: "2025-01-27-accursed" as any,
  });
};

export async function POST(request: Request) {
  try {
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
    } catch {
      return NextResponse.json({ error: "Session invalid" }, { status: 401 });
    }

    const stripeInstance = getStripe();
    const origin = request.headers.get("origin") || "http://localhost:3000";

    if (!stripeInstance) {
      // Mock billing portal redirection url
      return NextResponse.json({
        url: `${origin}/profile?portal=success&mock=true`,
        mock: true,
      });
    }

    // In a real integration, we'd retrieve the Stripe Customer ID from user profile or subscription doc.
    // For simplicity, we can search by email or use metadata from the request.
    const email = decodedClaims.email || "";
    const customers = await stripeInstance.customers.list({ email, limit: 1 });
    
    if (customers.data.length === 0) {
      return NextResponse.json({ error: "No stripe customer found" }, { status: 404 });
    }

    const customerId = customers.data[0].id;
    const portalSession = await stripeInstance.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/profile`,
    });

    return NextResponse.json({ url: portalSession.url, mock: false });
  } catch (err: any) {
    console.error("Portal redirect error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
