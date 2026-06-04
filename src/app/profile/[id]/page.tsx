"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { readDoc } from "@/lib/firebase/firestore";
import { ProfileDoc } from "@/types/database";
import { calculateCompatScore, passesPreFilters, MatchCompatResult } from "@/lib/matching/engine";
import {
  ArrowLeft, Heart, MapPin, Briefcase, Baby, Calendar,
  User, Sparkles, ChevronLeft, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfileDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams() as { id: string };
  const profileId = params.id;

  const [profile, setProfile] = useState<ProfileDoc | null>(null);
  const [compat, setCompat] = useState<MatchCompatResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!user || !profileId) return;
    async function load() {
      try {
        const [other, mine] = await Promise.all([
          readDoc<ProfileDoc>("profiles", profileId),
          readDoc<ProfileDoc>("profiles", user!.uid),
        ]);
        if (!other) { router.back(); return; }
        setProfile(other);
        if (mine && passesPreFilters(mine, other)) {
          setCompat(calculateCompatScore(mine, other));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, profileId, router]);

  const photos = profile ? (profile.photos?.length > 0 ? profile.photos : (profile.photoUrl ? [profile.photoUrl] : [])) : [];

  const prevPhoto = () => setPhotoIdx((i) => Math.max(0, i - 1));
  const nextPhoto = () => setPhotoIdx((i) => Math.min(photos.length - 1, i + 1));

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -40) nextPhoto();
    else if (dx > 40) prevPhoto();
    touchStartX.current = null;
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-background min-h-screen pb-24">
      {/* ── Photo Hero ─────────────────────────────────── */}
      <div
        className="relative h-[55vh] bg-slate-950 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" initial={false}>
          {photos.length > 0 ? (
            <motion.img
              key={photoIdx}
              src={photos[photoIdx]}
              alt={profile.displayName}
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

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent pointer-events-none" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-lg border border-white/15 flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Dot indicators */}
        {photos.length > 1 && (
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
            {photos.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-200 ${i === photoIdx ? "w-5 bg-white" : "w-1.5 bg-white/40"}`} />
            ))}
          </div>
        )}

        {/* Prev/Next chevrons */}
        {photoIdx > 0 && (
          <button onClick={prevPhoto} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 active:scale-95 transition-transform">
            <ChevronLeft size={18} />
          </button>
        )}
        {photoIdx < photos.length - 1 && (
          <button onClick={nextPhoto} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 active:scale-95 transition-transform">
            <ChevronRight size={18} />
          </button>
        )}

        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 p-5 w-full text-white z-10">
          <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-lg">
            {profile.displayName}, {profile.age}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <div className="flex items-center gap-1 text-white/70 text-xs font-semibold">
              <MapPin size={12} className="text-brand-400" />
              {profile.city || profile.metro}, {profile.state}
            </div>
            {profile.job && (
              <div className="flex items-center gap-1 text-white/50 text-xs">
                <Briefcase size={11} /> {profile.job}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Compatibility Card ─────────────────────────── */}
      {compat && (
        <div className="mx-4 -mt-5 relative z-10 mb-4">
          <div className="bg-surface-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-2xl shadow-black/40">
            {/* Score ring */}
            <div className="relative shrink-0 flex items-center justify-center" style={{ width: 64, height: 64 }}>
              <svg className="w-full h-full transform -rotate-90">
                <circle cx={32} cy={32} r={26} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/10" />
                <motion.circle
                  cx={32} cy={32} r={26} stroke="currentColor" strokeWidth="4" fill="transparent"
                  className="text-brand-500" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 26}
                  initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - compat.score / 100) }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">{compat.score}%</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Sparkles size={10} /> Why You Two
              </div>
              <p className="text-xs text-surface-200 leading-relaxed font-medium line-clamp-3">{compat.reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Content ────────────────────────────── */}
      <div className="px-4 space-y-5">
        {/* Tags */}
        <div className="flex gap-2 flex-wrap">
          <span className="px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full text-xs font-semibold capitalize">
            dating
          </span>
          <span className="px-3 py-1 bg-surface-800 border border-border text-surface-400 rounded-full text-xs font-semibold capitalize">
            {profile.seriousness}
          </span>
          {profile.kids && (
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold flex items-center gap-1">
              <Baby size={11} /> {profile.kids.replace("_", " ")}
            </span>
          )}
          {profile.psychology?.planningStyle && (
            <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full text-xs font-semibold flex items-center gap-1">
              <Calendar size={11} /> {profile.psychology.planningStyle}
            </span>
          )}
          {profile.height && (
            <span className="px-3 py-1 bg-surface-800 border border-border text-surface-400 rounded-full text-xs font-semibold">
              {Math.floor(profile.height / 12)}&apos;{profile.height % 12}&ldquo;
            </span>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">About</h3>
            <p className="text-sm text-surface-200 leading-relaxed font-medium">{profile.bio}</p>
          </div>
        )}

        {/* Core Values */}
        {profile.psychology?.coreValues?.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Core Values</h3>
            <div className="flex gap-2 flex-wrap">
              {profile.psychology.coreValues.map((v) => (
                <span key={v} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold capitalize">
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Psychology details */}
        {profile.psychology && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Personality</h3>
            <div className="grid grid-cols-2 gap-2">
              {profile.psychology.attachmentTendency && (
                <div className="bg-surface-900/60 border border-white/5 rounded-xl p-3">
                  <div className="text-[9px] font-bold text-surface-500 uppercase tracking-wider mb-1">Attachment</div>
                  <div className="text-xs font-semibold text-surface-200 capitalize">{profile.psychology.attachmentTendency}</div>
                </div>
              )}
              {profile.psychology.conflictRepair && (
                <div className="bg-surface-900/60 border border-white/5 rounded-xl p-3">
                  <div className="text-[9px] font-bold text-surface-500 uppercase tracking-wider mb-1">Conflict Style</div>
                  <div className="text-xs font-semibold text-surface-200 capitalize">{profile.psychology.conflictRepair}</div>
                </div>
              )}
              {profile.psychology.feelCaredFor && (
                <div className="bg-surface-900/60 border border-white/5 rounded-xl p-3">
                  <div className="text-[9px] font-bold text-surface-500 uppercase tracking-wider mb-1">Feels Cared For</div>
                  <div className="text-xs font-semibold text-surface-200 capitalize">{profile.psychology.feelCaredFor}</div>
                </div>
              )}
              {profile.psychology.stressResponse && (
                <div className="bg-surface-900/60 border border-white/5 rounded-xl p-3">
                  <div className="text-[9px] font-bold text-surface-500 uppercase tracking-wider mb-1">Under Stress</div>
                  <div className="text-xs font-semibold text-surface-200 capitalize">{profile.psychology.stressResponse}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compat breakdown */}
        {compat && Object.keys(compat.breakdown).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Compatibility Breakdown</h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(compat.breakdown).map(([key, val]) => (
                <div key={key} className="bg-surface-900/60 border border-white/5 rounded-xl p-2.5 text-center">
                  <div className="text-[9px] font-semibold text-surface-400 capitalize mb-1">{key}</div>
                  <div className={`text-sm font-black ${val >= 0.8 ? "text-emerald-400" : val >= 0.5 ? "text-amber-400" : "text-rose-400"}`}>
                    {Math.round(val * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed Bottom CTA ───────────────────────────── */}
      <div className="fixed bottom-16 left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-md mx-auto px-4 pb-4 flex gap-3 pointer-events-auto">
          <button
            onClick={() => router.back()}
            className="flex-1 py-3.5 bg-surface-900/90 backdrop-blur-xl border border-white/10 rounded-2xl text-surface-400 font-semibold text-sm active:scale-95 transition-all"
          >
            Back
          </button>
          <button
            onClick={() => router.back()}
            className="flex-1 py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Heart size={16} fill="currentColor" /> Like Profile
          </button>
        </div>
      </div>
    </div>
  );
}
