"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getFirebaseDb, doc, setDoc } from "@/lib/firebase/firestore";
import { QUESTIONS } from "@/lib/matching/questions";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Sparkles, Check, Heart, Users } from "lucide-react";
import { PhotoUpload } from "@/components/ui/PhotoUpload";

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
  
  // Form State
  const [formData, setFormData] = useState({
    communityId: "seattle-tech-1", // default mock
    displayName: "",
    age: "",
    gender: "",
    state: "",
    metro: "",
    city: "",
    bio: "",
    intentModes: [] as string[],
    seriousness: "casual",
    genderPref: [] as string[],
    ageMinPref: "18",
    ageMaxPref: "99",
    photoUrl: "",
    lat: null as number | null,
    lng: null as number | null,
  });

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [cityPredictions, setCityPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);

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

  const totalSteps = QUESTIONS.length + 4; // community, about, photo, intent, questions...

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const db = getFirebaseDb();
      
      // Update profile
      await setDoc(doc(db, "profiles", user.uid), {
        displayName: formData.displayName,
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        genderPref: formData.genderPref,
        ageMinPref: parseInt(formData.ageMinPref, 10),
        ageMaxPref: parseInt(formData.ageMaxPref, 10),
        intentModes: formData.intentModes,
        seriousness: formData.seriousness,
        communityId: formData.communityId,
        state: formData.state,
        metro: formData.metro,
        city: formData.city,
        bio: formData.bio,
        photoUrl: formData.photoUrl || null,
        lat: formData.lat || null,
        lng: formData.lng || null,
        status: "active", // Activate the profile
      }, { merge: true });

      // Save answers
      for (const question of QUESTIONS) {
        if (answers[question.id] !== undefined) {
          await setDoc(doc(db, `profiles/${user.uid}/profileAnswers`, question.id), {
            questionId: question.id,
            value: answers[question.id],
          });
        }
      }

      success("Profile set up complete! Welcome to Kindred.");
      router.push("/discover");
    } catch (e) {
      console.error(e);
      error("Failed to save profile. Please check all fields.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
          <p className="text-surface-500 text-sm font-medium">Checking authentication...</p>
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
              {/* Step 0: Select Community */}
              {step === 0 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25 mb-2">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Welcome to Kindred</h1>
                    <p className="text-surface-400 text-sm">Let's find the circle where your people hang out.</p>
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
                      <option value="seattle-tech-1">Seattle Tech & Design</option>
                      <option value="nyc-creatives-1">NYC Creatives</option>
                      <option value="sf-founders-1">SF Founders</option>
                      <option value="boston-metro-1">Boston Metro Hub</option>
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

              {/* Step 1: About You (With State/Metro dropdown + Bio) */}
              {step === 1 && (
                <div className="space-y-5">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white">About You</h2>
                  
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

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 relative">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-1.5">
                          City
                        </label>
                        <input 
                          type="text" 
                          placeholder="Seattle"
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
                      <div className="col-span-3">
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

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-1.5">
                        Bio Description
                      </label>
                      <textarea 
                        rows={3}
                        maxLength={500}
                        placeholder="Tell others what you love to do..."
                        className="w-full p-3 rounded-xl bg-surface-900 border border-white/10 text-sm focus:border-brand-500 focus:outline-none transition-colors resize-none"
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
                      disabled={!formData.displayName || !formData.age || !formData.gender || !formData.state || !formData.metro || !formData.city} 
                      className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-brand-600/35"
                    >
                      Continue <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Upload Profile Photo */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-extrabold tracking-tight text-white">Upload Profile Photo</h2>
                    <p className="text-xs text-surface-400">Add a clear photo of yourself so potential connections can get to know you.</p>
                  </div>
                  
                  <div className="py-4">
                    <PhotoUpload
                      currentPhotoUrl={formData.photoUrl || null}
                      onUploadComplete={(url) => setFormData({ ...formData, photoUrl: url })}
                      onRemove={() => setFormData({ ...formData, photoUrl: "" })}
                    />
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button onClick={handleBack} className="flex-1 py-3 border border-white/10 hover:bg-surface-900 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5">
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button 
                      onClick={handleNext} 
                      disabled={!formData.photoUrl} 
                      className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-brand-600/35"
                    >
                      Continue <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Intent Modes */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-extrabold tracking-tight text-white">Your Intent</h2>
                    <p className="text-xs text-surface-400">Describe what connections are you seeking today.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-2">
                        Mode (select at least one)
                      </label>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            const isIncluded = formData.intentModes.includes("friendship");
                            const next = isIncluded
                              ? formData.intentModes.filter(m => m !== "friendship")
                              : [...formData.intentModes, "friendship"];
                            setFormData({...formData, intentModes: next});
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-semibold transition-colors ${
                             formData.intentModes.includes("friendship")
                              ? "bg-brand-500/10 border-brand-500/30 text-brand-400"
                              : "border-white/10 hover:bg-surface-900 text-surface-400"
                          }`}
                        >
                          <Users size={16} />
                          Friendship
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const isIncluded = formData.intentModes.includes("dating");
                            const next = isIncluded
                              ? formData.intentModes.filter(m => m !== "dating")
                              : [...formData.intentModes, "dating"];
                            setFormData({...formData, intentModes: next});
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-semibold transition-colors ${
                            formData.intentModes.includes("dating")
                              ? "bg-brand-500/10 border-brand-500/30 text-brand-400"
                              : "border-white/10 hover:bg-surface-900 text-surface-400"
                          }`}
                        >
                          <Heart size={16} />
                          Dating
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-1.5">
                        Seriousness
                      </label>
                      <select 
                        className="w-full p-3 rounded-xl bg-surface-900 border border-white/10 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                        value={formData.seriousness}
                        onChange={e => setFormData({...formData, seriousness: e.target.value})}
                      >
                        <option value="casual">Casual (Just seeing who's out there)</option>
                        <option value="serious">Serious (Looking to build lasting connections)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-400 mb-2">
                        Interested in Genders
                      </label>
                      <div className="flex flex-wrap gap-2">
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
                              className={`py-2 px-3.5 rounded-lg border text-xs font-semibold transition-colors capitalize ${
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
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button onClick={handleBack} className="flex-1 py-3 border border-white/10 hover:bg-surface-900 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5">
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button 
                      onClick={handleNext} 
                      disabled={formData.intentModes.length === 0 || formData.genderPref.length === 0} 
                      className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-brand-600/35"
                    >
                      Continue <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Steps 4+ : 8 matching questions */}
              {step > 3 && step <= QUESTIONS.length + 3 && (() => {
                const qIndex = step - 4;
                const question = QUESTIONS[qIndex];
                const isLast = step === QUESTIONS.length + 3;

                return (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-extrabold tracking-tight text-white">{question.label}</h2>
                      <p className="text-xs text-surface-400">{question.description}</p>
                    </div>
                    
                    <div className="space-y-2.5">
                      {question.options.map((opt, i) => {
                        const isSelected = question.type === 'multi' 
                          ? (Array.isArray(answers[question.id]) && answers[question.id].includes(opt))
                          : (answers[question.id] === opt);
                        
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
                            className={`w-full p-4 rounded-xl border text-left transition-all duration-255 flex items-center justify-between group ${
                              isSelected
                                ? "border-brand-500 bg-brand-500/10 text-brand-400 font-bold glow-brand" 
                                : "border-white/10 bg-surface-950/20 hover:border-brand-500/40 hover:bg-brand-500/5 text-surface-300"
                            }`}
                          >
                            <span className="text-xs font-semibold uppercase tracking-wide">
                              {typeof opt === 'string' ? opt.replace('-', ' ') : opt}
                            </span>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? "border-brand-500 bg-brand-500 text-white" : "border-white/20 group-hover:border-brand-500/50"
                            }`}>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button onClick={handleBack} className="flex-1 py-3 border border-white/10 hover:bg-surface-900 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5">
                        <ChevronLeft size={16} /> Back
                      </button>
                      <button 
                        onClick={isLast ? handleSubmit : handleNext} 
                        disabled={answers[question.id] === undefined || isSubmitting || (question.type === 'multi' && answers[question.id]?.length === 0)} 
                        className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-brand-600/35"
                      >
                        {isSubmitting ? (
                          <>Saving Profile...</>
                        ) : isLast ? (
                          <>Complete Onboarding <Check size={16} /></>
                        ) : (
                          <>Next Question <ChevronRight size={16} /></>
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
