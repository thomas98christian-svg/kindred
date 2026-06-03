"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/config";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { success, error } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    
    try {
      const auth = getFirebaseAuth();
      const userCredential = isSignUp
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);

      const idToken = await userCredential.user.getIdToken();

      // Call the API route to set the session cookie
      const res = await fetch("/api/auth/on-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to establish session");
      }

      success(isSignUp ? "Account created successfully!" : "Signed in successfully!");

      if (isSignUp) {
        router.push("/onboarding");
      } else {
        router.push("/discover");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to authenticate");
      error(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-foreground animate-gradient-bg">
      {/* Decorative premium radial glow spheres */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none animate-float" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" style={{ animationDelay: "2s" }} />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md glass p-8 rounded-3xl shadow-2xl z-10 relative overflow-hidden border border-white/10"
      >
        {/* Subtle top glow highlight */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-brand-400/30 to-transparent" />

        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-14 h-14 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30 mb-4 animate-pulse-glow"
          >
            <Sparkles className="text-white" size={28} />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent"
          >
            Kindred
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-surface-400 text-sm mt-1"
          >
            Remove the four moments where new connections die.
          </motion.p>
        </div>

        {/* Authenticate Form */}
        <form onSubmit={handleAuth} className="space-y-5">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full p-3 rounded-xl bg-surface-950/60 border border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm transition-all duration-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="relative"
          >
            <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full p-3 pr-10 rounded-xl bg-surface-950/60 border border-white/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm transition-all duration-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </motion.div>

          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2 text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-xs font-medium"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Establishing connection...
              </>
            ) : isSignUp ? (
              "Create Account"
            ) : (
              "Sign In to Kindred"
            )}
          </motion.button>
        </form>

        {/* Form Toggle Link */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-center"
        >
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg("");
            }}
            className="text-xs font-medium text-surface-400 hover:text-brand-400 transition-colors"
          >
            {isSignUp ? (
              <>Already have an account? <span className="text-brand-400 font-semibold underline">Sign In</span></>
            ) : (
              <>New to Kindred? <span className="text-brand-400 font-semibold underline">Sign Up</span></>
            )}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
