"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getFirebaseDb, doc, setDoc, readDoc } from "@/lib/firebase/firestore";
import { PSYCHOLOGY_QUESTIONS, ATTACHMENT_QUIZ } from "@/lib/matching/questions";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Sparkles, Check, Heart, User, MapPin } from "lucide-react";
import { MultiPhotoUpload } from "@/components/ui/MultiPhotoUpload";
import { ProfileDoc } from "@/types/database";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const METRO_AREAS = [
  "Boston",
  "Seattle",
  "San Francisco",
  "New York City",
  "Austin",
  "Los Angeles",
  "Chicago",
  "Miami",
  "Providence"
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0
  })
};

export default function OnboardingPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const router = useRouter();
  
  const [[step, direction], setStepAndDirection] = useState([0, 0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    communityId: "boston-metro-1",
    displayName: "",
    age: "",
    gender: "",
    state: "",
    metro: "",
    city: "",
    bio: "",
    seriousness: "casual" as "casual" | "serious",
    genderPref: [] as string[],
    ageMinPref: "18",
    ageMaxPref: "99",
    photos: [] as string[],
    job: "",
    height: "",
    kids: "open_kids",
    lat: null as number | null,
    lng: null as number | null,
  });

  const [attachmentAnswers, setAttachmentAnswers] = useState<Record<string, number>>({
    attachment_anxious: 3,
    attachment_secure: 3,
    attachment_avoidant: 3
  });

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [cityPredictions, setCityPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);

  // Load existing profile if half-completed (resumable onboarding)
  useEffect(() => {
    if (!user) return;
    async function loadExisting() {
      try {
        const existing = await readDoc<ProfileDoc>("profiles", user!.uid);
        if (existing) {
          // Prefill values
          setFormData({
            communityId: existing.communityId || "boston-metro-1",
            displayName: existing.displayName || "",
            age: existing.age ? String(existing.age) : "",
            gender: existing.gender || "",
            state: existing.state || "",
            metro: existing.metro || "",
            city: existing.city || "",
            bio: existing.bio || "",
            seriousness: existing.seriousness || "casual",
            genderPref: existing.genderPref || [],
            ageMinPref: existing.ageMinPref ? String(existing.ageMinPref) : "18",
            ageMaxPref: existing.ageMaxPref ? String(existing.ageMaxPref) : "99",
            photos: existing.photos || [],
            job: existing.job || "",
            height: existing.height ? String(existing.height) : "",
            kids: existing.kids || "open_kids",
            lat: existing.lat || null,
            lng: existing.lng || null,
          });

          if (existing.psychology) {
            const p = existing.psychology;
            setAnswers({
              conflict_repair: p.conflictRepair,
              core_values: p.coreValues,
              feel_cared_for: p.feelCaredFor,
              show_care: p.showCare,
              closeness_autonomy: p.closenessAutonomy,
              relationship_pace: p.relationshipPace,
              communication_cadence: p.communicationCadence,
              stress_response: p.stressResponse,
              planning_style: p.planningStyle,
              dealbreakers: p.dealbreakers,
            });

            // Reconstruct attachment quiz defaults
            setAttachmentAnswers({
              attachment_anxious: p.attachmentTendency === 'anxious' ? 5 : 3,
              attachment_secure: p.attachmentTendency === 'secure' ? 5 : 3,
              attachment_avoidant: p.attachmentTendency === 'avoidant' ? 5 : 3,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load existing profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadExisting();
  }, [user]);

  const handleCityChange = async (val: string) => {
    setFormData((prev) => ({ ...prev, city: val }));
    if (val.length < 2) {
      setCityPredictions([]);
      setShowPredictions(false);
      return;
    }
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(val)}&types=(cities)`);
      const data = await res.json();
      setCityPredictions(data.predictions || []);
      setShowPredictions(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCity = async (prediction: any) => {
    try {
      setShowPredictions(false);
      const res = await fetch(`/api/places/details?place_id=${prediction.place_id}`);
      const data = await res.json();
      const coords = data.result?.geometry?.location;

      const parts = prediction.description.split(",");
      const city = parts[0]?.trim() || "";
      const state = parts[1]?.trim() || "";
      const matchedState = US_STATES.find(s => state.includes(s)) || "";

      setFormData((prev) => ({
        ...prev,
        city,
        state: matchedState,
        lat: coords ? coords.lat : null,
        lng: coords ? coords.lng : null
      }));
      setCityPredictions([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNext = () => setStepAndDirection([step + 1, 1]);
  const handleBack = () => setStepAndDirection([step - 1, -1]);

  const totalSteps = PSYCHOLOGY_QUESTIONS.length + 6; // community, vitals-a, photos, location, vitals-c, attachment, remaining 9 psych...

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const db = getFirebaseDb();
      
      // Calculate attachment style leaning based on highest Likert rating
      let attachmentStyle: 'secure' | 'anxious' | 'avoidant' = 'secure';
      const secureVal = attachmentAnswers.attachment_secure;
      const anxiousVal = attachmentAnswers.attachment_anxious;
      const avoidantVal = attachmentAnswers.attachment_avoidant;

      if (anxiousVal > secureVal && anxiousVal >= avoidantVal) {
        attachmentStyle = 'anxious';
      } else if (avoidantVal > secureVal && avoidantVal >= anxiousVal) {
        attachmentStyle = 'avoidant';
      }

      const psychData = {
        attachmentTendency: attachmentStyle,
        conflictRepair: answers['conflict_repair'] || 'repair',
        coreValues: answers['core_values'] || [],
        feelCaredFor: answers['feel_cared_for'] || 'words',
        showCare: answers['show_care'] || 'words',
        closenessAutonomy: parseInt(answers['closeness_autonomy'] || '3', 10),
        relationshipPace: answers['relationship_pace'] || 'commitment',
        communicationCadence: answers['communication_cadence'] || 'quality_checkins',
        stressResponse: answers['stress_response'] || 'space',
        planningStyle: answers['planning_style'] || 'balanced',
        dealbreakers: answers['dealbreakers'] || [],
      };

      // Save profile doc
      await setDoc(doc(db, "profiles", user.uid), {
        displayName: formData.displayName,
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        genderPref: formData.genderPref,
        ageMinPref: parseInt(formData.ageMinPref, 10),
        ageMaxPref: parseInt(formData.ageMaxPref, 10),
        intentModes: ['dating'], // Dating only
        seriousness: formData.seriousness,
        communityId: formData.communityId,
        state: formData.state,
        metro: formData.metro,
        city: formData.city,
        bio: formData.bio,
        photoUrl: formData.photos[0] || null, // fallback compatibility
        photos: formData.photos,
        job: formData.job,
        height: formData.height ? parseInt(formData.height, 10) : null,
        kids: formData.kids,
        psychology: psychData,
        status: "active",
        verified: false,
        createdAt: new Date(),
      }, { merge: true });

      success("Dating Profile set up complete! Welcome to Kindred.");
      router.push("/discover");
    } catch (e) {
      console.error(e);
      error("Failed to save profile. Please check all fields.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
          <p className="text-surface-500 text-sm font-medium">Preparing dating questionnaire...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center items-center p-4 bg-background overflow-hidden relative">
      {/* Decorative radial blur blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-xl glass p-8 rounded-3xl shadow-2xl z-10 border border-white/10 flex flex-col">
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-[11px] font-bold text-surface-400 uppercase tracking-widest mb-2">
            <span>Step {step + 1} of {totalSteps}</span>
            <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-surface-850 h-1.5 rounded-full overflow-hidden">
            <motion.div 
              className="bg-gradient-to-r from-brand-500 to-indigo-500 h-full"
              initial={{ width: 0 }}
              animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Carousel Steps Content */}
        <div className="relative flex-1 flex flex-col min-h-[380px] overflow-hidden">
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
              className="w-full flex-1 flex flex-col justify-between"
            >
              {/* Step 0: Welcome / Select Community */}
              {step === 0 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25 mb-2">
                      <Sparkles size={20} className="text-white animate-pulse" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Find Your Connection</h1>
                    <p className="text-surface-400 text-sm">Grounded in relationship science. Welcome to Kindred.</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-400 mb-2">
                      Select your community
                    </label>
                    <select 
                      className="w-full p-3.5 rounded-xl bg-surface-900 border border-white/10 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                      value={formData.communityId}
                      onChange={e => setFormData({...formData, communityId: e.target.value})}
                    >
                      <option value="boston-metro-1">Boston Metro Hub</option>
                      <option value="seattle-tech-1">Seattle Tech & Design</option>
                      <option value="nyc-creatives-1">NYC Creatives</option>
                      <option value="sf-founders-1">SF Founders</option>
                    </select>
                  </div>

                  <button 
                    onClick={handleNext} 
                    className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-brand-600/35 flex items-center justify-center gap-1.5"
                  >
                    Get Started <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {/* Step 1: Core Vitals (About You) */}
              {step === 1 && (
                <div className="space-y-5">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white">Basic Vitals</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-1.5">
                        First Name
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder="Alex"
                        className="w-full p-3 rounded-xl bg-surface-900 border border-white/10 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                        value={formData.displayName}
                        onChange={e => setFormData({...formData, displayName: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-1.5">
                          Age
                        </label>
                        <input 
                          type="number" 
                          required
                          placeholder="25"
                          className="w-full p-3 rounded-xl bg-surface-900 border border-white/10 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                          value={formData.age}
                          onChange={e => setFormData({...formData, age: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-1.5">
                          Gender
                        </label>
                        <select 
                          className="w-full p-3 rounded-xl bg-surface-900 border border-white/10 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                          value={formData.gender}
                          onChange={e => setFormData({...formData, gender: e.target.value})}
                        >
                          <option value="">Select...</option>
                          <option value="man">Man</option>
                          <option value="woman">Woman</option>
                          <option value="nonbinary">Non-binary</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button onClick={handleBack} className="flex-1 py-3 border border-white/10 hover:bg-surface-900 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5">
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button 
                      onClick={handleNext} 
                      disabled={!formData.displayName || !formData.age || !formData.gender} 
                      className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-brand-600/35"
                    >
                      Continue <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Upload Profile Photos */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-extrabold tracking-tight text-white">Your Photos</h2>
                    <p className="text-xs text-surface-400">Add at least 3 photos of yourself so potential matches can get to know you.</p>
                  </div>
                  
                  <div className="py-2">
                    <MultiPhotoUpload
                      photos={formData.photos}
                      onChange={(urls) => setFormData({ ...formData, photos: urls })}
                    />
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button onClick={handleBack} className="flex-1 py-3 border border-white/10 hover:bg-surface-900 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5">
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button 
                      onClick={handleNext} 
                      disabled={formData.photos.length < 3} 
                      className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-brand-600/35"
                    >
                      Continue <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Location */}
              {step === 3 && (
                <div className="space-y-5">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    <MapPin size={22} className="text-brand-400" />
                    Where are you located?
                  </h2>
                  <p className="text-xs text-surface-400">Your distance is always shown as a coarse band, never specific coordinates.</p>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-1.5">
                        City / Search Location
                      </label>
                      <input 
                        type="text" 
                        placeholder="Boston"
                        className="w-full p-3 rounded-xl bg-surface-900 border border-white/10 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                        value={formData.city}
                        onChange={e => handleCityChange(e.target.value)}
                        onFocus={() => { if (cityPredictions.length > 0) setShowPredictions(true); }}
                        onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
                      />
                      {showPredictions && cityPredictions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-surface-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 max-h-48 overflow-y-auto">
                          {cityPredictions.map((pred, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSelectCity(pred)}
                              className="w-full p-2.5 text-left text-xs font-semibold text-surface-300 hover:bg-brand-500/10 hover:text-brand-400 border-b border-white/5 transition-colors"
                            >
                              {pred.description}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-1.5">
                          State
                        </label>
                        <select 
                          className="w-full p-3 rounded-xl bg-surface-900 border border-white/10 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                          value={formData.state}
                          onChange={e => setFormData({...formData, state: e.target.value})}
                        >
                          <option value="">State</option>
                          {US_STATES.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-1.5">
                          Metro Area
                        </label>
                        <select 
                          className="w-full p-3 rounded-xl bg-surface-900 border border-white/10 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                          value={formData.metro}
                          onChange={e => setFormData({...formData, metro: e.target.value})}
                        >
                          <option value="">Select metro area...</option>
                          {METRO_AREAS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button onClick={handleBack} className="flex-1 py-3 border border-white/10 hover:bg-surface-900 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5">
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button 
                      onClick={handleNext} 
                      disabled={!formData.city || !formData.state || !formData.metro} 
                      className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-brand-600/35"
                    >
                      Continue <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Dating Preferences & Vitals */}
              {step === 4 && (
                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white">Dating Preferences</h2>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                          Occupation / Job
                        </label>
                        <input 
                          type="text" 
                          placeholder="Software Engineer"
                          className="w-full p-2.5 rounded-xl bg-surface-900 border border-white/10 text-xs focus:border-brand-500 focus:outline-none transition-colors"
                          value={formData.job}
                          onChange={e => setFormData({...formData, job: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                          Height (inches, optional)
                        </label>
                        <input 
                          type="number" 
                          placeholder="e.g. 68"
                          className="w-full p-2.5 rounded-xl bg-surface-900 border border-white/10 text-xs focus:border-brand-500 focus:outline-none transition-colors"
                          value={formData.height}
                          onChange={e => setFormData({...formData, height: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                          Kids Goal
                        </label>
                        <select 
                          className="w-full p-2.5 rounded-xl bg-surface-900 border border-white/10 text-xs focus:border-brand-500 focus:outline-none"
                          value={formData.kids}
                          onChange={e => setFormData({...formData, kids: e.target.value})}
                        >
                          <option value="wants_kids">Wants kids</option>
                          <option value="has_kids">Has kids</option>
                          <option value="no_kids">Does not want kids</option>
                          <option value="open_kids">Open to kids / Undecided</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                          Seriousness
                        </label>
                        <select 
                          className="w-full p-2.5 rounded-xl bg-surface-900 border border-white/10 text-xs focus:border-brand-500 focus:outline-none"
                          value={formData.seriousness}
                          onChange={e => setFormData({...formData, seriousness: e.target.value as "casual" | "serious"})}
                        >
                          <option value="casual">Casual Dating</option>
                          <option value="serious">Serious / Commitment</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                        Interested in Genders
                      </label>
                      <div className="flex gap-2">
                        {["man", "woman", "nonbinary", "everyone"].map(opt => {
                          const isSelected = formData.genderPref.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                const next = isSelected
                                  ? formData.genderPref.filter(m => m !== opt)
                                  : [...formData.genderPref, opt];
                                setFormData({...formData, genderPref: next});
                              }}
                              className={`py-1.5 px-3 rounded-lg border text-xs font-semibold capitalize ${
                                isSelected
                                  ? "bg-brand-500/10 border-brand-500/30 text-brand-400"
                                  : "border-white/10 hover:bg-surface-900 text-surface-400"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                          Min Age Preference
                        </label>
                        <input 
                          type="number" 
                          className="w-full p-2.5 rounded-xl bg-surface-900 border border-white/10 text-xs focus:border-brand-500 focus:outline-none"
                          value={formData.ageMinPref}
                          onChange={e => setFormData({...formData, ageMinPref: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                          Max Age Preference
                        </label>
                        <input 
                          type="number" 
                          className="w-full p-2.5 rounded-xl bg-surface-900 border border-white/10 text-xs focus:border-brand-500 focus:outline-none"
                          value={formData.ageMaxPref}
                          onChange={e => setFormData({...formData, ageMaxPref: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                        Dating Bio
                      </label>
                      <textarea
                        rows={2}
                        maxLength={500}
                        placeholder="Tell matches what you are looking for..."
                        className="w-full p-2.5 rounded-xl bg-surface-900 border border-white/10 text-xs focus:border-brand-500 focus:outline-none resize-none"
                        value={formData.bio}
                        onChange={e => setFormData({...formData, bio: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button onClick={handleBack} className="flex-1 py-3 border border-white/10 hover:bg-surface-900 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5">
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button 
                      onClick={handleNext} 
                      disabled={!formData.job || formData.genderPref.length === 0 || !formData.bio} 
                      className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-brand-600/35"
                    >
                      Continue <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Attachment Style Quiz */}
              {step === 5 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-extrabold text-white flex items-center gap-1.5">
                      <Heart size={22} className="text-red-400 animate-pulse" />
                      Attachment Tendency
                    </h2>
                    <p className="text-[11px] text-surface-400 leading-relaxed">
                      Relationship science shows attachment styles are highly predictive. Rate how much you agree with each statement:
                    </p>
                  </div>

                  <div className="space-y-4 pt-1">
                    {ATTACHMENT_QUIZ.map((q) => {
                      const currentVal = attachmentAnswers[q.id] || 3;
                      return (
                        <div key={q.id} className="space-y-1.5 p-3 rounded-2xl bg-surface-900/40 border border-white/5">
                          <p className="text-xs font-semibold text-surface-200 leading-normal">"{q.statement}"</p>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] font-bold text-surface-500 uppercase">Disagree</span>
                            <div className="flex gap-1.5">
                              {[1, 2, 3, 4, 5].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setAttachmentAnswers(prev => ({ ...prev, [q.id]: num }))}
                                  className={`w-7 h-7 rounded-full text-xs font-bold transition-all border flex items-center justify-center ${
                                    currentVal === num
                                      ? "bg-brand-600 border-brand-500 text-white scale-105"
                                      : "bg-surface-950 border-white/5 text-surface-400 hover:border-white/20 hover:text-white"
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                            <span className="text-[9px] font-bold text-surface-500 uppercase">Agree</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button onClick={handleBack} className="flex-1 py-3 border border-white/10 hover:bg-surface-900 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5">
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button 
                      onClick={handleNext}
                      className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-brand-600/35"
                    >
                      Continue <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Steps 6+ : Remaining 9 Psychology Questions */}
              {step > 5 && step < totalSteps && (() => {
                const qIndex = step - 6;
                const question = PSYCHOLOGY_QUESTIONS[qIndex];
                const isLast = step === totalSteps - 1;

                return (
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-extrabold tracking-tight text-white">{question.label}</h2>
                      <p className="text-xs text-surface-400">{question.description}</p>
                    </div>
                    
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 pt-1">
                      {question.type === 'scale' ? (
                        <div className="space-y-6 py-6 px-4 rounded-2xl bg-surface-900/40 border border-white/5">
                          <input
                            type="range"
                            min="1"
                            max="5"
                            step="1"
                            className="w-full accent-brand-500 h-2 bg-surface-950 rounded-lg cursor-pointer"
                            value={answers[question.id] || "3"}
                            onChange={e => setAnswers({ ...answers, [question.id]: parseInt(e.target.value, 10) })}
                          />
                          <div className="flex justify-between text-[10px] font-bold text-surface-400 uppercase tracking-wide">
                            <span>{question.labels[1]}</span>
                            <span>{question.labels[3]}</span>
                            <span>{question.labels[5]}</span>
                          </div>
                        </div>
                      ) : (
                        question.options.map((opt: any, i) => {
                          const isSelected = question.type === 'multi' 
                            ? (Array.isArray(answers[question.id]) && answers[question.id].includes(opt))
                            : (answers[question.id] === opt);
                          
                          const label = (question as any).labels[opt] || opt;
                          
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                if (question.type === 'multi') {
                                  const current = Array.isArray(answers[question.id]) ? answers[question.id] : [];
                                  if (current.includes(opt)) {
                                    setAnswers({ ...answers, [question.id]: current.filter((x: any) => x !== opt) });
                                  } else {
                                    setAnswers({ ...answers, [question.id]: [...current, opt] });
                                  }
                                } else {
                                  setAnswers({ ...answers, [question.id]: opt });
                                }
                              }}
                              className={`w-full p-3.5 rounded-xl border text-left transition-all duration-200 flex items-center justify-between group ${
                                isSelected
                                  ? "border-brand-500 bg-brand-500/10 text-brand-400 font-bold glow-brand" 
                                  : "border-white/10 bg-surface-950/20 hover:border-brand-500/40 hover:bg-brand-500/5 text-surface-300"
                              }`}
                            >
                              <span className="text-xs font-semibold">
                                {label}
                              </span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? "border-brand-500 bg-brand-500 text-white" : "border-white/20 group-hover:border-brand-500/50"
                              }`}>
                                {isSelected && <Check size={10} strokeWidth={3} />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button onClick={handleBack} className="flex-1 py-3 border border-white/10 hover:bg-surface-900 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5">
                        <ChevronLeft size={16} /> Back
                      </button>
                      <button 
                        onClick={isLast ? handleSubmit : handleNext} 
                        disabled={
                          (question.type !== 'scale' && answers[question.id] === undefined) || 
                          isSubmitting || 
                          (question.type === 'multi' && answers[question.id]?.length === 0)
                        } 
                        className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-brand-600/35"
                      >
                        {isSubmitting ? (
                          <>Finalizing profile...</>
                        ) : isLast ? (
                          <>Complete Onboarding <Check size={16} /></>
                        ) : (
                          <>Next Step <ChevronRight size={16} /></>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
