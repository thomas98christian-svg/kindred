"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { 
  getFirebaseDb, 
  collection, 
  query, 
  where, 
  getDocs, 
  readDoc, 
  doc, 
  setDoc, 
  serverTimestamp 
} from "@/lib/firebase/firestore";
import { ProfileDoc } from "@/types/database";
import { passesPreFilters, calculateCompatScore } from "@/lib/matching/engine";
import { UserX, Heart, User, MapPin, Sparkles, Compass, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from "framer-motion";

interface Candidate {
  id: string;
  profile: ProfileDoc;
  score: number;
}

export default function DiscoverPage() {
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const router = useRouter();
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myProfile, setMyProfile] = useState<ProfileDoc | null>(null);

  // Drag-to-swipe physics values
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);
  
  // Overlay indicators opacity
  const connectOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);

  const cardControls = useAnimation();

  useEffect(() => {
    if (!user) return;

    async function loadCandidates() {
      try {
        const db = getFirebaseDb();
        
        // 1. Fetch my profile
        const fetchedProfile = await readDoc<ProfileDoc>("profiles", user!.uid);
        if (!fetchedProfile) {
          info("Please complete onboarding to get started.");
          router.push("/onboarding");
          return;
        }
        setMyProfile(fetchedProfile);

        // 2. Fetch my answers
        const myAnswersSnap = await getDocs(collection(db, `profiles/${user!.uid}/profileAnswers`));
        const myAnswers: Record<string, any> = {};
        myAnswersSnap.forEach(d => myAnswers[d.id] = d.data().value);

        // 3. Fetch matches/passes to exclude them
        const matchesQ = query(collection(db, "matches"), where("participants", "array-contains", user!.uid));
        const matchesSnap = await getDocs(matchesQ);
        const interactedIds = new Set<string>();
        matchesSnap.forEach(d => {
          const m = d.data();
          interactedIds.add(m.profileA === user!.uid ? m.profileB : m.profileA);
        });

        // 4. Fetch profiles in community
        const profilesQ = query(
          collection(db, "profiles"),
          where("communityId", "==", fetchedProfile.communityId),
          where("status", "==", "active")
        );
        const profilesSnap = await getDocs(profilesQ);
        
        const validCandidates: Candidate[] = [];

        for (const docSnap of profilesSnap.docs) {
          if (docSnap.id === user!.uid) continue;
          if (interactedIds.has(docSnap.id)) continue;
          
          const candidateProfile = docSnap.data() as ProfileDoc;
          
          if (passesPreFilters(fetchedProfile, candidateProfile)) {
            // Fetch their answers
            const theirAnswersSnap = await getDocs(collection(db, `profiles/${docSnap.id}/profileAnswers`));
            const theirAnswers: Record<string, any> = {};
            theirAnswersSnap.forEach(d => theirAnswers[d.id] = d.data().value);

            const score = calculateCompatScore(myAnswers, theirAnswers);
            validCandidates.push({
              id: docSnap.id,
              profile: candidateProfile,
              score,
            });
          }
        }

        // Sort by score descending
        validCandidates.sort((a, b) => b.score - a.score);
        setCandidates(validCandidates);
      } catch (err) {
        console.error("Failed to load candidates:", err);
        error("Failed to fetch discovery cards.");
      } finally {
        setLoading(false);
      }
    }

    loadCandidates();
  }, [user, router, error, info]);

  const handleAction = async (action: 'pass' | 'connect') => {
    if (!user || currentIndex >= candidates.length) return;
    const candidate = candidates[currentIndex];
    
    // Swipe animation exit
    if (action === 'connect') {
      await cardControls.start({ x: 400, opacity: 0, transition: { duration: 0.2 } });
      
      const db = getFirebaseDb();
      const participants = [user.uid, candidate.id].sort() as [string, string];
      const matchId = `${participants[0]}_${participants[1]}`;
      
      try {
        await setDoc(doc(db, "matches", matchId), {
          profileA: participants[0],
          profileB: participants[1],
          participants,
          compatScore: candidate.score,
          status: "active", // Immediate connection
          createdAt: serverTimestamp(),
        }, { merge: true });

        await setDoc(doc(db, "connections", matchId), {
          matchId,
          mode: candidate.profile.intentModes.includes("dating") && myProfile?.intentModes.includes("dating") ? "dating" : "friendship",
          profileA: participants[0],
          profileB: participants[1],
          participants,
          openedAt: serverTimestamp(),
          softDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // +48h
          state: "active",
          closedReason: null,
        }, { merge: true });

        success(`Matched with ${candidate.profile.displayName}! Check your matches tab.`);
      } catch (err) {
        console.error(err);
        error("Failed to save match.");
      }
    } else {
      await cardControls.start({ x: -400, opacity: 0, transition: { duration: 0.2 } });
      // Pass is client-only skip in this version
      info(`Skipped ${candidate.profile.displayName}`);
    }

    // Reset coordinates for next card and increment
    x.set(0);
    setCurrentIndex(prev => prev + 1);
  };

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 140;
    if (info.offset.x > swipeThreshold) {
      handleAction('connect');
    } else if (info.offset.x < -swipeThreshold) {
      handleAction('pass');
    } else {
      cardControls.start({ x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 20 } });
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
          <p className="text-surface-500 text-sm font-medium">Seeking potential connections...</p>
        </div>
      </div>
    );
  }

  const isWaitlist = currentIndex >= candidates.length;

  return (
    <div className="min-h-screen flex flex-col justify-between max-w-md mx-auto p-4 bg-background pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between py-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-md">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Kindred
          </span>
        </div>
        {myProfile && (
          <span className="text-xs bg-surface-800 border border-border px-3 py-1 rounded-full text-surface-400 font-semibold flex items-center gap-1">
            <Compass size={12} />
            {myProfile.metro} Metro
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isWaitlist ? (
          <motion.div 
            key="empty-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-5 px-6"
          >
            <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center border border-brand-500/20 text-brand-400 animate-bounce">
              <Compass size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">You've explored everyone!</h2>
              <p className="text-surface-400 text-sm leading-relaxed">
                There are no more candidates in your community overlapping with your preferences.
              </p>
            </div>
            <p className="text-xs text-surface-500">
              We'll notify you as soon as new people join. Check back later!
            </p>
          </motion.div>
        ) : (() => {
          const current = candidates[currentIndex];
          return (
            <div className="flex-1 flex flex-col justify-center">
              {/* Swipe Card container */}
              <motion.div
                key={current.id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.9}
                onDragEnd={handleDragEnd}
                animate={cardControls}
                style={{ x, rotate, opacity }}
                className="bg-surface-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative cursor-grab active:cursor-grabbing select-none"
              >
                {/* Swipe Overlay labels */}
                <motion.div 
                  style={{ opacity: connectOpacity }}
                  className="absolute top-8 left-8 z-30 border-4 border-emerald-500 text-emerald-400 bg-emerald-950/80 font-black text-3xl px-4 py-2 rounded-xl rotate-[-12deg] tracking-wider uppercase pointer-events-none"
                >
                  Connect
                </motion.div>
                <motion.div 
                  style={{ opacity: passOpacity }}
                  className="absolute top-8 right-8 z-30 border-4 border-red-500 text-red-400 bg-red-950/80 font-black text-3xl px-4 py-2 rounded-xl rotate-[12deg] tracking-wider uppercase pointer-events-none"
                >
                  Pass
                </motion.div>

                {/* Profile Photo Mock */}
                <div className="h-80 bg-gradient-to-br from-brand-900/30 to-indigo-900/40 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <User size={80} className="text-white/20" />
                  </div>
                  {/* Gradient Overlay for name */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  
                  <div className="absolute bottom-0 left-0 p-6 w-full text-white flex justify-between items-end">
                    <div>
                      <h2 className="text-3xl font-extrabold tracking-tight">
                        {current.profile.displayName}, {current.profile.age}
                      </h2>
                      <div className="flex items-center gap-1.5 text-white/80 text-xs font-semibold mt-1">
                        <MapPin size={14} className="text-brand-400" />
                        <span>{current.profile.city || "Seattle"}, {current.profile.state}</span>
                      </div>
                    </div>

                    {/* Animated Compatibility Score Ring */}
                    <div className="relative w-16 h-16 shrink-0 bg-slate-950/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 shadow-lg">
                      <svg className="w-14 h-14 transform -rotate-90">
                        <circle
                          cx="28"
                          cy="28"
                          r="22"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          fill="transparent"
                          className="text-white/10"
                        />
                        <motion.circle
                          cx="28"
                          cy="28"
                          r="22"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          fill="transparent"
                          className="text-brand-500"
                          strokeDasharray={2 * Math.PI * 22}
                          initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - current.score / 100) }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[13px] font-black text-white">
                        {current.score}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="p-6 space-y-5">
                  <div className="flex gap-2 flex-wrap">
                    {current.profile.intentModes.map(mode => (
                      <span key={mode} className="px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full text-xs font-semibold capitalize">
                        {mode}
                      </span>
                    ))}
                    <span className="px-3 py-1 bg-surface-800 border border-border text-surface-400 rounded-full text-xs font-semibold capitalize">
                      {current.profile.seriousness}
                    </span>
                    <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-semibold capitalize">
                      {current.profile.segment}
                    </span>
                  </div>

                  {current.profile.bio && (
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-bold text-surface-500 uppercase tracking-wider">About</h3>
                      <p className="text-sm text-surface-200 leading-relaxed font-medium">
                        {current.profile.bio}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Action Buttons */}
              <div className="flex justify-center items-center gap-6 mt-6">
                <button 
                  onClick={() => handleAction('pass')}
                  className="w-14 h-14 flex items-center justify-center bg-surface-900 border border-white/10 hover:border-red-500/30 rounded-full text-surface-400 hover:text-red-400 active:scale-95 transition-all shadow-md"
                >
                  <UserX size={24} />
                </button>
                
                <button 
                  onClick={() => handleAction('connect')}
                  className="w-16 h-16 flex items-center justify-center bg-gradient-to-tr from-brand-600 to-indigo-600 text-white rounded-full hover:from-brand-500 hover:to-indigo-500 active:scale-95 transition-all shadow-xl shadow-brand-500/20"
                >
                  <Heart size={28} fill="currentColor" />
                </button>
              </div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
