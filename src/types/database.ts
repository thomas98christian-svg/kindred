// ============================================================
// Kindred — Firestore Document Type Definitions
// ============================================================
// One interface per collection/subcollection. These types are
// used by both client SDK and Admin SDK code.
// ============================================================

import type { Timestamp } from 'firebase/firestore';
import type {
  Segment,
  Seriousness,
  ConnectionMode,
  ProfileStatus,
  MatchStatus,
  ConnectionState,
  PlanStatus,
  CheckInStatus,
  ReportReason,
  ReportStatus,
  CommunityType,
  JoinRule,
  SubscriptionTier,
  SubscriptionStatus,
  KidsGoal,
  AttachmentStyle,
} from './enums';

// ------------------------------------------------------------
// communities
// ------------------------------------------------------------
export interface CommunityDoc {
  name: string;
  type: CommunityType;
  state: string;
  metro: string;
  joinRule: JoinRule;
  createdAt: Timestamp;
}

// ------------------------------------------------------------
// profiles  (doc ID = auth.uid)
// ------------------------------------------------------------
export interface AvailabilityWindow {
  start: string; // "09:00" (24h format)
  end: string;   // "17:00"
}

export interface ProfilePsychology {
  attachmentTendency: AttachmentStyle;
  conflictRepair: string;
  coreValues: string[];
  feelCaredFor: string;
  showCare: string;
  closenessAutonomy: number;
  relationshipPace: string;
  communicationCadence: string;
  stressResponse: string;
  planningStyle: 'spontaneous' | 'structured' | 'balanced';
  dealbreakers: string[];
}

export interface ProfileDoc {
  displayName: string;
  age: number;
  gender: string;
  genderPref: string[];
  ageMinPref: number;
  ageMaxPref: number;
  segment: Segment;
  intentModes: ConnectionMode[]; // subset of ['friendship', 'dating']
  seriousness: Seriousness;
  matchWithinSegment: boolean;
  state: string;       // US state abbreviation
  metro: string;       // Metro area name
  city: string;
  lat: number;
  lng: number;
  bio: string;
  photoUrl: string | null; // Keep for fallback compatibility
  photos: string[];        // New multi-photo array
  job: string;
  height: number | null;   // optional height in inches
  kids: KidsGoal;
  psychology: ProfilePsychology;
  verified: boolean;
  status: ProfileStatus;
  communityId: string | null;
  availability: Record<string, AvailabilityWindow[]>; // keyed by day of week
  createdAt: Timestamp;
}

// ------------------------------------------------------------
// profiles/{uid}/profileAnswers  (doc ID = questionId)
// ------------------------------------------------------------
export interface ProfileAnswerDoc {
  questionId: string;
  value: string | number | string[]; // depends on question type
}

// ------------------------------------------------------------
// matches
// ------------------------------------------------------------
export interface MatchDoc {
  profileA: string;    // uid
  profileB: string;    // uid
  participants: [string, string]; // sorted [min(a,b), max(a,b)] for array-contains
  compatScore: number; // 0–100
  status: MatchStatus;
  createdAt: Timestamp;
}

// ------------------------------------------------------------
// connections
// ------------------------------------------------------------
export interface ConnectionDoc {
  matchId: string;
  mode: ConnectionMode;
  agreedSeriousness: Seriousness | null;
  profileA: string;
  profileB: string;
  participants: [string, string]; // same sorted pair
  openedAt: Timestamp;
  softDeadline: Timestamp;        // openedAt + 48h
  firstMessageAt: Timestamp | null;
  state: ConnectionState;
  closedReason: string | null;
}

// ------------------------------------------------------------
// connections/{id}/messages
// ------------------------------------------------------------
export interface MessageDoc {
  senderId: string;
  body: string;
  isBuddySuggested: boolean;
  createdAt: Timestamp;
}

// ------------------------------------------------------------
// buddySuggestions
// ------------------------------------------------------------
export interface BuddySuggestionDoc {
  connectionId: string;
  suggestions: string[];    // 2–3 short openers
  promptTokens: number;
  completionTokens: number;
  createdAt: Timestamp;
}

// ------------------------------------------------------------
// plans
// ------------------------------------------------------------
export interface PlanDoc {
  connectionId: string;
  participants: [string, string];
  activity: string;
  venueName: string | null;
  venuePlaceId: string | null;
  lat: number | null;
  lng: number | null;
  hubCity: string | null;
  proposedTime: Timestamp | null;
  status: PlanStatus;
  createdAt: Timestamp;
}

// ------------------------------------------------------------
// feedback
// CRITICAL: Only readable by fromProfile. NEVER by the other party.
// ------------------------------------------------------------
export interface FeedbackDoc {
  connectionId: string;
  fromProfile: string;     // auth.uid of the person leaving feedback
  wantAgain: boolean;
  privateNote: string | null;
  createdAt: Timestamp;
}

// ------------------------------------------------------------
// reports
// ------------------------------------------------------------
export interface ReportDoc {
  reporterId: string;
  reportedId: string;
  connectionId: string | null;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  createdAt: Timestamp;
}

// ------------------------------------------------------------
// blocks  (doc ID = "{blockerId}_{blockedId}")
// ------------------------------------------------------------
export interface BlockDoc {
  blockerId: string;
  blockedId: string;
  createdAt: Timestamp;
}

// ------------------------------------------------------------
// checkIns
// ------------------------------------------------------------
export interface CheckInDoc {
  connectionId: string;
  profileId: string;
  planId: string;
  status: CheckInStatus;
  sharedContact: string | null;
  createdAt: Timestamp;
}

// ------------------------------------------------------------
// reliability  (doc ID = auth.uid)
// Server-only. Client reads/writes are denied.
// ------------------------------------------------------------
export interface ReliabilityDoc {
  profileId: string;
  noShowCount: number;
  completedMeets: number;
}

// ------------------------------------------------------------
// waitlist
// ------------------------------------------------------------
export interface WaitlistDoc {
  profileId: string | null;
  email: string | null;
  state: string;
  metro: string;
  communityId: string | null;
  position: number;
  referredBy: string | null;
  createdAt: Timestamp;
}

// ------------------------------------------------------------
// subscriptions
// ------------------------------------------------------------
export interface SubscriptionDoc {
  profileId: string;
  stripeCustomerId: string;
  stripeSubId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: Timestamp;
}

// ------------------------------------------------------------
// Collection path constants
// ------------------------------------------------------------
export const Collections = {
  COMMUNITIES: 'communities',
  PROFILES: 'profiles',
  PROFILE_ANSWERS: 'profileAnswers', // subcollection of profiles
  MATCHES: 'matches',
  CONNECTIONS: 'connections',
  MESSAGES: 'messages',              // subcollection of connections
  BUDDY_SUGGESTIONS: 'buddySuggestions',
  PLANS: 'plans',
  FEEDBACK: 'feedback',
  REPORTS: 'reports',
  BLOCKS: 'blocks',
  CHECK_INS: 'checkIns',
  RELIABILITY: 'reliability',
  WAITLIST: 'waitlist',
  SUBSCRIPTIONS: 'subscriptions',
} as const;
