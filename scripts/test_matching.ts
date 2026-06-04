import { calculateCompatScore, passesPreFilters } from "../src/lib/matching/engine";
import { ProfileDoc } from "../src/types/database";
import { Timestamp } from "firebase/firestore";

// Mock Timestamp
const mockTimestamp = {
  seconds: 0,
  nanoseconds: 0,
  toDate: () => new Date(),
  toMillis: () => 0,
  isEqual: () => false,
  toString: () => "",
  toJSON: () => ({ seconds: 0, nanoseconds: 0 }),
} as unknown as Timestamp;

const profile1: ProfileDoc = {
  displayName: "Alice",
  age: 28,
  gender: "female",
  genderPref: ["male"],
  ageMinPref: 25,
  ageMaxPref: 35,
  segment: "professional",
  intentModes: ["dating"],
  seriousness: "serious",
  matchWithinSegment: false,
  state: "NY",
  metro: "New York",
  city: "New York",
  lat: 40.7128,
  lng: -74.006,
  bio: "Looking for a deep relationship. Non-smoker.",
  photoUrl: null,
  photos: ["https://example.com/p1.jpg", "https://example.com/p2.jpg", "https://example.com/p3.jpg"],
  job: "Engineer",
  height: 65,
  kids: "wants_kids",
  psychology: {
    attachmentTendency: "secure",
    conflictRepair: "repair",
    coreValues: ["growth", "intellect", "stability"],
    feelCaredFor: "time",
    showCare: "time",
    closenessAutonomy: 4,
    relationshipPace: "commitment",
    communicationCadence: "high_frequency",
    stressResponse: "reassurance",
    planningStyle: "structured",
    dealbreakers: ["casual", "smoking"],
  },
  verified: true,
  status: "active",
  communityId: "nyc-community",
  availability: {},
  createdAt: mockTimestamp,
};

const profile2: ProfileDoc = {
  displayName: "Bob",
  age: 30,
  gender: "male",
  genderPref: ["female"],
  ageMinPref: 25,
  ageMaxPref: 35,
  segment: "professional",
  intentModes: ["dating"],
  seriousness: "casual", // Clashes with Alice's dealbreaker
  matchWithinSegment: false,
  state: "NY",
  metro: "New York",
  city: "New York",
  lat: 40.7128,
  lng: -74.006,
  bio: "Just exploring. Sometimes smoker.", // Clashes with Alice's dealbreaker
  photoUrl: null,
  photos: ["https://example.com/p1.jpg", "https://example.com/p2.jpg", "https://example.com/p3.jpg"],
  job: "Artist",
  height: 70,
  kids: "no_kids", // Clashes with Alice's kids preference
  psychology: {
    attachmentTendency: "anxious",
    conflictRepair: "passive",
    coreValues: ["freedom", "growth"],
    feelCaredFor: "words",
    showCare: "words",
    closenessAutonomy: 5,
    relationshipPace: "exploration",
    communicationCadence: "high_frequency",
    stressResponse: "reassurance",
    planningStyle: "spontaneous",
    dealbreakers: [],
  },
  verified: true,
  status: "active",
  communityId: "nyc-community",
  availability: {},
  createdAt: mockTimestamp,
};

const profile3: ProfileDoc = {
  displayName: "Charlie",
  age: 32,
  gender: "male",
  genderPref: ["female"],
  ageMinPref: 25,
  ageMaxPref: 35,
  segment: "professional",
  intentModes: ["dating"],
  seriousness: "serious",
  matchWithinSegment: false,
  state: "NY",
  metro: "New York",
  city: "New York",
  lat: 40.7128,
  lng: -74.006,
  bio: "Deep thinker, non-smoker.",
  photoUrl: null,
  photos: ["https://example.com/p1.jpg", "https://example.com/p2.jpg", "https://example.com/p3.jpg"],
  job: "Designer",
  height: 72,
  kids: "wants_kids",
  psychology: {
    attachmentTendency: "avoidant",
    conflictRepair: "cool_down",
    coreValues: ["growth", "intellect", "stability"],
    feelCaredFor: "time",
    showCare: "time",
    closenessAutonomy: 3,
    relationshipPace: "commitment",
    communicationCadence: "quality_checkins",
    stressResponse: "space",
    planningStyle: "balanced",
    dealbreakers: ["smoking"],
  },
  verified: true,
  status: "active",
  communityId: "nyc-community",
  availability: {},
  createdAt: mockTimestamp,
};

function runTest() {
  console.log("=== RUNNING KINDRED COMPATIBILITY MODEL TESTS ===");

  // Test Alice & Bob (Secure vs Anxious, Dealbreaker Clashes: Casual relationship & smoking)
  console.log("\n--- Alice & Bob ---");
  console.log("Alice pre-filters Bob:", passesPreFilters(profile1, profile2));
  const res1 = calculateCompatScore(profile1, profile2);
  console.log("Score:", res1.score);
  console.log("Reason:", res1.reason);
  console.log("Breakdown:", JSON.stringify(res1.breakdown, null, 2));

  // Test Alice & Charlie (Secure vs Avoidant, Aligned Values & Pace)
  console.log("\n--- Alice & Charlie ---");
  console.log("Alice pre-filters Charlie:", passesPreFilters(profile1, profile3));
  const res2 = calculateCompatScore(profile1, profile3);
  console.log("Score:", res2.score);
  console.log("Reason:", res2.reason);
  console.log("Breakdown:", JSON.stringify(res2.breakdown, null, 2));

  // Test Bob & Charlie (Anxious vs Avoidant - Classic insecure pairing)
  console.log("\n--- Bob & Charlie ---");
  console.log("Bob pre-filters Charlie:", passesPreFilters(profile2, profile3));
  const res3 = calculateCompatScore(profile2, profile3);
  console.log("Score:", res3.score);
  console.log("Reason:", res3.reason);
  console.log("Breakdown:", JSON.stringify(res3.breakdown, null, 2));
}

runTest();
