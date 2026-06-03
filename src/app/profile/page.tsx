"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getFirebaseDb, doc, readDoc, setDoc } from "@/lib/firebase/firestore";
import { ProfileDoc } from "@/types/database";
import { ConnectionMode } from "@/types/enums";
import { motion, AnimatePresence } from "framer-motion";
import { PhotoUpload } from "@/components/ui/PhotoUpload";
import { 
  User, 
  LogOut, 
  Edit2, 
  Check, 
  X, 
  MapPin, 
  ShieldAlert, 
  Sparkles, 
  UserMinus, 
  UserCheck,
  ChevronRight,
  Heart,
  Users
} from "lucide-react";

// Predefined US States for dropdown
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

// Predefined Metro Areas
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

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { success, error, info } = useToast();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [editForm, setEditForm] = useState({
    displayName: "",
    bio: "",
    age: 18,
    gender: "",
    genderPref: [] as string[],
    ageMinPref: 18,
    ageMaxPref: 99,
    intentModes: [] as ConnectionMode[],
    seriousness: "casual" as "casual" | "serious",
    city: "",
    state: "",
    metro: "",
    photoUrl: "",
    lat: null as number | null,
    lng: null as number | null,
  });

  const [cityPredictions, setCityPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);

  const handleCityChange = async (val: string) => {
    setEditForm((prev) => ({ ...prev, city: val }));
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

      setEditForm((prev) => ({
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

  useEffect(() => {
    if (!user) return;

    async function loadProfile() {
      try {
        const docData = await readDoc<ProfileDoc>("profiles", user!.uid);
        if (!docData) {
          info("Please complete onboarding first.");
          router.push("/onboarding");
          return;
        }
        setProfile(docData);
        setEditForm({
          displayName: docData.displayName || "",
          bio: docData.bio || "",
          age: docData.age || 18,
          gender: docData.gender || "",
          genderPref: docData.genderPref || [],
          ageMinPref: docData.ageMinPref || 18,
          ageMaxPref: docData.ageMaxPref || 99,
          intentModes: docData.intentModes || [],
          seriousness: docData.seriousness || "casual",
          city: docData.city || "",
          state: docData.state || "",
          metro: docData.metro || "",
          photoUrl: docData.photoUrl || "",
          lat: docData.lat || null,
          lng: docData.lng || null,
        });
      } catch (err) {
        console.error("Failed to load profile:", err);
        error("Could not fetch profile details.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user, router, error, info]);

  // Handle Stripe Redirection Query Parameters
  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const subscriptionParam = params.get("subscription");
    const portalParam = params.get("portal");

    async function handleParams() {
      if (subscriptionParam === "success") {
        try {
          const db = getFirebaseDb();
          await setDoc(doc(db, "profiles", user!.uid), {
            subscriptionTier: "plus",
          }, { merge: true });

          await setDoc(doc(db, "subscriptions", user!.uid), {
            profileId: user!.uid,
            stripeCustomerId: "cus_mock_customer",
            stripeSubId: "sub_mock_subscription",
            tier: "plus",
            status: "active",
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }, { merge: true });

          success("Welcome to Kindred Plus! Your membership is active.");
          setProfile(prev => prev ? ({ ...prev, subscriptionTier: "plus" } as any) : null);
        } catch (err) {
          console.error(err);
          error("Failed to activate premium membership.");
        }
        router.replace("/profile");
      } else if (subscriptionParam === "cancel") {
        info("Checkout cancelled.");
        router.replace("/profile");
      }

      if (portalParam === "success") {
        success("Billing details updated.");
        router.replace("/profile");
      }
    }

    handleParams();
  }, [user, router, success, error, info]);

  const handleSignOut = async () => {
    try {
      await signOut();
      success("Signed out successfully.");
      router.push("/");
    } catch (err) {
      console.error(err);
      error("Failed to sign out.");
    }
  };

  const togglePauseAccount = async () => {
    if (!user || !profile) return;
    const newStatus = profile.status === "paused" ? "active" : "paused";
    try {
      const db = getFirebaseDb();
      await setDoc(
        doc(db, "profiles", user.uid),
        { status: newStatus },
        { merge: true }
      );
      setProfile({ ...profile, status: newStatus });
      success(
        newStatus === "paused"
          ? "Account paused. You won't appear in Discover."
          : "Account activated! You're back in the pool."
      );
    } catch (err) {
      console.error(err);
      error("Failed to update status.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Basic Validation
    if (!editForm.displayName.trim()) {
      error("Display Name is required.");
      return;
    }
    if (editForm.intentModes.length === 0) {
      error("Select at least one intent mode.");
      return;
    }
    if (editForm.genderPref.length === 0) {
      error("Select at least one gender preference.");
      return;
    }
    if (editForm.ageMinPref > editForm.ageMaxPref) {
      error("Minimum age pref cannot be greater than maximum age pref.");
      return;
    }

    setSaving(true);
    try {
      const db = getFirebaseDb();
      const updatedData = {
        displayName: editForm.displayName,
        bio: editForm.bio,
        age: Number(editForm.age),
        gender: editForm.gender,
        genderPref: editForm.genderPref,
        ageMinPref: Number(editForm.ageMinPref),
        ageMaxPref: Number(editForm.ageMaxPref),
        intentModes: editForm.intentModes,
        seriousness: editForm.seriousness,
        city: editForm.city,
        state: editForm.state,
        metro: editForm.metro,
        photoUrl: editForm.photoUrl || null,
        lat: editForm.lat || null,
        lng: editForm.lng || null,
      };

      await setDoc(doc(db, "profiles", user.uid), updatedData, { merge: true });
      setProfile((prev) => (prev ? ({ ...prev, ...updatedData } as ProfileDoc) : null));
      success("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin" />
          <p className="text-surface-500 text-sm font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center space-y-4 max-w-sm">
          <ShieldAlert className="mx-auto text-red-400" size={48} />
          <h2 className="text-xl font-bold">Profile Not Found</h2>
          <p className="text-surface-500 text-sm">
            We couldn't load your profile. Please check if you completed the onboarding flow.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header Banner */}
      <div className="relative h-48 bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-800 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 md:left-8 md:translate-x-0">
          <div className="relative w-32 h-32 rounded-full bg-surface-100 dark:bg-surface-800 border-4 border-background shadow-xl">
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.displayName} className="w-full h-full object-cover" />
              ) : (
                <User size={64} className="text-surface-400 opacity-50" />
              )}
            </div>
            {profile.verified && (
              <span className="absolute bottom-0 right-0 p-1.5 bg-brand-500 text-white rounded-full border-2 border-background shadow-md z-10">
                <Sparkles size={16} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto px-4 mt-20 space-y-6">
        {/* User Info Overview */}
        <div className="text-center md:text-left md:pl-36">
          <h1 className="text-3xl font-extrabold tracking-tight">
            {profile.displayName}, {profile.age}
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-2 text-surface-500 mt-1.5">
            <MapPin size={16} />
            <span className="text-sm font-medium">
              {profile.city ? `${profile.city}, ` : ""}{profile.state} ({profile.metro} Metro)
            </span>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-3 mt-4">
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                profile.status === "active"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}
            >
              {profile.status === "active" ? "Active in Pool" : "Account Paused"}
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full border bg-surface-100 dark:bg-surface-800 border-border text-surface-400 capitalize">
              {profile.segment}
            </span>
          </div>
        </div>

        {/* View/Edit Mode Content with Animations */}
        <AnimatePresence mode="wait">
          {!isEditing ? (
            <motion.div
              key="view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Bio & Details Card */}
              <div className="glass p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <h3 className="text-lg font-bold">About Me</h3>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    <Edit2 size={16} />
                    Edit Profile
                  </button>
                </div>

                <p className="text-sm text-surface-300 leading-relaxed italic">
                  {profile.bio || "No bio added yet. Write something about yourself!"}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <span className="text-xs text-surface-500 font-semibold uppercase tracking-wider block">
                      Gender
                    </span>
                    <span className="text-sm font-medium capitalize">
                      {profile.gender || "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-surface-500 font-semibold uppercase tracking-wider block">
                      Seeking Mode
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {profile.intentModes.map((mode) => (
                        <span
                          key={mode}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-md capitalize"
                        >
                          {mode}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-surface-500 font-semibold uppercase tracking-wider block">
                      Seriousness Preference
                    </span>
                    <span className="text-sm font-medium capitalize">
                      {profile.seriousness === "casual"
                        ? "Casual (Just seeing who's out there)"
                        : "Serious (Looking to build lasting connections)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-surface-500 font-semibold uppercase tracking-wider block">
                      Interested In
                    </span>
                    <span className="text-sm font-medium capitalize">
                      {profile.genderPref.join(", ")}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-surface-500 font-semibold uppercase tracking-wider block">
                      Ideal Partner Age Range
                    </span>
                    <span className="text-sm font-medium">
                      {profile.ageMinPref} – {profile.ageMaxPref} years old
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Controls Card */}
              <div className="glass p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold border-b border-border pb-3">
                  Account Management
                </h3>
                <div className="space-y-3">
                  {/* Subscription Membership info */}
                  <div className="flex items-center justify-between p-3 bg-surface-800/40 rounded-xl border border-border/40">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Membership Plan</p>
                      <p className="text-xs text-surface-500">
                        Current Tier: <span className="capitalize font-bold text-brand-400">{(profile as any)?.subscriptionTier || "free"}</span>
                      </p>
                    </div>
                    <Link
                      href="/settings/subscription"
                      className="px-4 py-2 text-xs font-bold rounded-lg transition-colors bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center gap-1 shrink-0"
                    >
                      View Plans
                    </Link>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-surface-800/40 rounded-xl border border-border/40">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {profile.status === "active" ? "Pause Matches" : "Resume Matches"}
                      </p>
                      <p className="text-xs text-surface-500">
                        {profile.status === "active"
                          ? "Hide your profile from discovery momentarily."
                          : "Make your profile discoverable to matches again."}
                      </p>
                    </div>
                    <button
                      onClick={togglePauseAccount}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                        profile.status === "active"
                          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {profile.status === "active" ? (
                        <>
                          <UserMinus size={14} />
                          Pause Account
                        </>
                      ) : (
                        <>
                          <UserCheck size={14} />
                          Resume Account
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-semibold transition-colors"
                  >
                    <LogOut size={18} />
                    Sign Out of Kindred
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="edit"
              onSubmit={handleSave}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="glass p-6 rounded-2xl space-y-6"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-lg font-bold">Edit Profile Info</h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1 text-sm font-semibold text-surface-400 hover:text-surface-300 transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>

              {/* Photo Upload */}
              <div className="border-b border-border/40 pb-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2">
                  Profile Picture
                </label>
                <PhotoUpload
                  currentPhotoUrl={editForm.photoUrl || null}
                  onUploadComplete={(url) => setEditForm({ ...editForm, photoUrl: url })}
                  onRemove={() => setEditForm({ ...editForm, photoUrl: "" })}
                />
              </div>

              {/* Text Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.displayName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, displayName: e.target.value })
                    }
                    className="w-full p-3 rounded-xl bg-surface-900 border border-border focus:border-brand-500 focus:outline-none text-sm transition-colors"
                    placeholder="Enter your first name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
                      Age
                    </label>
                    <input
                      type="number"
                      required
                      min={18}
                      max={120}
                      value={editForm.age}
                      onChange={(e) =>
                        setEditForm({ ...editForm, age: Number(e.target.value) })
                      }
                      className="w-full p-3 rounded-xl bg-surface-900 border border-border focus:border-brand-500 focus:outline-none text-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
                      Gender
                    </label>
                    <select
                      value={editForm.gender}
                      onChange={(e) =>
                        setEditForm({ ...editForm, gender: e.target.value })
                      }
                      className="w-full p-3 rounded-xl bg-surface-900 border border-border focus:border-brand-500 focus:outline-none text-sm transition-colors"
                    >
                      <option value="man">Man</option>
                      <option value="woman">Woman</option>
                      <option value="nonbinary">Non-binary</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
                    Bio
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    maxLength={500}
                    className="w-full p-3 rounded-xl bg-surface-900 border border-border focus:border-brand-500 focus:outline-none text-sm transition-colors resize-none"
                    placeholder="Tell your potential connections about yourself..."
                  />
                  <span className="text-[11px] text-surface-500 block text-right mt-1">
                    {editForm.bio.length}/500 characters
                  </span>
                </div>

                <div className="border-t border-border/45 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500 mb-3">
                    Location & Community
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 relative">
                      <label className="block text-[11px] font-semibold text-surface-400 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.city}
                        onChange={(e) => handleCityChange(e.target.value)}
                        onFocus={() => { if (cityPredictions.length > 0) setShowPredictions(true); }}
                        onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
                        className="w-full p-2.5 rounded-lg bg-surface-900 border border-border focus:border-brand-500 focus:outline-none text-sm transition-colors"
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
                      <label className="block text-[11px] font-semibold text-surface-400 mb-1">
                        State
                      </label>
                      <select
                        value={editForm.state}
                        onChange={(e) =>
                          setEditForm({ ...editForm, state: e.target.value })
                        }
                        className="w-full p-2.5 rounded-lg bg-surface-900 border border-border focus:border-brand-500 focus:outline-none text-sm transition-colors"
                      >
                        {US_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[11px] font-semibold text-surface-400 mb-1">
                        Metro Area
                      </label>
                      <select
                        value={editForm.metro}
                        onChange={(e) =>
                          setEditForm({ ...editForm, metro: e.target.value })
                        }
                        className="w-full p-2.5 rounded-lg bg-surface-900 border border-border focus:border-brand-500 focus:outline-none text-sm transition-colors"
                      >
                        <option value="">Select metro area...</option>
                        {METRO_AREAS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/45 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500 mb-3">
                    Matching Preferences
                  </h4>
                  <div className="space-y-4">
                    {/* Seeking Intent Toggles */}
                    <div>
                      <label className="block text-[11px] font-semibold text-surface-400 mb-2">
                        Intent Modes
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const isIncluded = editForm.intentModes.includes("friendship");
                            const nextModes = isIncluded
                              ? editForm.intentModes.filter((m) => m !== "friendship")
                              : [...editForm.intentModes, "friendship" as ConnectionMode];
                            setEditForm({ ...editForm, intentModes: nextModes });
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-colors ${
                            editForm.intentModes.includes("friendship")
                              ? "bg-brand-500/10 border-brand-500/30 text-brand-400"
                              : "border-border hover:bg-surface-800 text-surface-400"
                          }`}
                        >
                          <Users size={16} />
                          Friendship
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const isIncluded = editForm.intentModes.includes("dating");
                            const nextModes = isIncluded
                              ? editForm.intentModes.filter((m) => m !== "dating")
                              : [...editForm.intentModes, "dating" as ConnectionMode];
                            setEditForm({ ...editForm, intentModes: nextModes });
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-colors ${
                            editForm.intentModes.includes("dating")
                              ? "bg-brand-500/10 border-brand-500/30 text-brand-400"
                              : "border-border hover:bg-surface-800 text-surface-400"
                          }`}
                        >
                          <Heart size={16} />
                          Dating
                        </button>
                      </div>
                    </div>

                    {/* Seriousness Preference */}
                    <div>
                      <label className="block text-[11px] font-semibold text-surface-400 mb-1.5">
                        Seriousness
                      </label>
                      <select
                        value={editForm.seriousness}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            seriousness: e.target.value as "casual" | "serious",
                          })
                        }
                        className="w-full p-3 rounded-xl bg-surface-900 border border-border focus:border-brand-500 focus:outline-none text-sm transition-colors"
                      >
                        <option value="casual">Casual (Just seeing who's out there)</option>
                        <option value="serious">Serious (Looking to build lasting connections)</option>
                      </select>
                    </div>

                    {/* Gender Preference checkboxes */}
                    <div>
                      <label className="block text-[11px] font-semibold text-surface-400 mb-2">
                        Interested in Genders
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {["man", "woman", "nonbinary", "everyone"].map((opt) => {
                          const isSel = editForm.genderPref.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                const nextGenders = isSel
                                  ? editForm.genderPref.filter((g) => g !== opt)
                                  : [...editForm.genderPref, opt];
                                setEditForm({ ...editForm, genderPref: nextGenders });
                              }}
                              className={`py-2 px-3.5 rounded-lg border text-xs font-semibold transition-colors capitalize ${
                                isSel
                                  ? "bg-brand-500/10 border-brand-500/30 text-brand-400"
                                  : "border-border hover:bg-surface-800 text-surface-400"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Age Range Preference */}
                    <div>
                      <label className="block text-[11px] font-semibold text-surface-400 mb-2">
                        Age Range Preference
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={18}
                          max={120}
                          value={editForm.ageMinPref}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              ageMinPref: Number(e.target.value),
                            })
                          }
                          className="w-20 p-2 rounded-lg bg-surface-900 border border-border text-center text-sm"
                          placeholder="Min"
                        />
                        <span className="text-surface-500 text-sm">to</span>
                        <input
                          type="number"
                          min={18}
                          max={120}
                          value={editForm.ageMaxPref}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              ageMaxPref: Number(e.target.value),
                            })
                          }
                          className="w-20 p-2 rounded-lg bg-surface-900 border border-border text-center text-sm"
                          placeholder="Max"
                        />
                        <span className="text-xs text-surface-500">years old</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-brand-500/20"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Save Profile
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
