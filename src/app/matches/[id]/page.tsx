"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getFirebaseDb, collection, query, orderBy, onSnapshot, readDoc, doc, setDoc, serverTimestamp } from "@/lib/firebase/firestore";
import { ConnectionDoc, ProfileDoc, MessageDoc } from "@/types/database";
import { ArrowLeft, Send, Calendar, AlertTriangle, Shield, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function ChatPage() {
  const { user } = useAuth();
  const { id: connectionId } = useParams() as { id: string };
  const router = useRouter();

  const [connection, setConnection] = useState<ConnectionDoc | null>(null);
  const [otherProfile, setOtherProfile] = useState<(ProfileDoc & { id: string }) | null>(null);
  const [messages, setMessages] = useState<(MessageDoc & { id: string })[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingSafety, setIsSubmittingSafety] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !connectionId) return;
    const db = getFirebaseDb();
    
    let unsubMessages: (() => void) | undefined;

    async function loadChat() {
      try {
        const conn = await readDoc<ConnectionDoc>("connections", connectionId);
        if (!conn) {
          router.push("/matches");
          return;
        }
        setConnection(conn);

        const otherId = conn.profileA === user!.uid ? conn.profileB : conn.profileA;
        const profile = await readDoc<ProfileDoc>("profiles", otherId);
        setOtherProfile(profile);

        // Listen to messages
        const msgsRef = collection(db, `connections/${connectionId}/messages`);
        const q = query(msgsRef, orderBy("createdAt", "asc"));
        
        unsubMessages = onSnapshot(q, (snap) => {
          const msgs = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as MessageDoc)
          }));
          setMessages(msgs);
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        });
        
        setLoading(false);
      } catch (e) {
        console.error(e);
      }
    }

    loadChat();
    return () => {
      if (unsubMessages) unsubMessages();
    };
  }, [user, connectionId, router]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    
    const txt = newMessage.trim();
    setNewMessage(""); // optimistic clear

    try {
      const db = getFirebaseDb();
      const msgRef = doc(collection(db, `connections/${connectionId}/messages`));
      
      await setDoc(msgRef, {
        senderId: user.uid,
        body: txt,
        isBuddySuggested: false,
        createdAt: serverTimestamp(),
      });
      
    } catch (e) {
      console.error(e);
      setNewMessage(txt); // revert
    }
  };

  const handleProposePlan = async () => {
    if (!user) return;
    try {
      const db = getFirebaseDb();
      const planRef = doc(collection(db, "plans"));
      const participants = [user.uid, otherProfile!.id].sort() as [string, string];
      
      await setDoc(planRef, {
        connectionId,
        participants,
        activity: "Coffee at local cafe",
        venueName: "Mock Cafe",
        venuePlaceId: null,
        lat: null, lng: null, hubCity: null,
        proposedTime: serverTimestamp(), // mocking for Phase 1
        status: "proposed",
        createdAt: serverTimestamp()
      });
      
      // Auto-send a message
      const msgRef = doc(collection(db, `connections/${connectionId}/messages`));
      await setDoc(msgRef, {
        senderId: user.uid,
        body: "I proposed a plan: Coffee at Mock Cafe!",
        isBuddySuggested: false,
        createdAt: serverTimestamp(),
      });
      
      setShowPlanModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const submitFeedback = async (wantAgain: boolean) => {
    if (!user) return;
    try {
      const db = getFirebaseDb();
      const ref = doc(collection(db, "feedback"));
      await setDoc(ref, {
        connectionId,
        fromProfile: user.uid,
        wantAgain,
        privateNote: "Phase 1 manual test feedback",
        createdAt: serverTimestamp()
      });
      alert("Private feedback submitted successfully.");
      setShowFeedbackModal(false);
    } catch (e) {
      console.error("Failed to submit feedback", e);
      alert("Failed to save feedback.");
    }
  };

  const submitSafety = async (action: 'block' | 'report') => {
    if (!user || !otherProfile) return;
    setIsSubmittingSafety(true);
    try {
      const db = getFirebaseDb();
      
      if (action === 'block' || action === 'report') {
        const blockId = `${user.uid}_${otherProfile.id}`;
        await setDoc(doc(db, "blocks", blockId), {
          blockerId: user.uid,
          blockedId: otherProfile.id,
          createdAt: serverTimestamp()
        });
      }

      if (action === 'report' && reportReason) {
        const reportRef = doc(collection(db, "reports"));
        await setDoc(reportRef, {
          reporterId: user.uid,
          reportedId: otherProfile.id,
          connectionId,
          reason: reportReason,
          details: "Phase 1 manual test report",
          status: "pending",
          createdAt: serverTimestamp()
        });
      }
      
      alert(action === 'report' ? "User reported and blocked." : "User blocked.");
      setShowSafetyModal(false);
      router.push("/discover");
    } catch (e) {
      console.error(e);
      alert("Failed to perform safety action.");
    } finally {
      setIsSubmittingSafety(false);
    }
  };

  if (loading || !otherProfile) return <div className="p-8 text-center text-surface-500">Loading chat...</div>;

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-surface-100/50 dark:bg-surface-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/matches" className="p-2 -ml-2 rounded-full hover:bg-surface-200 dark:hover:bg-surface-800 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-bold">{otherProfile.displayName}</h1>
            <p className="text-xs text-surface-500 capitalize">{connection?.mode}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowPlanModal(true)}
            className="p-2 rounded-full hover:bg-surface-200 dark:hover:bg-surface-800 text-brand-500 transition-colors"
            title="Propose Plan"
          >
            <Calendar size={20} />
          </button>
          <button 
            onClick={() => setShowFeedbackModal(true)}
            className="p-2 rounded-full hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-500 transition-colors"
            title="Feedback"
          >
            <CheckCircle size={20} />
          </button>
          <button 
            onClick={() => setShowSafetyModal(true)}
            className="p-2 rounded-full hover:bg-surface-200 dark:hover:bg-surface-800 text-red-500 transition-colors"
            title="Safety Options"
          >
            <Shield size={20} />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center text-xs text-surface-400 py-4">
          Connection started
        </div>
        
        {messages.map(msg => {
          const isMine = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                isMine 
                  ? 'bg-brand-600 text-white rounded-tr-sm' 
                  : 'bg-surface-200 dark:bg-surface-800 text-foreground rounded-tl-sm'
              }`}>
                {msg.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-border bg-background flex items-end gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-surface-100 dark:bg-surface-800 border-none rounded-full px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none"
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim()}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-brand-600 text-white disabled:opacity-50 disabled:bg-surface-300 transition-colors"
        >
          <Send size={20} className="ml-1" />
        </button>
      </form>

      {/* Modals using simple conditional rendering for Phase 1 */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-background w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8">
            <h2 className="text-xl font-bold mb-4">Propose a Meetup</h2>
            <p className="text-surface-500 text-sm mb-6">Suggest a coffee date to move things offline.</p>
            
            <div className="space-y-3">
              <button onClick={handleProposePlan} className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium transition-base">
                Send Proposal
              </button>
              <button onClick={() => setShowPlanModal(false)} className="w-full py-3 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl font-medium transition-base">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-background w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8">
            <h2 className="text-xl font-bold mb-4">Private Feedback</h2>
            <p className="text-surface-500 text-sm mb-6">
              This is strictly private and will never be shared with {otherProfile.displayName}. It helps us improve your matches.
            </p>
            
            <h3 className="font-semibold mb-3">Would you want to see them again?</h3>
            <div className="flex gap-3 mb-6">
              <button onClick={() => submitFeedback(true)} className="flex-1 py-3 bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 dark:text-brand-400 rounded-xl font-medium border border-brand-200 dark:border-brand-800 transition-base">
                Yes
              </button>
              <button onClick={() => submitFeedback(false)} className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-xl font-medium border border-red-200 dark:border-red-800 transition-base">
                No
              </button>
            </div>
            
            <button onClick={() => setShowFeedbackModal(false)} className="w-full py-3 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl font-medium transition-base">
              Close
            </button>
          </div>
        </div>
      )}

      {showSafetyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-background w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertTriangle size={24} />
              <h2 className="text-xl font-bold">Safety Options</h2>
            </div>
            <p className="text-surface-500 text-sm mb-6">
              You can block this user so they can never see your profile again, or report them for inappropriate behavior.
            </p>
            
            <div className="space-y-4 mb-6">
              <button 
                onClick={() => submitSafety('block')}
                disabled={isSubmittingSafety} 
                className="w-full py-3 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-medium transition-base"
              >
                Block {otherProfile.displayName}
              </button>
              
              <div className="border-t border-border pt-4">
                <label className="block text-sm font-medium mb-2">Report Reason</label>
                <select 
                  className="w-full p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-border mb-3"
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                >
                  <option value="">Select a reason...</option>
                  <option value="inappropriate_behavior">Inappropriate Behavior</option>
                  <option value="spam">Spam / Scam</option>
                  <option value="harassment">Harassment</option>
                  <option value="other">Other</option>
                </select>
                <button 
                  onClick={() => submitSafety('report')}
                  disabled={isSubmittingSafety || !reportReason} 
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-base disabled:opacity-50"
                >
                  Report & Block
                </button>
              </div>
            </div>
            
            <button onClick={() => setShowSafetyModal(false)} className="w-full py-3 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl font-medium transition-base">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
