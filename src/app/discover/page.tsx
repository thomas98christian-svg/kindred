"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getFirebaseDb, collection, query, where, getDocs, readDoc, doc, setDoc, serverTimestamp } from "@/lib/firebase/firestore";
import { ProfileDoc } from "@/types/database";
import { passesPreFilters, calculateCompatScore } from "@/lib/matching/engine";
import { UserX, Heart, User, MapPin, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";

interface Candidate {
  id: string;
  profile: ProfileDoc;
  score: number;
}

export default function DiscoverPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myProfile, setMyProfile] = useState<ProfileDoc | null>(null);

  useEffect(() => {
    if (!user) return;

    async function loadCandidates() {
      try {
        const db = getFirebaseDb();
        
        // 1. Fetch my profile
        const fetchedProfile = await readDoc<ProfileDoc>("profiles", user!.uid);
        if (!fetchedProfile) {
          router.push("/onboarding");
          return;
        }
        setMyProfile(fetchedProfile);

        // 2. Fetch my answers
        const myAnswersSnap = await getDocs(collection(db, `profiles/${user!.uid}/profileAnswers`));
        const myAnswers: Record<string, any> = {};
        myAnswersSnap.forEach(d => myAnswers[d.id] = d.data().value);

        // 3. Fetch matches/passes to exclude them
        // In Phase 1 we will store a subcollection `interactions` on the user for passes,
        // and check `matches` for mutual connects.
        // For simplicity in Phase 1 matching POC, we'll fetch connections where we are a participant
        const matchesQ = query(collection(db, "matches"), where("participants", "array-contains", user!.uid));
        const matchesSnap = await getDocs(matchesQ);
        const interactedIds = new Set<string>();
        matchesSnap.forEach(d => {
          const m = d.data();
          interactedIds.add(m.profileA === user!.uid ? m.profileB : m.profileA);
        });

        // 4. Fetch profiles in community
        // To be safe with Firestore composite indexes for Phase 1, we fetch by communityId
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
        setLoading(false);
      } catch (err) {
        console.error("Failed to load candidates:", err);
        setLoading(false);
      }
    }

    loadCandidates();
  }, [user, router]);

  const handleAction = async (action: 'pass' | 'connect') => {
    if (!user || currentIndex >= candidates.length) return;
    const candidate = candidates[currentIndex];
    
    if (action === 'connect') {
      const db = getFirebaseDb();
      // For Phase 1 mutual matching demo, we'll write a match document directly
      // In reality, this requires a server-side Cloud Function to check for mutual interest securely.
      // We will create a match in pending status.
      
      const participants = [user.uid, candidate.id].sort() as [string, string];
      
      // Upsert a match document. Note: A real app requires atomic transaction here.
      const matchId = `${participants[0]}_${participants[1]}`;
      
      await setDoc(doc(db, "matches", matchId), {
        profileA: participants[0],
        profileB: participants[1],
        participants,
        compatScore: candidate.score,
        status: "active", // Simulate immediate mutual match for Phase 1 demo
        createdAt: serverTimestamp(),
      }, { merge: true });

      // Create a connection to chat immediately
      const connId = matchId;
      await setDoc(doc(db, "connections", connId), {
        matchId,
        mode: candidate.profile.intentModes.includes("dating") && myProfile?.intentModes.includes("dating") ? "dating" : "friendship", // Simplified intersection
        profileA: participants[0],
        profileB: participants[1],
        participants,
        openedAt: serverTimestamp(),
        softDeadline: serverTimestamp(), // + 48h ideally
        state: "active",
        closedReason: null,
      }, { merge: true });

      alert(`Matched with ${candidate.profile.displayName}! Check your Connections.`);
    }

    setCurrentIndex(prev => prev + 1);
  };

  if (!user || loading) return <div className="p-8 text-center text-surface-500">Discovering...</div>;

  if (currentIndex >= candidates.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">You're on the Waitlist</h2>
          <p className="text-surface-500">No more candidates in your community overlap with your preferences.</p>
          <p className="text-sm">We'll notify you when someone new joins.</p>
        </div>
      </div>
    );
  }

  const current = candidates[currentIndex];

  return (
    <div className="min-h-[100dvh] flex flex-col max-w-md mx-auto p-4 bg-background">
      <div className="flex-1 flex flex-col justify-end">
        <div className="bg-surface-100 dark:bg-surface-800 rounded-3xl overflow-hidden shadow-2xl relative mb-8">
          {/* Profile Photo Mock */}
          <div className="h-96 bg-surface-300 dark:bg-surface-700 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <User size={64} className="text-surface-400 opacity-50" />
            </div>
            {/* Gradient Overlay for text */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            <div className="absolute bottom-0 left-0 p-6 w-full text-white">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold">{current.profile.displayName}, {current.profile.age}</h2>
                  <div className="flex items-center gap-2 text-white/80 mt-1">
                    <MapPin size={16} />
                    <span>{current.profile.city}, {current.profile.state}</span>
                  </div>
                </div>
                <div className="bg-brand-600/90 backdrop-blur-sm px-3 py-1 rounded-full font-bold text-sm">
                  {current.score}% Match
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-2">Intent</h3>
              <div className="flex gap-2 flex-wrap">
                {current.profile.intentModes.map(mode => (
                  <span key={mode} className="px-3 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full text-sm font-medium capitalize">
                    {mode}
                  </span>
                ))}
                <span className="px-3 py-1 bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full text-sm font-medium capitalize">
                  {current.profile.seriousness}
                </span>
              </div>
            </div>

            {current.profile.bio && (
              <div>
                <h3 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-2">About</h3>
                <p className="text-foreground leading-relaxed">{current.profile.bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-6 mb-8">
          <button 
            onClick={() => handleAction('pass')}
            className="w-16 h-16 flex items-center justify-center bg-surface-100 dark:bg-surface-800 border-2 border-surface-200 dark:border-surface-700 rounded-full text-surface-600 hover:scale-105 transition-transform"
          >
            <UserX size={28} />
          </button>
          <button 
            onClick={() => handleAction('connect')}
            className="w-16 h-16 flex items-center justify-center bg-brand-600 text-white rounded-full hover:bg-brand-500 hover:scale-105 transition-transform shadow-lg shadow-brand-500/30"
          >
            <Heart size={28} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}
