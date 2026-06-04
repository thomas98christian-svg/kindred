"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  serverTimestamp,
} from "@/lib/firebase/firestore";
import { ProfileDoc, LikeDoc } from "@/types/database";
import { passesPreFilters, calculateCompatScore, MatchCompatResult } from "@/lib/matching/engine";
import {
  Heart, User, MapPin, Sparkles, Compass,
  ChevronDown, ChevronUp, SlidersHorizontal,
  Play, Pause, Undo2, X, MessageCircleHeart,
  Briefcase, Baby, Calendar, Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────
interface Candidate {
  id: string;
  profile: ProfileDoc;
  score: number;
  compat: MatchCompatResult;
}

interface ElementLike {
  elementId: string;
  label: string;
}

// ─── Heart Burst Particle ────────────────────────────────────
function HeartBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const hearts = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    dx: (Math.random() - 0.5) * 120,
    dy: -(Math.random() * 80 + 40),
    rot: (Math.random() - 0.5) * 60,
    scale: 0.6 + Math.random() * 0.8,
  }));

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]" onAnimationEnd={onDone}>
      {hearts.map((h) => (
        <motion.div
          key={h.id}
          initial={{ x, y, opacity: 1, scale: 0 }}
          animate={{ x: x + h.dx, y: y + h.dy, opacity: 0, scale: h.scale, rotate: h.rot }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          onAnimationComplete={h.id === 0 ? onDone : undefined}
          className="absolute"
        >
          <Heart size={20} className="text-rose-500 fill-rose-500" />
        </motion.div>
      ))}
    </div>
  );
}

// ─── Animated Waveform Player (Mock) ─────────────────────────
function VoicePromptPlayer() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bars = 24;

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            setPlaying(false);
            return 0;
          }
          return p + 2;
        });
      }, 80);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing]);

  return (
    <div className="bg-surface-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-3">
      <button
        onClick={() => setPlaying(!playing)}
        className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shrink-0 active:scale-95 transition-transform"
      >
        {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>
      <div className="flex-1 flex items-end gap-[2px] h-8">
        {Array.from({ length: bars }).map((_, i) => {
          const barProgress = (i / bars) * 100;
          const isActive = barProgress <= progress;
          const h = 8 + Math.sin(i * 0.7) * 12 + Math.random() * 8;
          return (
            <motion.div
              key={i}
              className={`flex-1 rounded-full transition-colors duration-150 ${isActive ? "bg-brand-500" : "bg-white/10"}`}
              style={{ height: `${h}px` }}
              animate={playing && isActive ? { scaleY: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3, repeat: playing ? Infinity : 0, repeatDelay: Math.random() * 0.4 }}
            />
          );
        })}
      </div>
      <span className="text-[10px] text-surface-500 font-mono w-8 text-right">0:15</span>
    </div>
  );
}

// ─── Photo Carousel ──────────────────────────────────────────
function PhotoCarousel({
  photos,
  photoUrl,
  name,
  onDoubleTap,
  onLike,
  likedPhotos,
}: {
  photos: string[];
  photoUrl: string | null;
  name: string;
  onDoubleTap: (e: React.MouseEvent) => void;
  onLike: (elementId: string, label: string) => void;
  likedPhotos: Set<string>;
}) {
  const allPhotos = photos?.length > 0 ? photos : (photoUrl ? [photoUrl] : []);
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(allPhotos.length - 1, i + 1));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -40) next();
    else if (dx > 40) prev();
    touchStartX.current = null;
  };

  const elementId = `photo_${idx}`;
  const isLiked = likedPhotos.has(elementId);

  return (
    <div
      className="relative h-[420px] bg-slate-950 overflow-hidden"
      onDoubleClick={onDoubleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait" initial={false}>
        {allPhotos.length > 0 ? (
          <motion.img
            key={idx}
            src={allPhotos[idx]}
            alt={name}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full object-cover absolute inset-0"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-900/30 to-indigo-900/40">
            <User size={80} className="text-white/20" />
          </div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />

      {/* Tap zones for prev/next (desktop) */}
      {idx > 0 && (
        <button onClick={prev} className="absolute left-0 top-0 w-1/3 h-full z-10 opacity-0" aria-label="Previous photo" />
      )}
      {idx < allPhotos.length - 1 && (
        <button onClick={next} className="absolute right-0 top-0 w-1/3 h-full z-10 opacity-0" aria-label="Next photo" />
      )}

      {/* Dot indicators */}
      {allPhotos.length > 1 && (
        <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
          {allPhotos.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-200 ${i === idx ? "w-5 bg-white" : "w-1.5 bg-white/40"}`}
            />
          ))}
        </div>
      )}

      {/* Photo like button */}
      <button
        onClick={() => onLike(elementId, `Photo ${idx + 1}`)}
        className={`absolute bottom-20 right-4 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-lg transition-all z-20 ${isLiked ? "bg-rose-500/30 border-rose-500/50 text-rose-400" : "bg-black/40 border-white/20 text-white/60 hover:text-rose-400"} border`}
      >
        <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

// ─── Compatibility Ring ──────────────────────────────────────
function CompatRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/10" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth="4" fill="transparent"
          className="text-brand-500" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - score / 100) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">{score}%</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Main Discover Page
// ═════════════════════════════════════════════════════════════
export default function DiscoverPage() {
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const router = useRouter();

  // ─── State ───────────────────────────────────────────────
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myProfile, setMyProfile] = useState<ProfileDoc | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterAge, setFilterAge] = useState<[number, number]>([18, 50]);
  const [filterSeriousness, setFilterSeriousness] = useState<string>("all");

  // Like notes sheet
  const [likeSheet, setLikeSheet] = useState<ElementLike | null>(null);
  const [likeNote, setLikeNote] = useState("");

  // Heart bursts
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const burstIdRef = useRef(0);

  // Over-scroll pass / undo
  const [passedCandidate, setPassedCandidate] = useState<Candidate | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mutual match celebration
  const [mutualMatch, setMutualMatch] = useState<{ name: string; score: number } | null>(null);

  // Track likes the user sent for the current candidate
  const [sentLikes, setSentLikes] = useState<Set<string>>(new Set());

  // ─── Load Candidates ─────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    async function loadCandidates() {
      try {
        const db = getFirebaseDb();
        const fetchedProfile = await readDoc<ProfileDoc>("profiles", user!.uid);
        if (!fetchedProfile) {
          info("Please complete onboarding to get started.");
          router.push("/onboarding");
          return;
        }
        setMyProfile(fetchedProfile);

        const matchesQ = query(collection(db, "matches"), where("participants", "array-contains", user!.uid));
        const matchesSnap = await getDocs(matchesQ);
        const interactedIds = new Set<string>();
        matchesSnap.forEach((d) => {
          const m = d.data();
          interactedIds.add(m.profileA === user!.uid ? m.profileB : m.profileA);
        });

        const profilesQ = query(
          collection(db, "profiles"),
          where("communityId", "==", fetchedProfile.communityId),
          where("status", "==", "active")
        );
        const profilesSnap = await getDocs(profilesQ);
        const valid: Candidate[] = [];

        for (const docSnap of profilesSnap.docs) {
          if (docSnap.id === user!.uid) continue;
          if (interactedIds.has(docSnap.id)) continue;
          const candidateProfile = docSnap.data() as ProfileDoc;
          if (passesPreFilters(fetchedProfile, candidateProfile)) {
            const compat = calculateCompatScore(fetchedProfile, candidateProfile);
            valid.push({ id: docSnap.id, profile: candidateProfile, score: compat.score, compat });
          }
        }

        valid.sort((a, b) => b.score - a.score);
        setCandidates(valid);
      } catch (err) {
        console.error("Failed to load candidates:", err);
        error("Failed to fetch discovery cards.");
      } finally {
        setLoading(false);
      }
    }
    loadCandidates();
  }, [user, router, error, info]);

  // Reset sentLikes when candidate changes
  useEffect(() => { setSentLikes(new Set()); }, [currentIndex]);

  // ─── Like an element ─────────────────────────────────────
  const handleLikeElement = useCallback((el: ElementLike) => {
    if (sentLikes.has(el.elementId)) return;
    setLikeSheet(el);
    setLikeNote("");
  }, [sentLikes]);

  const submitLike = useCallback(async () => {
    if (!user || currentIndex >= candidates.length || !likeSheet) return;
    const candidate = candidates[currentIndex];
    const db = getFirebaseDb();
    const likeId = `${user.uid}_${candidate.id}_${likeSheet.elementId}`;

    try {
      await setDoc(doc(db, "likes", likeId), {
        fromUid: user.uid,
        toUid: candidate.id,
        elementId: likeSheet.elementId,
        note: likeNote.trim(),
        createdAt: serverTimestamp(),
      } satisfies Omit<LikeDoc, "createdAt"> & { createdAt: any });

      setSentLikes((prev) => new Set(prev).add(likeSheet.elementId));
      success(`Liked ${likeSheet.label}`);

      // ─── Check for mutual match ─────────────────────────
      const theirLikesQ = query(
        collection(db, "likes"),
        where("fromUid", "==", candidate.id),
        where("toUid", "==", user.uid)
      );
      const theirLikesSnap = await getDocs(theirLikesQ);

      if (!theirLikesSnap.empty) {
        // Mutual match!
        const participants = [user.uid, candidate.id].sort() as [string, string];
        const matchId = `${participants[0]}_${participants[1]}`;

        await setDoc(doc(db, "matches", matchId), {
          profileA: participants[0],
          profileB: participants[1],
          participants,
          compatScore: candidate.score,
          status: "connected",
          createdAt: serverTimestamp(),
        }, { merge: true });

        await setDoc(doc(db, "connections", matchId), {
          matchId,
          mode: "dating",
          agreedSeriousness: null,
          profileA: participants[0],
          profileB: participants[1],
          participants,
          openedAt: serverTimestamp(),
          softDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
          firstMessageAt: null,
          state: "open",
          closedReason: null,
        }, { merge: true });

        setMutualMatch({ name: candidate.profile.displayName, score: candidate.score });
      }
    } catch (err) {
      console.error("Like failed:", err);
      error("Failed to save like.");
    }
    setLikeSheet(null);
  }, [user, currentIndex, candidates, likeSheet, likeNote, success, error]);

  // ─── Double-tap burst on photo ───────────────────────────
  const handleDoubleTap = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const bx = e.clientX;
    const by = e.clientY;
    const id = burstIdRef.current++;
    setBursts((prev) => [...prev, { id, x: bx, y: by }]);

    // Also trigger a like on photo_0
    if (!sentLikes.has("photo_0") && user && currentIndex < candidates.length) {
      const candidate = candidates[currentIndex];
      const db = getFirebaseDb();
      const likeId = `${user.uid}_${candidate.id}_photo_0`;
      setDoc(doc(db, "likes", likeId), {
        fromUid: user.uid,
        toUid: candidate.id,
        elementId: "photo_0",
        note: "",
        createdAt: serverTimestamp(),
      }).then(() => {
        setSentLikes((prev) => new Set(prev).add("photo_0"));
      }).catch(console.error);
    }
  }, [sentLikes, user, currentIndex, candidates]);

  // ─── Pass with undo ──────────────────────────────────────
  const handlePass = useCallback(() => {
    if (currentIndex >= candidates.length) return;
    // Check paywall
    const tier = (myProfile as any)?.subscriptionTier || "free";
    if (tier === "free") {
      const today = new Date().toISOString().split("T")[0];
      const count = parseInt(localStorage.getItem(`kindred_swipe_count_${today}`) || "0", 10);
      if (count >= 5) {
        setIsPaywallOpen(true);
        return;
      }
      localStorage.setItem(`kindred_swipe_count_${today}`, (count + 1).toString());
    }

    setPassedCandidate(candidates[currentIndex]);
    setShowUndoBanner(true);
    setCurrentIndex((i) => i + 1);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setShowUndoBanner(false);
      setPassedCandidate(null);
    }, 5000);
  }, [currentIndex, candidates, myProfile]);

  const handleUndo = useCallback(() => {
    if (!passedCandidate) return;
    setCurrentIndex((i) => Math.max(0, i - 1));
    setShowUndoBanner(false);
    setPassedCandidate(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    info("Profile restored.");
  }, [passedCandidate, info]);

  // ─── Filter candidates ───────────────────────────────────
  const filtered = candidates.filter((c) => {
    if (c.profile.age < filterAge[0] || c.profile.age > filterAge[1]) return false;
    if (filterSeriousness !== "all" && c.profile.seriousness !== filterSeriousness) return false;
    return true;
  });

  // ─── Loading / auth gate ─────────────────────────────────
  if (!user || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
          <p className="text-surface-500 text-sm font-medium">Finding your people...</p>
        </div>
      </div>
    );
  }

  const isEnd = currentIndex >= filtered.length;
  const current = !isEnd ? filtered[currentIndex] : null;

  // ─── LIKEABLE ELEMENTS for current candidate ─────────────
  const likeableElements: ElementLike[] = current
    ? [
        { elementId: "bio", label: "Bio" },
        ...(current.profile.psychology?.coreValues?.length
          ? [{ elementId: "values", label: "Values" }]
          : []),
        { elementId: "seriousness", label: "Seriousness" },
        ...(current.profile.kids ? [{ elementId: "kids", label: "Kids Goal" }] : []),
        ...(current.profile.psychology?.planningStyle
          ? [{ elementId: "planning", label: "Planning Style" }]
          : []),
      ]
    : [];

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-background pb-24 relative">
      {/* ─── Top Bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-md">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Discover
          </span>
        </div>
        <div className="flex items-center gap-2">
          {myProfile && (
            <span className="text-[10px] bg-surface-800 border border-border px-2.5 py-1 rounded-full text-surface-400 font-semibold flex items-center gap-1">
              <Compass size={10} />{myProfile.metro}
            </span>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${showFilters ? "bg-brand-500/20 border-brand-500/40 text-brand-400" : "bg-surface-900 border-white/10 text-surface-400"}`}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* ─── Filters Drawer ──────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/5"
          >
            <div className="px-4 py-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Age Range: {filterAge[0]} – {filterAge[1]}</label>
                <div className="flex gap-3 mt-2">
                  <input type="range" min={18} max={65} value={filterAge[0]} onChange={(e) => setFilterAge([+e.target.value, filterAge[1]])}
                    className="flex-1 accent-brand-500" />
                  <input type="range" min={18} max={65} value={filterAge[1]} onChange={(e) => setFilterAge([filterAge[0], +e.target.value])}
                    className="flex-1 accent-brand-500" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Seriousness</label>
                <div className="flex gap-2 mt-2">
                  {["all", "casual", "serious"].map((s) => (
                    <button key={s} onClick={() => setFilterSeriousness(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filterSeriousness === s ? "bg-brand-500/20 text-brand-400 border border-brand-500/30" : "bg-surface-900 text-surface-400 border border-white/10"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Content ────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isEnd ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-5 px-6 py-20">
            <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center border border-brand-500/20 text-brand-400">
              <Compass size={40} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">You&apos;ve explored everyone!</h2>
            <p className="text-surface-400 text-sm leading-relaxed">No more candidates match your current filters. Adjust filters or check back later!</p>
          </motion.div>
        ) : current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 overflow-y-auto"
          >
            {/* ── Photo Carousel ────────────────────────── */}
            <div className="relative">
              <PhotoCarousel
                photos={current.profile.photos || []}
                photoUrl={current.profile.photoUrl}
                name={current.profile.displayName}
                onDoubleTap={handleDoubleTap}
                onLike={(elementId, label) => handleLikeElement({ elementId, label })}
                likedPhotos={sentLikes}
              />
              {/* Name + location overlay */}
              <div className="absolute bottom-0 left-0 p-5 w-full text-white flex justify-between items-end z-10">
                <div>
                  <button
                    onClick={() => router.push(`/profile/${current.id}`)}
                    className="text-3xl font-extrabold tracking-tight drop-shadow-lg hover:text-brand-300 transition-colors text-left"
                  >
                    {current.profile.displayName}, {current.profile.age}
                  </button>
                  <div className="flex items-center gap-2 mt-1 pointer-events-none">
                    <div className="flex items-center gap-1 text-white/70 text-xs font-semibold">
                      <MapPin size={12} className="text-brand-400" />
                      {current.profile.city || current.profile.metro}, {current.profile.state}
                    </div>
                    {current.profile.job && (
                      <div className="flex items-center gap-1 text-white/50 text-xs">
                        <Briefcase size={11} /> {current.profile.job}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Why-You-Two Card ──────────────────────── */}
            <div className="mx-4 -mt-6 relative z-10">
              <div className="bg-surface-900/70 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-2xl shadow-black/40">
                <CompatRing score={current.score} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1">Why You Two</div>
                  <p className="text-xs text-surface-200 leading-relaxed font-medium line-clamp-3">{current.compat.reason}</p>
                </div>
              </div>
            </div>

            {/* ── Voice Prompt Player ───────────────────── */}
            <div className="px-4 mt-4">
              <VoicePromptPlayer />
            </div>

            {/* ── Profile Details (likeable sections) ───── */}
            <div className="px-4 mt-5 space-y-4 pb-6">
              {/* Tags */}
              <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full text-xs font-semibold capitalize">dating</span>
                <span className="px-3 py-1 bg-surface-800 border border-border text-surface-400 rounded-full text-xs font-semibold capitalize">{current.profile.seriousness}</span>
                {current.profile.kids && (
                  <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold capitalize flex items-center gap-1">
                    <Baby size={11} />{current.profile.kids.replace("_", " ")}
                  </span>
                )}
                {current.profile.psychology?.planningStyle && (
                  <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full text-xs font-semibold capitalize flex items-center gap-1">
                    <Calendar size={11} />{current.profile.psychology.planningStyle}
                  </span>
                )}
              </div>

              {/* Bio */}
              {current.profile.bio && (
                <div className="relative group">
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">About</h3>
                    <p className="text-sm text-surface-200 leading-relaxed font-medium">{current.profile.bio}</p>
                  </div>
                  <button
                    onClick={() => handleLikeElement({ elementId: "bio", label: "Bio" })}
                    className={`absolute -right-1 top-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${sentLikes.has("bio") ? "text-rose-400" : "text-white/20 hover:text-rose-400"}`}
                  >
                    <Heart size={14} fill={sentLikes.has("bio") ? "currentColor" : "none"} />
                  </button>
                </div>
              )}

              {/* Core Values */}
              {current.profile.psychology?.coreValues && current.profile.psychology.coreValues.length > 0 && (
                <div className="relative">
                  <h3 className="text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-2">Core Values</h3>
                  <div className="flex gap-2 flex-wrap">
                    {current.profile.psychology.coreValues.map((v) => (
                      <span key={v} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold capitalize">
                        {v}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => handleLikeElement({ elementId: "values", label: "Values" })}
                    className={`absolute -right-1 top-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${sentLikes.has("values") ? "text-rose-400" : "text-white/20 hover:text-rose-400"}`}
                  >
                    <Heart size={14} fill={sentLikes.has("values") ? "currentColor" : "none"} />
                  </button>
                </div>
              )}

              {/* Compatibility breakdown */}
              <div>
                <h3 className="text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-2">Compatibility Breakdown</h3>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(current.compat.breakdown).map(([key, val]) => (
                    <div key={key} className="bg-surface-900/60 border border-white/5 rounded-xl p-2.5 text-center">
                      <div className="text-[10px] font-semibold text-surface-400 capitalize mb-1">{key}</div>
                      <div className={`text-sm font-black ${val >= 0.8 ? "text-emerald-400" : val >= 0.5 ? "text-amber-400" : "text-rose-400"}`}>
                        {Math.round(val * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Bottom Action Bar (fixed) ─────────────── */}
            <div className="fixed bottom-16 left-0 right-0 z-30 pointer-events-none">
              <div className="max-w-md mx-auto px-4 pb-4 flex justify-center items-center gap-5 pointer-events-auto">
                <button
                  onClick={handlePass}
                  className="w-14 h-14 flex items-center justify-center bg-surface-900/90 backdrop-blur-xl border border-white/10 hover:border-red-500/30 rounded-full text-surface-400 hover:text-red-400 active:scale-90 transition-all shadow-lg"
                >
                  <X size={24} />
                </button>
                <button
                  onClick={() => handleLikeElement({ elementId: "profile", label: "Profile" })}
                  className="w-16 h-16 flex items-center justify-center bg-gradient-to-tr from-brand-600 to-indigo-600 text-white rounded-full hover:from-brand-500 hover:to-indigo-500 active:scale-90 transition-all shadow-xl shadow-brand-500/25"
                >
                  <Heart size={28} fill="currentColor" />
                </button>
                <button
                  onClick={() => handleLikeElement({ elementId: "poke", label: "Poke" })}
                  className="w-14 h-14 flex items-center justify-center bg-surface-900/90 backdrop-blur-xl border border-white/10 hover:border-amber-500/30 rounded-full text-surface-400 hover:text-amber-400 active:scale-90 transition-all shadow-lg"
                >
                  <Zap size={22} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Heart Bursts ────────────────────────────────── */}
      {bursts.map((b) => (
        <HeartBurst key={b.id} x={b.x} y={b.y} onDone={() => setBursts((prev) => prev.filter((p) => p.id !== b.id))} />
      ))}

      {/* ─── Like Notes Bottom Sheet ─────────────────────── */}
      <AnimatePresence>
        {likeSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setLikeSheet(null)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-surface-900 border-t border-white/10 rounded-t-3xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-400">
                  <Heart size={18} fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Like {likeSheet.label}</h3>
                  <p className="text-[10px] text-surface-400">Add an optional note to make it personal</p>
                </div>
              </div>
              <textarea
                value={likeNote}
                onChange={(e) => setLikeNote(e.target.value)}
                placeholder="What caught your eye? (optional)"
                maxLength={200}
                rows={3}
                className="w-full bg-surface-800 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-surface-500 focus:border-brand-500 focus:outline-none resize-none"
              />
              <div className="flex gap-3">
                <button onClick={() => setLikeSheet(null)}
                  className="flex-1 py-3 bg-surface-800 text-surface-400 rounded-xl font-semibold text-xs border border-white/5">
                  Cancel
                </button>
                <button onClick={submitLike}
                  className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-brand-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-500/20">
                  <span className="flex items-center justify-center gap-1.5">
                    <Heart size={14} fill="currentColor" /> Send Like
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Undo Banner ─────────────────────────────────── */}
      <AnimatePresence>
        {showUndoBanner && passedCandidate && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto"
          >
            <div className="bg-surface-900/95 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between shadow-xl">
              <span className="text-xs text-surface-300 font-medium">
                Passed on <span className="text-white font-bold">{passedCandidate.profile.displayName}</span>
              </span>
              <button onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/20 text-brand-400 rounded-lg text-xs font-bold hover:bg-brand-500/30 transition-colors">
                <Undo2 size={13} /> Undo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Mutual Match Celebration ─────────────────────── */}
      <AnimatePresence>
        {mutualMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[60] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.7, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 15 }}
              className="max-w-sm w-full text-center space-y-6"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.8, repeat: 2 }}
                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-rose-500 to-brand-500 flex items-center justify-center shadow-2xl shadow-rose-500/40"
              >
                <MessageCircleHeart size={48} className="text-white" />
              </motion.div>
              <div>
                <h2 className="text-3xl font-black text-white">It&apos;s a Match!</h2>
                <p className="text-surface-400 text-sm mt-2">
                  You and <span className="text-brand-400 font-bold">{mutualMatch.name}</span> liked each other.
                  <br />Compatibility: <span className="text-white font-bold">{mutualMatch.score}%</span>
                </p>
              </div>
              <div className="space-y-3">
                <button onClick={() => { setMutualMatch(null); router.push("/matches"); }}
                  className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/20">
                  Send a Message
                </button>
                <button onClick={() => setMutualMatch(null)}
                  className="w-full py-3 bg-surface-800 text-surface-400 rounded-xl font-semibold text-xs border border-white/5">
                  Keep Exploring
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Paywall Dialog ───────────────────────────────── */}
      <AnimatePresence>
        {isPaywallOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[55]"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="glass max-w-sm w-full p-6 rounded-3xl border border-brand-500/30 text-center space-y-5 relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-500 to-indigo-500" />
              <div className="w-16 h-16 mx-auto rounded-full bg-brand-500/10 flex items-center justify-center border border-brand-500/25 text-brand-400 animate-bounce mt-2">
                <Sparkles size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">Daily Limit Reached!</h3>
                <p className="text-xs text-surface-400 leading-relaxed">
                  You&apos;ve used all 5 free interactions today. Upgrade to <span className="text-brand-400 font-bold">Kindred Plus</span> for unlimited likes, midpoint cafe spots, and AI conversation starters.
                </p>
              </div>
              <div className="space-y-2.5 pt-2">
                <button onClick={() => router.push("/settings/subscription")}
                  className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20">
                  Unlock Kindred Plus
                </button>
                <button onClick={() => setIsPaywallOpen(false)}
                  className="w-full py-3 bg-surface-850 hover:bg-surface-800 text-surface-400 rounded-xl font-bold text-xs border border-white/5">
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
