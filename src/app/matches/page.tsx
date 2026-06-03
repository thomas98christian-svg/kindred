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
  limit 
} from "@/lib/firebase/firestore";
import { ConnectionDoc, ProfileDoc, MessageDoc } from "@/types/database";
import Link from "next/link";
import { User, MessageCircle, Clock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface ConnectionView {
  id: string;
  connection: ConnectionDoc;
  otherProfile: ProfileDoc;
  lastMessage: string;
  isUnread: boolean;
  timeLeftStr: string;
}

export default function MatchesPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    async function fetchConnections() {
      try {
        const db = getFirebaseDb();
        const q = query(
          collection(db, "connections"),
          where("participants", "array-contains", user!.uid),
          where("state", "==", "active")
        );
        
        const snap = await getDocs(q);
        const results: ConnectionView[] = [];

        for (const d of snap.docs) {
          const conn = d.data() as ConnectionDoc;
          const otherId = conn.profileA === user!.uid ? conn.profileB : conn.profileA;
          
          const otherProfile = await readDoc<ProfileDoc>("profiles", otherId);
          if (otherProfile) {
            // Fetch last message preview
            const msgRef = collection(db, "connections", d.id, "messages");
            const msgQ = query(msgRef, orderBy("createdAt", "desc"), limit(1));
            const msgSnap = await getDocs(msgQ);
            
            let lastMessage = "No messages yet. Say hello!";
            let isUnread = false;

            if (!msgSnap.empty) {
              const lastMsgDoc = msgSnap.docs[0].data() as MessageDoc;
              lastMessage = lastMsgDoc.body || "";
              // Unread if the last message is from the other person
              isUnread = lastMsgDoc.senderId !== user!.uid && !conn.firstMessageAt; 
            }

            // Calculate deadline remaining time
            let timeLeftStr = "Expired";
            if (conn.softDeadline) {
              const deadlineMs = conn.softDeadline.toMillis();
              const diffMs = deadlineMs - Date.now();
              if (diffMs > 0) {
                const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
                timeLeftStr = `${diffHours}h left`;
              }
            }

            results.push({
              id: d.id,
              connection: conn,
              otherProfile,
              lastMessage,
              isUnread,
              timeLeftStr,
            });
          }
        }
        
        setConnections(results);
      } catch (err) {
        console.error("Failed to fetch connections", err);
        error("Could not fetch active matches.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchConnections();
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

  // Framer Motion configuration
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-background min-h-screen pb-24">
      <div className="py-4">
        {/* Top Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-md">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Kindred Connections
          </span>
        </div>

        {connections.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center text-surface-500 py-16 px-6 glass rounded-3xl border border-white/5 space-y-4"
          >
            <MessageCircle size={48} className="mx-auto mb-2 opacity-30 text-brand-400 animate-pulse" />
            <div className="space-y-1">
              <p className="font-bold text-foreground">No connections yet</p>
              <p className="text-xs text-surface-400">
                Go to the Discover feed to meet new people and form kindred links.
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
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-3.5"
          >
            {connections.map(c => (
              <motion.div key={c.id} variants={itemVariants}>
                <Link href={`/matches/${c.id}`} className="block">
                  <div className="glass border border-white/10 p-4 rounded-2xl flex items-center gap-4 hover:bg-surface-900/60 active:scale-[0.99] transition-all duration-200 relative group">
                    
                    {/* Active highlight glow top border */}
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-brand-500/0 group-hover:via-brand-500/20 to-transparent transition-all duration-300" />
                    
                    {/* Profile avatar representation */}
                    <div className="w-14 h-14 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                      {c.otherProfile.photoUrl ? (
                        <img src={c.otherProfile.photoUrl} alt={c.otherProfile.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} className="text-white/40" />
                      )}
                    </div>

                    {/* Chat Text Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-foreground text-sm tracking-tight truncate">
                          {c.otherProfile.displayName}
                        </h3>
                        {/* Time countdown badge */}
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                          <Clock size={10} />
                          <span>{c.timeLeftStr}</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-surface-400 font-medium truncate">
                        {c.lastMessage}
                      </p>

                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-semibold bg-brand-500/10 border border-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-md capitalize">
                          {c.connection.mode}
                        </span>
                        <span className="text-[10px] font-semibold bg-surface-800 border border-border text-surface-400 px-1.5 py-0.5 rounded-md capitalize">
                          {c.otherProfile.seriousness}
                        </span>
                      </div>
                    </div>

                    {/* Unread Message Green Indicator Dot */}
                    {c.isUnread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0 glow-emerald" />
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
