// ============================================================
// Kindred — Enum Constants
// ============================================================
// TypeScript const objects mirroring Firestore string-enum values.
// Use these everywhere in application logic for type safety.
// ============================================================

export const Segment = {
  STUDENT: 'student',
  PROFESSIONAL: 'professional',
  OTHER: 'other',
} as const;
export type Segment = (typeof Segment)[keyof typeof Segment];

export const Seriousness = {
  CASUAL: 'casual',
  SERIOUS: 'serious',
} as const;
export type Seriousness = (typeof Seriousness)[keyof typeof Seriousness];

export const KidsGoal = {
  WANTS_KIDS: 'wants_kids',
  HAS_KIDS: 'has_kids',
  NO_KIDS: 'no_kids',
  OPEN_KIDS: 'open_kids',
} as const;
export type KidsGoal = (typeof KidsGoal)[keyof typeof KidsGoal];

export const AttachmentStyle = {
  SECURE: 'secure',
  ANXIOUS: 'anxious',
  AVOIDANT: 'avoidant',
} as const;
export type AttachmentStyle = (typeof AttachmentStyle)[keyof typeof AttachmentStyle];

export const ConnectionMode = {
  FRIENDSHIP: 'friendship',
  DATING: 'dating',
} as const;
export type ConnectionMode = (typeof ConnectionMode)[keyof typeof ConnectionMode];

export const ProfileStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  BANNED: 'banned',
} as const;
export type ProfileStatus = (typeof ProfileStatus)[keyof typeof ProfileStatus];

export const MatchStatus = {
  SUGGESTED: 'suggested',
  CONNECTED: 'connected',
  EXPIRED: 'expired',
  DECLINED: 'declined',
} as const;
export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

export const ConnectionState = {
  OPEN: 'open',
  MET: 'met',
  CLOSED: 'closed',
} as const;
export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState];

export const PlanStatus = {
  PROPOSED: 'proposed',
  CONFIRMED_A: 'confirmed_a',
  CONFIRMED_B: 'confirmed_b',
  CONFIRMED: 'confirmed',
  DONE: 'done',
  CANCELLED: 'cancelled',
} as const;
export type PlanStatus = (typeof PlanStatus)[keyof typeof PlanStatus];

export const CheckInStatus = {
  PLANNED: 'planned',
  ARRIVED: 'arrived',
  SAFE: 'safe',
  HELP: 'help',
} as const;
export type CheckInStatus = (typeof CheckInStatus)[keyof typeof CheckInStatus];

export const ReportReason = {
  HARASSMENT: 'harassment',
  SPAM: 'spam',
  FAKE_PROFILE: 'fake_profile',
  UNDERAGE: 'underage',
  THREATENING: 'threatening',
  INAPPROPRIATE_CONTENT: 'inappropriate_content',
  OTHER: 'other',
} as const;
export type ReportReason = (typeof ReportReason)[keyof typeof ReportReason];

export const ReportStatus = {
  OPEN: 'open',
  REVIEWING: 'reviewing',
  ACTIONED: 'actioned',
  DISMISSED: 'dismissed',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const CommunityType = {
  METRO: 'metro',
  CAMPUS: 'campus',
  HOBBY: 'hobby',
  ORG: 'org',
} as const;
export type CommunityType = (typeof CommunityType)[keyof typeof CommunityType];

export const JoinRule = {
  OPEN: 'open',
  APPROVAL: 'approval',
  INVITE: 'invite',
} as const;
export type JoinRule = (typeof JoinRule)[keyof typeof JoinRule];

export const SubscriptionTier = {
  FREE: 'free',
  PLUS: 'plus',
} as const;
export type SubscriptionTier = (typeof SubscriptionTier)[keyof typeof SubscriptionTier];

export const SubscriptionStatus = {
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  TRIALING: 'trialing',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
