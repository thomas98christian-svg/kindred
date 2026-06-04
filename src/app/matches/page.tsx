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
  orderBy,
  limit,
} from "@/lib/firebase/firestore";
import { ConnectionDoc, ProfileDoc, MessageDoc, LikeDoc } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, MessageCircle, Clock, Sparkles, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ConnectionView {
  id: string;
  connection: ConnectionDoc;
  otherProfile: ProfileDoc;
  lastMessage: string;
  isUnread: boolean;
  timeLeftStr: string;
}

interface LikeView {
  id: string;
  like: LikeDoc;
  senderProfile: ProfileDoc;
  senderId: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function MatchesPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<"connections" | "likes">("connections");
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [likes, setLikes] = useState<LikeView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchAll() {
      try {
        const db = getFirebaseDb();

        // ── Connections ──────────────────────────────────
        const connQ = query(
          collection(db, "connections"),
          where("participants", "array-contains", user!.uid),
          where("state", "==", "open")
        );
        const connSnap = await getDocs(connQ);
        const connResults: ConnectionView[] = [];

        for (const d of connSnap.docs) {
          const conn = d.data() as ConnectionDoc;
          const otherId = conn.profileA === user!.uid ? conn.profileB : conn.profileA;
          const otherProfile = await readDoc<ProfileDoc>("profiles", otherId);
          if (!otherProfile) continue;

          const msgRef = collection(db, "connections", d.id, "messages");
          const msgQ = query(msgRef, orderBy("createdAt", "desc"), limit(1));
          const msgSnap = await getDocs(msgQ);

          let lastMessage = "No messages yet. Say hello!";
          let isUnread = false;
          if (!msgSnap.empty) {
            const lastMsgDoc = msgSnap.docs[0].data() as MessageDoc;
            lastMessage = lastMsgDoc.body || "";
            isUnread = lastMsgDoc.senderId !== user!.uid && !conn.firstMessageAt;
          }

          let timeLeftStr = "Expired";
          if (conn.softDeadline) {
            const diffMs = conn.softDeadline.toMillis() - Date.now();
            if (diffMs > 0) {
              const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
              timeLeftStr = `${diffHours}h left`;
            }
          }

          connResults.push({ id: d.id, connection: conn, otherProfile, lastMessage, isUnread, timeLeftStr });
        }
        setConnections(connResults);

        // ── Likes You ────────────────────────────────────
        const likesQ = query(
          collection(db, "likes"),
          where("toUid", "==", user!.uid)
        );
        const likesSnap = await getDocs(likesQ);

        // Dedupe by sender: keep most recent like per person
        const byUser = new Map<string, { id: string; like: LikeDoc }>();
        for (const d of likesSnap.docs) {
          const like = d.data() as LikeDoc;
          const existing = byUser.get(like.fromUid);
          if (!existing) {
            byUser.set(like.fromUid, { id: d.id, like });
          }
        }

        const likeResults: LikeView[] = [];
        for (const [senderId, { id, like }] of byUser) {
          const senderProfile = await readDoc<ProfileDoc>("profiles", senderId);
          if (senderProfile) {
            likeResults.push({ id, like, senderProfile, senderId });
          }
        }
        setLikes(likeResults);
      } catch (err) {
        console.error("Failed to fetch matches data", err);
        error("Could not fetch matches.");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [user, error]);

  if (!user || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
          <p className="text-surface-500 text-sm font-medium">Opening your connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-background min-h-screen pb-24">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-3 sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-md">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Kindred Connections
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-surface-900 border border-white/8 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab("connections")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === "connections"
                ? "bg-brand-600 text-white shadow-md"
                : "text-surface-400 hover:text-white"
            }`}
          >
            Connections
            {connections.length > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${tab === "connections" ? "bg-white/20 text-white" : "bg-surface-700 text-surface-400"}`}>
                {connections.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("likes")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all relative ${
              tab === "likes"
                ? "bg-rose-600 text-white shadow-md"
                : "text-surface-400 hover:text-white"
            }`}
          >
            Likes You
            {likes.length > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${tab === "likes" ? "bg-white/20 text-white" : "bg-rose-500/20 text-rose-400"}`}>
                {likes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pt-4">
        <AnimatePresence mode="wait">
          {tab === "connections" ? (
            <motion.div key="connections" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {connections.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center text-surface-500 py-16 px-6 glass rounded-3xl border border-white/5 space-y-4 mt-4"
                >
                  <MessageCircle size={48} className="mx-auto mb-2 opacity-30 text-brand-400 animate-pulse" />
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">No connections yet</p>
                    <p className="text-xs text-surface-400">
                      Go to Discover to meet people and form kindred links.
                    </p>
                  </div>
                  <Link
                    href="/discover"
                    className="inline-block py-2.5 px-6 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold text-xs transition-colors shadow-lg shadow-brand-500/20"
                  >
                    Start Discovering
                  </Link>
                </motion.div>
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                  {connections.map((c) => (
                    <motion.div key={c.id} variants={itemVariants}>
                      <Link href={`/matches/${c.id}`} className="block">
                        <div className="glass border border-white/10 p-4 rounded-2xl flex items-center gap-4 hover:bg-surface-900/60 active:scale-[0.99] transition-all duration-200 relative group">
                          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-brand-500/0 group-hover:via-brand-500/20 to-transparent transition-all duration-300" />
                          <div className="w-14 h-14 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                            {(c.otherProfile.photos?.[0] || c.otherProfile.photoUrl) ? (
                              <img src={c.otherProfile.photos?.[0] || c.otherProfile.photoUrl!} alt={c.otherProfile.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <User size={24} className="text-white/40" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-extrabold text-foreground text-sm tracking-tight truncate">
                                {c.otherProfile.displayName}
                              </h3>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md shrink-0 ml-2">
                                <Clock size={10} />
                                <span>{c.timeLeftStr}</span>
                              </div>
                            </div>
                            <p className="text-xs text-surface-400 font-medium truncate">{c.lastMessage}</p>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] font-semibold bg-brand-500/10 border border-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-md capitalize">
                                {c.connection.mode}
                              </span>
                              <span className="text-[10px] font-semibold bg-surface-800 border border-border text-surface-400 px-1.5 py-0.5 rounded-md capitalize">
                                {c.otherProfile.seriousness}
                              </span>
                            </div>
                          </div>
                          {c.isUnread && (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div key="likes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {likes.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center text-surface-500 py-16 px-6 glass rounded-3xl border border-white/5 space-y-4 mt-4"
                >
                  <Heart size={48} className="mx-auto mb-2 opacity-30 text-rose-400" />
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">No likes yet</p>
                    <p className="text-xs text-surface-400">
                      When someone likes your profile, they'll appear here.
                    </p>
                  </div>
                  <Link
                    href="/discover"
                    className="inline-block py-2.5 px-6 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold text-xs transition-colors shadow-lg shadow-rose-500/20"
                  >
                    Keep Discovering
                  </Link>
                </motion.div>
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                  {likes.map((l) => (
                    <motion.div key={l.id} variants={itemVariants}>
                      <button
                        onClick={() => router.push(`/profile/${l.senderId}`)}
                        className="w-full glass border border-rose-500/15 p-4 rounded-2xl flex items-center gap-4 hover:bg-rose-500/5 active:scale-[0.99] transition-all duration-200 text-left"
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-14 h-14 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-md">
                            {(l.senderProfile.photos?.[0] || l.senderProfile.photoUrl) ? (
                              <img src={l.senderProfile.photos?.[0] || l.senderProfile.photoUrl!} alt={l.senderProfile.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <User size={24} className="text-white/40" />
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center border-2 border-background">
                            <Heart size={10} className="text-white" fill="currentColor" />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-foreground text-sm tracking-tight truncate">
                              {l.senderProfile.displayName}, {l.senderProfile.age}
                            </h3>
                          </div>
                          <p className="text-[10px] text-rose-400 font-semibold capitalize">
                            Liked your {l.like.elementId.replace("_", " ").replace(/\d/, (n) => `#${parseInt(n) + 1}`)}
                          </p>
                          {l.like.note ? (
                            <p className="text-xs text-surface-300 italic truncate">&ldquo;{l.like.note}&rdquo;</p>
                          ) : (
                            <p className="text-xs text-surface-500 truncate">
                              {l.senderProfile.city || l.senderProfile.metro}, {l.senderProfile.state}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg">
                          View
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
