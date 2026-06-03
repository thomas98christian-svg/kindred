"use client";

import { useEffect, useState, useRef, use } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { 
  getFirebaseDb, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  readDoc, 
  doc, 
  setDoc, 
  serverTimestamp 
} from "@/lib/firebase/firestore";
import { ConnectionDoc, ProfileDoc, MessageDoc } from "@/types/database";
import { 
  ArrowLeft, 
  Send, 
  Calendar, 
  AlertTriangle, 
  Shield, 
  CheckCircle, 
  ChevronDown,
  Clock,
  Sparkles,
  User,
  X
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatPage() {
  const { user } = useAuth();
  const params = useParams() as { id: string };
  const connectionId = params.id;
  const router = useRouter();
  const { success, error, info } = useToast();

  const [connection, setConnection] = useState<ConnectionDoc | null>(null);
  const [otherProfile, setOtherProfile] = useState<(ProfileDoc & { id: string }) | null>(null);
  const [myProfile, setMyProfile] = useState<ProfileDoc | null>(null);
  const [messages, setMessages] = useState<(MessageDoc & { id: string })[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmittingSafety, setIsSubmittingSafety] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Propose Plan States
  const [midpointVenues, setMidpointVenues] = useState<any[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  const [customSearch, setCustomSearch] = useState("");
  const [venuePredictions, setVenuePredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [proposedTime, setProposedTime] = useState("");
  const [activityText, setActivityText] = useState("Coffee date");

  // AI Buddy States
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showAiBuddy, setShowAiBuddy] = useState(false);

  const fetchSuggestions = async () => {
    if (!connectionId) return;
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/buddy/suggest?connectionId=${connectionId}`);
      const data = await res.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error("Failed to fetch AI suggestions:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const toggleAiBuddy = () => {
    setShowAiBuddy(prev => {
      const next = !prev;
      if (next && suggestions.length === 0) {
        fetchSuggestions();
      }
      return next;
    });
  };

  const openPlanModal = async () => {
    planDialogRef.current?.showModal();
    if (midpointVenues.length > 0) return;
    setLoadingVenues(true);
    try {
      const lat1 = myProfile?.lat || 47.6062;
      const lng1 = myProfile?.lng || -122.3321;
      const lat2 = otherProfile?.lat || 47.6101;
      const lng2 = otherProfile?.lng || -122.3421;
      const res = await fetch(`/api/places/midpoint?lat1=${lat1}&lng1=${lng1}&lat2=${lat2}&lng2=${lng2}`);
      const data = await res.json();
      setMidpointVenues(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVenues(false);
    }
  };

  const handleVenueSearchChange = async (val: string) => {
    setCustomSearch(val);
    if (val.length < 2) {
      setVenuePredictions([]);
      setShowPredictions(false);
      return;
    }
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(val)}`);
      const data = await res.json();
      setVenuePredictions(data.predictions || []);
      setShowPredictions(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCustomVenue = async (prediction: any) => {
    try {
      setShowPredictions(false);
      const res = await fetch(`/api/places/details?place_id=${prediction.place_id}`);
      const data = await res.json();
      const coords = data.result?.geometry?.location;
      setSelectedVenue({
        name: prediction.description.split(",")[0],
        address: prediction.description,
        placeId: prediction.place_id,
        lat: coords ? coords.lat : null,
        lng: coords ? coords.lng : null,
        rating: 4.5,
      });
      setCustomSearch("");
      setVenuePredictions([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Dialog Refs
  const planDialogRef = useRef<HTMLDialogElement>(null);
  const feedbackDialogRef = useRef<HTMLDialogElement>(null);
  const safetyDialogRef = useRef<HTMLDialogElement>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !connectionId) return;
    const db = getFirebaseDb();
    
    let unsubMessages: (() => void) | undefined;

    async function loadChat() {
      try {
        const conn = await readDoc<ConnectionDoc>("connections", connectionId);
        if (!conn) {
          info("Connection not found.");
          router.push("/matches");
          return;
        }
        setConnection(conn);

        const otherId = conn.profileA === user!.uid ? conn.profileB : conn.profileA;
        const profile = await readDoc<ProfileDoc>("profiles", otherId);
        if (profile) {
          setOtherProfile({ ...profile, id: otherId });
        }
        const myProfileData = await readDoc<ProfileDoc>("profiles", user!.uid);
        if (myProfileData) {
          setMyProfile(myProfileData);
        }

        // Listen to messages
        const msgsRef = collection(db, `connections/${connectionId}/messages`);
        const q = query(msgsRef, orderBy("createdAt", "asc"));
        
        unsubMessages = onSnapshot(q, (snap) => {
          const msgs = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as MessageDoc)
          }));
          setMessages(msgs);
          
          // Auto scroll to bottom
          setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        });
        
        setLoading(false);
      } catch (err) {
        console.error(err);
        error("Failed to load chat details.");
      }
    }

    loadChat();
    return () => {
      if (unsubMessages) unsubMessages();
    };
  }, [user, connectionId, router, error, info]);

  useEffect(() => {
    if (connectionId) {
      fetchSuggestions();
    }
  }, [connectionId]);

  // Monitor scroll to show jump-to-bottom button
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Show button if user is scrolled up by more than 200px
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 200;
    setShowScrollBottom(isScrolledUp);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    
    const txt = newMessage.trim();
    setNewMessage(""); // optimistic clear

    const isSuggested = suggestions.includes(txt);

    try {
      const db = getFirebaseDb();
      const msgRef = doc(collection(db, `connections/${connectionId}/messages`));
      
      await setDoc(msgRef, {
        senderId: user.uid,
        body: txt,
        isBuddySuggested: isSuggested,
        createdAt: serverTimestamp(),
      });
      
      scrollToBottom();
      
      // Post-send auto-refresh suggestions to adapt to the new message context
      fetchSuggestions();
    } catch (err) {
      console.error(err);
      error("Failed to send message.");
      setNewMessage(txt); // revert
    }
  };

  const handleProposePlan = async () => {
    if (!user || !otherProfile || !selectedVenue || !proposedTime) {
      error("Please select a venue and meeting time.");
      return;
    }
    try {
      const db = getFirebaseDb();
      const planRef = doc(collection(db, "plans"));
      const participants = [user.uid, otherProfile.id].sort() as [string, string];
      
      const timeDate = new Date(proposedTime);

      await setDoc(planRef, {
        connectionId,
        participants,
        activity: activityText,
        venueName: selectedVenue.name,
        venuePlaceId: selectedVenue.placeId,
        lat: selectedVenue.lat || null,
        lng: selectedVenue.lng || null,
        hubCity: otherProfile.city || null,
        proposedTime: timeDate,
        status: "proposed",
        createdAt: serverTimestamp()
      });
      
      // Auto-send a system message
      const msgRef = doc(collection(db, `connections/${connectionId}/messages`));
      await setDoc(msgRef, {
        senderId: user.uid,
        body: `📍 I proposed a plan: ${activityText} at ${selectedVenue.name} on ${timeDate.toLocaleDateString()} at ${timeDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}!`,
        isBuddySuggested: false,
        createdAt: serverTimestamp(),
      });
      
      success("Meetup plan proposed!");
      planDialogRef.current?.close();
      setSelectedVenue(null);
      setProposedTime("");
    } catch (err) {
      console.error(err);
      error("Failed to propose plan.");
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
        privateNote: "Feedback submitted from chat detail view.",
        createdAt: serverTimestamp()
      });
      success("Feedback submitted privately. Thank you!");
      feedbackDialogRef.current?.close();
    } catch (err) {
      console.error("Failed to submit feedback", err);
      error("Could not submit feedback.");
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
          details: `In-chat report: ${reportReason}`,
          status: "pending",
          createdAt: serverTimestamp()
        });
      }
      
      success(action === 'report' ? "Reported and blocked user successfully." : "User blocked.");
      safetyDialogRef.current?.close();
      router.push("/discover");
    } catch (err) {
      console.error(err);
      error("Failed to complete action.");
    } finally {
      setIsSubmittingSafety(false);
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading || !otherProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
          <p className="text-surface-500 text-sm font-medium">Opening secure chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-background relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/5 bg-surface-950/60 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <Link href="/matches" className="p-2 -ml-2 rounded-full hover:bg-surface-800 transition-colors">
            <ArrowLeft size={18} className="text-surface-300" />
          </Link>
          <div className="w-9 h-9 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
            {otherProfile.photoUrl ? (
              <img src={otherProfile.photoUrl} alt={otherProfile.displayName} className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-white/40" />
            )}
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white">{otherProfile.displayName}</h1>
            <p className="text-[10px] font-semibold text-surface-400 capitalize">{connection?.mode}</p>
          </div>
        </div>
        
        <div className="flex gap-1.5">
          <button 
            onClick={toggleAiBuddy}
            className={`p-2 rounded-full border transition-all duration-300 ${
              showAiBuddy 
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse' 
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/10'
            }`}
            title="AI Buddy Suggestions"
          >
            <Sparkles size={16} />
          </button>
          <button 
            onClick={openPlanModal}
            className="p-2 rounded-full bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 transition-colors border border-brand-500/10"
            title="Propose Plan"
          >
            <Calendar size={16} />
          </button>
          <button 
            onClick={() => feedbackDialogRef.current?.showModal()}
            className="p-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors border border-emerald-500/10"
            title="Feedback"
          >
            <CheckCircle size={16} />
          </button>
          <button 
            onClick={() => safetyDialogRef.current?.showModal()}
            className="p-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/10"
            title="Safety Options"
          >
            <Shield size={16} />
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative scroll-smooth bg-gradient-to-b from-background to-surface-950/10"
      >
        <div className="text-center text-[10px] font-bold text-surface-500 uppercase tracking-widest py-4">
          🔐 Encrypted connection started
        </div>
        
        {messages.map(msg => {
          const isMine = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%] flex flex-col space-y-0.5">
                <div className={`rounded-2xl px-4 py-2.5 text-sm font-medium leading-relaxed ${
                  isMine 
                    ? 'bg-brand-600 text-white rounded-tr-sm shadow-md' 
                    : 'bg-surface-800 text-foreground rounded-tl-sm border border-white/5'
                }`}>
                  {msg.body}
                </div>
                {/* Message Timestamp */}
                <span className={`text-[9px] font-semibold text-surface-500 px-1 ${isMine ? 'text-right' : 'text-left'}`}>
                  {formatMessageTime(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Floating Scroll to Bottom button */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-20 right-4 p-2.5 rounded-full bg-brand-600 text-white shadow-xl flex items-center justify-center hover:bg-brand-500 border border-brand-400/20 active:scale-95 transition-all z-30"
          >
            <ChevronDown size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* AI Buddy Panel */}
      <AnimatePresence>
        {showAiBuddy && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="px-3 py-2 border-t border-white/5 bg-surface-950/40 backdrop-blur-xl z-10 space-y-2"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-amber-400">
                <Sparkles size={14} className="animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">AI Conversation Buddy</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchSuggestions}
                  disabled={loadingSuggestions}
                  className="text-[9px] font-bold text-surface-400 hover:text-white transition-colors"
                >
                  {loadingSuggestions ? "Generating..." : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAiBuddy(false)}
                  className="text-surface-500 hover:text-surface-300"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-4 gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-3 text-[11px] text-surface-500 italic">
                No suggestions. Try refreshing.
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setNewMessage(suggestion);
                    }}
                    className="flex-shrink-0 w-[85%] snap-center p-3 text-left bg-gradient-to-br from-amber-500/5 to-orange-500/5 hover:from-amber-500/10 hover:to-orange-500/10 border border-amber-500/10 hover:border-amber-500/30 rounded-xl text-xs text-surface-200 transition-all font-medium active:scale-[0.98] shadow-sm select-none"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input Box */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/5 bg-background flex items-end gap-2 z-20">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-surface-900 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-brand-500 focus:outline-none transition-colors"
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim()}
          className="w-11 h-11 flex items-center justify-center rounded-2xl bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-30 disabled:bg-surface-800 active:scale-95 transition-all shadow-lg shadow-brand-500/20"
        >
          <Send size={16} className="ml-0.5" />
        </button>
      </form>

      {/* --- Plan Dialog (Native) --- */}
      <dialog 
        ref={planDialogRef}
        className="w-full max-w-sm rounded-3xl p-6 bg-surface-900 border border-white/10 text-foreground backdrop:bg-black/70 backdrop:backdrop-blur-sm focus:outline-none animate-in fade-in zoom-in duration-200 shadow-2xl"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Propose a Plan</h2>
            <button onClick={() => { planDialogRef.current?.close(); setSelectedVenue(null); setProposedTime(""); }} className="text-surface-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          
          <div className="space-y-3 pt-1">
            {/* Activity Input */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                Activity
              </label>
              <input 
                type="text"
                value={activityText}
                onChange={e => setActivityText(e.target.value)}
                className="w-full p-2.5 bg-surface-950 border border-white/5 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white transition-colors"
                placeholder="e.g. Coffee Date, Drinks, Park Walk"
              />
            </div>

            {/* Selected Venue Display */}
            {selectedVenue ? (
              <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-brand-400">{selectedVenue.name}</p>
                  <p className="text-[10px] text-surface-400 truncate pr-2">{selectedVenue.address}</p>
                </div>
                <button 
                  onClick={() => setSelectedVenue(null)} 
                  className="p-1 hover:bg-surface-800 rounded-full text-surface-400 hover:text-white shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400">
                  Select Venue
                </label>
                
                {/* Search Bar */}
                <div className="relative">
                  <input 
                    type="text"
                    value={customSearch}
                    onChange={e => handleVenueSearchChange(e.target.value)}
                    placeholder="Search custom cafe/restaurant..."
                    className="w-full p-2.5 bg-surface-950 border border-white/5 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white transition-colors"
                  />
                  {showPredictions && venuePredictions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-surface-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 max-h-36 overflow-y-auto">
                      {venuePredictions.map((pred, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectCustomVenue(pred)}
                          className="w-full p-2.5 text-left text-[11px] text-surface-300 hover:bg-brand-500/10 hover:text-brand-400 border-b border-white/5 transition-colors"
                        >
                          {pred.description}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommended Midpoint Venues */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500">
                    Recommended Midpoint Cafe Spots
                  </p>
                  {loadingVenues ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
                    </div>
                  ) : midpointVenues.length === 0 ? (
                    <p className="text-[10px] text-surface-500 italic">No recommendations found. Try searching above.</p>
                  ) : (
                    <div className="grid gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {midpointVenues.map((venue, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedVenue(venue)}
                          className="w-full p-2 bg-surface-950 hover:bg-brand-500/5 hover:border-brand-500/30 border border-white/5 rounded-lg text-left transition-colors flex justify-between items-center group"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-[11px] font-bold text-surface-200 group-hover:text-brand-400 truncate">{venue.name}</p>
                            <p className="text-[9px] text-surface-500 truncate">{venue.address}</p>
                          </div>
                          <span className="text-[10px] text-amber-400 font-bold shrink-0 bg-amber-400/10 border border-amber-400/20 px-1 rounded">
                            ★ {venue.rating}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Time input */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                Meeting Date & Time
              </label>
              <input 
                type="datetime-local"
                value={proposedTime}
                onChange={e => setProposedTime(e.target.value)}
                className="w-full p-2.5 bg-surface-950 border border-white/5 rounded-xl text-xs focus:border-brand-500 focus:outline-none text-white"
              />
            </div>

            <div className="flex gap-2 pt-3">
              <button 
                onClick={handleProposePlan}
                disabled={!selectedVenue || !proposedTime}
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-30 disabled:hover:bg-brand-600 text-white rounded-xl font-semibold text-xs transition-colors shadow-lg shadow-brand-500/20"
              >
                Send Proposal
              </button>
              <button 
                onClick={() => { planDialogRef.current?.close(); setSelectedVenue(null); setProposedTime(""); }} 
                className="py-3 px-4 bg-surface-850 hover:bg-surface-800 rounded-xl font-semibold text-xs transition-colors border border-white/5 text-surface-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </dialog>

      {/* --- Feedback Dialog (Native) --- */}
      <dialog 
        ref={feedbackDialogRef}
        className="w-full max-w-sm rounded-3xl p-6 bg-surface-900 border border-white/10 text-foreground backdrop:bg-black/70 backdrop:backdrop-blur-sm focus:outline-none animate-in fade-in zoom-in duration-200"
      >
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-white">Private Feedback</h2>
          <p className="text-surface-400 text-xs leading-relaxed">
            This review is encrypted and strictly private. It will never be visible to {otherProfile.displayName}.
          </p>
          
          <h3 className="font-bold text-sm text-white pt-2">Would you want to see them again?</h3>
          <div className="flex gap-3">
            <button 
              onClick={() => submitFeedback(true)} 
              className="flex-1 py-3 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-xl font-bold border border-brand-500/20 transition-colors text-xs"
            >
              Yes
            </button>
            <button 
              onClick={() => submitFeedback(false)} 
              className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold border border-red-500/20 transition-colors text-xs"
            >
              No
            </button>
          </div>
          
          <button 
            onClick={() => feedbackDialogRef.current?.close()} 
            className="w-full py-2.5 bg-surface-850 hover:bg-surface-800 rounded-xl font-semibold text-xs transition-colors border border-white/5 text-surface-400"
          >
            Close
          </button>
        </div>
      </dialog>

      {/* --- Safety Dialog (Native) --- */}
      <dialog 
        ref={safetyDialogRef}
        className="w-full max-w-sm rounded-3xl p-6 bg-surface-900 border border-white/10 text-foreground backdrop:bg-black/70 backdrop:backdrop-blur-sm focus:outline-none animate-in fade-in zoom-in duration-200"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle size={20} />
            <h2 className="text-lg font-extrabold tracking-tight">Safety & Block Options</h2>
          </div>
          <p className="text-surface-400 text-xs leading-relaxed">
            You can block this member to stop further interactions. If they violated code of conduct, please choose a report reason.
          </p>
          
          <div className="space-y-3 pt-2">
            <button 
              onClick={() => submitSafety('block')}
              disabled={isSubmittingSafety} 
              className="w-full py-2.5 border border-red-500/30 hover:bg-red-500/10 text-red-400 rounded-xl font-bold transition-colors text-xs disabled:opacity-50"
            >
              Block {otherProfile.displayName}
            </button>
            
            <div className="border-t border-white/5 pt-3 space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-400">
                Reason for Reporting
              </label>
              <select 
                className="w-full p-2.5 rounded-lg bg-surface-950 border border-white/10 text-xs text-foreground focus:outline-none"
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
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-surface-800 disabled:opacity-50 text-white rounded-xl font-bold transition-colors text-xs"
              >
                Report & Block User
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => safetyDialogRef.current?.close()} 
            className="w-full py-2 bg-surface-850 hover:bg-surface-800 rounded-xl font-semibold text-xs transition-colors border border-white/5 text-surface-400"
          >
            Cancel
          </button>
        </div>
      </dialog>
    </div>
  );
}
