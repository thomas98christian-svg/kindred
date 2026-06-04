// ============================================================
// Zod Validation Schemas
// ============================================================
// These schemas validate all user inputs before any Firestore
// write. They mirror the Firestore Security Rules validators.
// ============================================================

import { z } from 'zod';

// --- Shared primitives ---

const segmentSchema = z.enum(['student', 'professional', 'other']);
const seriousnessSchema = z.enum(['casual', 'serious']);
const connectionModeSchema = z.enum(['friendship', 'dating']);
const profileStatusSchema = z.enum(['active', 'paused', 'banned']);

const timeWindowSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
});

// --- Profile ---

export const psychologySchema = z.object({
  attachmentTendency: z.enum(['secure', 'anxious', 'avoidant']),
  conflictRepair: z.string().min(1).max(500),
  coreValues: z.array(z.string()).min(1).max(5),
  feelCaredFor: z.string().min(1).max(200),
  showCare: z.string().min(1).max(200),
  closenessAutonomy: z.number().int().min(1).max(5),
  relationshipPace: z.string().min(1).max(200),
  communicationCadence: z.string().min(1).max(200),
  stressResponse: z.string().min(1).max(200),
  planningStyle: z.enum(['spontaneous', 'structured', 'balanced']),
  dealbreakers: z.array(z.string()).max(10),
});

export const profileCreateSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50),
  age: z.number().int().min(18, 'Must be 18 or older').max(120),
  gender: z.string().min(1).max(30),
  genderPref: z.array(z.string().max(30)).min(1).max(10),
  ageMinPref: z.number().int().min(18).max(120),
  ageMaxPref: z.number().int().min(18).max(120),
  segment: segmentSchema,
  intentModes: z.array(connectionModeSchema).min(1).max(2).optional().default(['dating']), // Default to dating-only
  seriousness: seriousnessSchema,
  matchWithinSegment: z.boolean(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(50),
  metro: z.string().max(100).optional(),
  bio: z.string().max(500).optional().default(''),
  communityId: z.string().max(100).optional().nullable(),
  photos: z.array(z.string()).min(3, 'At least 3 photos are required').max(6),
  job: z.string().min(1, 'Occupation is required').max(100),
  height: z.number().int().min(30).max(100).optional().nullable(),
  kids: z.enum(['wants_kids', 'has_kids', 'no_kids', 'open_kids']),
  psychology: psychologySchema,
  availability: z.record(
    z.string(), // day of week key
    z.array(timeWindowSchema),
  ).optional().default({}),
}).refine(
  (data) => data.ageMinPref <= data.ageMaxPref,
  { message: 'Min age preference must be ≤ max age preference', path: ['ageMinPref'] },
);

export const profileUpdateSchema = profileCreateSchema.partial().omit({
  // These fields cannot be changed after initial creation
  // (or require special server-side handling)
});

// --- Profile Answers ---

export const profileAnswerSchema = z.object({
  questionId: z.string().min(1).max(50),
  value: z.union([
    z.string().max(50),                      // single-select
    z.number().int().min(0).max(4),          // ordinal
    z.array(z.string().max(50)).max(12),     // multi-select
  ]),
});

// --- Feedback ---

export const feedbackSchema = z.object({
  connectionId: z.string().min(1),
  wantAgain: z.boolean(),
  privateNote: z.string().max(1000).optional().nullable(),
});

// --- Report ---

export const reportSchema = z.object({
  reportedId: z.string().min(1),
  connectionId: z.string().optional().nullable(),
  reason: z.enum([
    'harassment',
    'spam',
    'fake_profile',
    'underage',
    'threatening',
    'inappropriate_content',
    'other',
  ]),
  details: z.string().min(1, 'Please provide details').max(2000),
});

// --- Block ---

export const blockSchema = z.object({
  blockedId: z.string().min(1),
});

// --- Message ---

export const messageSchema = z.object({
  body: z.string().min(1, 'Message cannot be empty').max(5000),
  isBuddySuggested: z.boolean().optional().default(false),
});

// --- Plan ---

export const planCreateSchema = z.object({
  connectionId: z.string().min(1),
  activity: z.string().min(1).max(200),
  venueName: z.string().max(200).optional().nullable(),
  venuePlaceId: z.string().max(200).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  hubCity: z.string().max(100).optional().nullable(),
  proposedTime: z.string().datetime().optional().nullable(),
});

export const planStatusUpdateSchema = z.object({
  status: z.enum([
    'proposed',
    'confirmed_a',
    'confirmed_b',
    'confirmed',
    'done',
    'cancelled',
  ]),
});

// --- Check-In ---

export const checkInSchema = z.object({
  connectionId: z.string().min(1),
  planId: z.string().min(1),
  status: z.enum(['planned', 'arrived', 'safe', 'help']),
  sharedContact: z.string().max(200).optional().nullable(),
});

// --- Waitlist ---

export const waitlistSchema = z.object({
  email: z.string().email().optional().nullable(),
  state: z.string().min(1).max(50),
  metro: z.string().min(1).max(100),
  communityId: z.string().max(100).optional().nullable(),
});

// --- Export types inferred from schemas ---

export type ProfileCreate = z.infer<typeof profileCreateSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type ProfileAnswer = z.infer<typeof profileAnswerSchema>;
export type FeedbackCreate = z.infer<typeof feedbackSchema>;
export type ReportCreate = z.infer<typeof reportSchema>;
export type BlockCreate = z.infer<typeof blockSchema>;
export type MessageCreate = z.infer<typeof messageSchema>;
export type PlanCreate = z.infer<typeof planCreateSchema>;
export type PlanStatusUpdate = z.infer<typeof planStatusUpdateSchema>;
export type CheckInCreate = z.infer<typeof checkInSchema>;
export type WaitlistCreate = z.infer<typeof waitlistSchema>;
