"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getFirebaseDb, collection, query, where, getDocs, readDoc } from "@/lib/firebase/firestore";
import { ConnectionDoc, ProfileDoc } from "@/types/database";
import Link from "next/link";
import { User, MessageCircle } from "lucide-react";

interface ConnectionView {
  id: string;
  connection: ConnectionDoc;
  otherProfile: ProfileDoc;
}

export default function MatchesPage() {
  const { user } = useAuth();
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
            results.push({
              id: d.id,
              connection: conn,
              otherProfile,
            });
          }
        }
        
        setConnections(results);
      } catch (err) {
        console.error("Failed to fetch connections", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchConnections();
  }, [user]);

  if (!user || loading) return <div className="p-8 text-center text-surface-500">Loading connections...</div>;

  return (
    <div className="max-w-md mx-auto p-4 bg-background min-h-[100dvh]">
      <div className="py-6">
        <h1 className="text-2xl font-bold mb-6">Your Connections</h1>
        
        {connections.length === 0 ? (
          <div className="text-center text-surface-500 py-12">
            <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
            <p>No active connections yet.</p>
            <Link href="/discover" className="text-brand-600 mt-2 block font-medium">Find your people</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {connections.map(c => (
              <Link key={c.id} href={`/matches/${c.id}`} className="block">
                <div className="bg-surface-100 dark:bg-surface-800 p-4 rounded-xl flex items-center gap-4 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
                  <div className="w-14 h-14 rounded-full bg-surface-300 dark:bg-surface-600 flex items-center justify-center shrink-0">
                    <User size={24} className="text-surface-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{c.otherProfile.displayName}</h3>
                    <p className="text-sm text-surface-500 capitalize">{c.connection.mode}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-brand-500" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
