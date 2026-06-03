"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { app } from "@/lib/firebase/config";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const auth = getAuth(app);
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        // Call the signup API route to set the session cookie
        await fetch("/api/auth/on-signup", { method: "POST" });
        router.push("/onboarding");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        await fetch("/api/auth/on-signup", { method: "POST" });
        router.push("/discover");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass p-8 rounded-2xl shadow-xl z-10 relative">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Kindred</h1>
          <p className="text-surface-500">Find your people.</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-border focus:ring-2 focus:ring-brand-500 outline-none transition-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-border focus:ring-2 focus:ring-brand-500 outline-none transition-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-base disabled:opacity-50"
          >
            {loading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-surface-500 hover:text-brand-500 transition-base"
          >
            {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
