"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getFirebaseDb, doc, readDoc } from "@/lib/firebase/firestore";
import { ProfileDoc } from "@/types/database";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Check, Heart, Shield, Award, Users } from "lucide-react";
import Link from "next/link";

export default function SubscriptionSettingsPage() {
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function loadProfile() {
      try {
        const docData = await readDoc<ProfileDoc>("profiles", user!.uid);
        if (docData) {
          setProfile(docData);
        }
      } catch (err) {
        console.error(err);
        error("Could not fetch profile subscription details.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user, error]);

  const handleUpgrade = async () => {
    setRedirecting(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        // Redirect to checkout URL (Stripe hosted page or sandbox mock page)
        router.push(data.url);
      } else {
        error(data.error || "Failed to start checkout session.");
        setRedirecting(false);
      }
    } catch (err) {
      console.error(err);
      error("Could not initiate upgrade session.");
      setRedirecting(false);
    }
  };

  const handleManagePortal = async () => {
    setRedirecting(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        router.push(data.url);
      } else {
        error(data.error || "Failed to load billing portal.");
        setRedirecting(false);
      }
    } catch (err) {
      console.error(err);
      error("Could not load Stripe billing portal.");
      setRedirecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
          <p className="text-surface-500 text-sm font-medium">Checking subscription tier...</p>
        </div>
      </div>
    );
  }

  // Get active tier (from profile metadata)
  // Let's typecast profile as any since subscriptionTier might be newly added to ProfileDoc
  const tier = (profile as any)?.subscriptionTier || "free";

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Decorative radial blur blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="flex items-center gap-3 p-4 max-w-2xl mx-auto border-b border-white/5 bg-transparent backdrop-blur-xl z-20">
        <Link href="/profile" className="p-2 rounded-full hover:bg-surface-800 transition-colors">
          <ArrowLeft size={18} className="text-surface-300" />
        </Link>
        <div>
          <h1 className="font-extrabold text-sm tracking-tight text-white">Membership Plans</h1>
          <p className="text-[10px] font-semibold text-surface-400">Upgrade to Kindred Plus for full features</p>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-6 relative z-10">
        
        {/* Current status banner */}
        <div className="glass p-5 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-surface-500 tracking-wider">Current Membership</span>
            <p className="text-xl font-black text-white capitalize">{tier === "plus" ? "Kindred Plus" : "Kindred Free"}</p>
          </div>
          {tier === "plus" ? (
            <span className="px-3.5 py-1 bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-brand-500/10">
              <Award size={14} /> Active
            </span>
          ) : (
            <span className="px-3.5 py-1 bg-surface-800 text-surface-400 border border-border rounded-full text-xs font-bold">
              Standard Account
            </span>
          )}
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 pt-2">
          
          {/* Free Tier */}
          <div className="glass p-6 rounded-2xl border border-white/5 relative flex flex-col justify-between opacity-80">
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg text-surface-300">Kindred Free</h3>
                <p className="text-2xl font-black text-white mt-1">$0</p>
                <p className="text-[10px] text-surface-500">Essential discovery features</p>
              </div>

              <ul className="space-y-3.5 text-xs text-surface-400 font-semibold">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-surface-400" />
                  <span>5 Candidate swipes per day</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-surface-400" />
                  <span>Basic profile customization</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-surface-400" />
                  <span>Secure chat with active matches</span>
                </li>
              </ul>
            </div>
            
            <button 
              disabled 
              className="w-full mt-8 py-3 bg-surface-850 text-surface-500 rounded-xl font-bold text-xs border border-white/5 cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>

          {/* Plus Tier */}
          <div className="glass p-6 rounded-2xl border border-brand-500/35 relative flex flex-col justify-between shadow-xl shadow-brand-500/5 overflow-hidden">
            {/* Top Glow bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-500 to-indigo-500" />
            
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-lg text-white flex items-center gap-1.5">
                    Kindred Plus
                    <Sparkles size={16} className="text-brand-400 animate-pulse" />
                  </h3>
                  <p className="text-2xl font-black text-white mt-1">
                    $9.99<span className="text-xs text-surface-400 font-normal"> / month</span>
                  </p>
                  <p className="text-[10px] text-brand-400 font-bold">Unlocks all core boundaries</p>
                </div>
                <span className="text-[9px] uppercase font-extrabold bg-brand-500 text-white px-2 py-0.5 rounded shadow">Popular</span>
              </div>

              <ul className="space-y-3.5 text-xs text-surface-300 font-semibold">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-brand-400" />
                  <span>Unlimited swipes (No limits)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-brand-400" />
                  <span>AI Buddy suggested chat openers</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-brand-400" />
                  <span>Midpoint cafe suggestions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-brand-400" />
                  <span>Plus verification premium badge</span>
                </li>
              </ul>
            </div>

            {tier === "plus" ? (
              <button 
                onClick={handleManagePortal}
                disabled={redirecting}
                className="w-full mt-8 py-3 bg-brand-600/10 hover:bg-brand-600/20 text-brand-400 border border-brand-500/20 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {redirecting ? "Loading Portal..." : "Manage Subscription"}
              </button>
            ) : (
              <button 
                onClick={handleUpgrade}
                disabled={redirecting}
                className="w-full mt-8 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {redirecting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Opening Checkout...
                  </>
                ) : (
                  <>
                    Upgrade to Plus
                  </>
                )}
              </button>
            )}
          </div>
          
        </div>

        {/* Security disclaimer */}
        <p className="text-[10px] text-surface-500 text-center leading-relaxed max-w-sm mx-auto">
          Subscriptions auto-renew monthly at $9.99. You can edit payment details or cancel anytime at your customer billing portal page.
        </p>

      </div>
    </div>
  );
}
