"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { getFirebaseDb, doc, setDoc } from "@/lib/firebase/firestore";
import { QUESTIONS } from "@/lib/matching/questions";

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState(0);
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
    intentModes: [] as string[],
    seriousness: "casual",
    genderPref: [] as string[],
    ageMinPref: "18",
    ageMaxPref: "99",
  });

  const [answers, setAnswers] = useState<Record<string, any>>({});

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

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

      router.push("/discover");
    } catch (e) {
      console.error(e);
      alert("Error saving profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return <div className="p-8 text-center text-surface-500">Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl glass p-8 rounded-2xl shadow-xl">
        {step === 0 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Welcome to Kindred</h1>
            <p className="text-surface-500">Let's find your people.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select your community</label>
                <select 
                  className="w-full p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-border"
                  value={formData.communityId}
                  onChange={e => setFormData({...formData, communityId: e.target.value})}
                >
                  <option value="seattle-tech-1">Seattle Tech & Design</option>
                  <option value="nyc-creatives-1">NYC Creatives</option>
                  <option value="sf-founders-1">SF Founders</option>
                </select>
              </div>
            </div>

            <button onClick={handleNext} className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-base">
              Continue
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">About You</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input 
                  type="text" 
                  placeholder="Alex"
                  className="w-full p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-border"
                  value={formData.displayName}
                  onChange={e => setFormData({...formData, displayName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Age</label>
                  <input 
                    type="number" 
                    placeholder="25"
                    className="w-full p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-border"
                    value={formData.age}
                    onChange={e => setFormData({...formData, age: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <select 
                    className="w-full p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-border"
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
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input 
                  type="text" 
                  placeholder="Seattle"
                  className="w-full p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-border"
                  value={formData.city}
                  onChange={e => setFormData({...formData, city: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={handleBack} className="flex-1 py-3 border border-border rounded-lg font-medium hover:bg-surface-100 dark:hover:bg-surface-800 transition-base">
                Back
              </button>
              <button onClick={handleNext} disabled={!formData.displayName || !formData.age || !formData.gender} className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-base disabled:opacity-50">
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Your Intent</h2>
            <p className="text-sm text-surface-500">Who are you looking to meet?</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Mode (select at least one)</label>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800">
                    <input 
                      type="checkbox"
                      checked={formData.intentModes.includes("friendship")}
                      onChange={(e) => {
                        if (e.target.checked) setFormData({...formData, intentModes: [...formData.intentModes, "friendship"]});
                        else setFormData({...formData, intentModes: formData.intentModes.filter(m => m !== "friendship")});
                      }}
                    />
                    Friendship
                  </label>
                  <label className="flex-1 flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800">
                    <input 
                      type="checkbox"
                      checked={formData.intentModes.includes("dating")}
                      onChange={(e) => {
                        if (e.target.checked) setFormData({...formData, intentModes: [...formData.intentModes, "dating"]});
                        else setFormData({...formData, intentModes: formData.intentModes.filter(m => m !== "dating")});
                      }}
                    />
                    Dating
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Seriousness</label>
                <select 
                  className="w-full p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-border"
                  value={formData.seriousness}
                  onChange={e => setFormData({...formData, seriousness: e.target.value})}
                >
                  <option value="casual">Casual (Just seeing who's out there)</option>
                  <option value="serious">Serious (Looking to build lasting connections)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Gender Preferences (for connections)</label>
                <div className="flex flex-col gap-2">
                  {["man", "woman", "nonbinary", "everyone"].map(opt => (
                    <label key={opt} className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={formData.genderPref.includes(opt)}
                        onChange={(e) => {
                          if (e.target.checked) setFormData({...formData, genderPref: [...formData.genderPref, opt]});
                          else setFormData({...formData, genderPref: formData.genderPref.filter(m => m !== opt)});
                        }}
                      />
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={handleBack} className="flex-1 py-3 border border-border rounded-lg font-medium hover:bg-surface-100 dark:hover:bg-surface-800 transition-base">
                Back
              </button>
              <button onClick={handleNext} disabled={formData.intentModes.length === 0 || formData.genderPref.length === 0} className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-base disabled:opacity-50">
                Continue
              </button>
            </div>
          </div>
        )}

        {step > 2 && step <= QUESTIONS.length + 2 && (() => {
          const qIndex = step - 3;
          const question = QUESTIONS[qIndex];
          const isLast = step === QUESTIONS.length + 2;

          return (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">{question.label}</h2>
              <p className="text-surface-500">{question.description}</p>
              
              <div className="space-y-3">
                {question.options.map((opt, i) => (
                  <button
                    key={i}
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
                    className={`w-full p-4 rounded-lg border text-left transition-base ${
                      (question.type === 'multi' && Array.isArray(answers[question.id]) && answers[question.id].includes(opt)) ||
                      (question.type !== 'multi' && answers[question.id] === opt)
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" 
                        : "border-border hover:bg-surface-100 dark:hover:bg-surface-800"
                    }`}
                  >
                    {typeof opt === 'string' ? opt.charAt(0).toUpperCase() + opt.slice(1).replace('-', ' ') : opt}
                  </button>
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={handleBack} className="flex-1 py-3 border border-border rounded-lg font-medium hover:bg-surface-100 dark:hover:bg-surface-800 transition-base">
                  Back
                </button>
                <button 
                  onClick={isLast ? handleSubmit : handleNext} 
                  disabled={answers[question.id] === undefined || isSubmitting || (question.type === 'multi' && answers[question.id]?.length === 0)} 
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-base disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : isLast ? "Complete Profile" : "Next"}
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
