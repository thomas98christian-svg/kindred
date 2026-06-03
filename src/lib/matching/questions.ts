// ============================================================
// Matching Questions — Constants
// ============================================================
// The 8 matching questions from the spec (Section 6), stored
// as TypeScript constants. These never change at runtime.
// profile_answers subcollection references them by questionId.
//
// Scoring logic will be implemented in Phase 1, but the
// question definitions and affinity matrix live here.
// ============================================================

export type QuestionType = 'single' | 'ordinal' | 'affinity' | 'multi';

export interface QuestionDef {
  id: string;
  label: string;
  description: string;
  type: QuestionType;
  weight: number;
  options: readonly (string | number)[];
}

export const QUESTIONS: readonly QuestionDef[] = [
  {
    id: 'life_stage',
    label: 'Life stage',
    description: 'Where are you in life right now?',
    type: 'single',
    weight: 3,
    options: ['study', 'career', 'founder', 'family', 'slow'],
  },
  {
    id: 'social_energy',
    label: 'Social energy',
    description: 'How much time with people feels right?',
    type: 'ordinal',
    weight: 2,
    options: [0, 1, 2, 3, 4], // solitude → constant people
  },
  {
    id: 'ideal_hangout',
    label: 'Ideal hangout',
    description: 'What size gathering do you prefer?',
    type: 'ordinal',
    weight: 1.5,
    options: [0, 1, 2, 3], // one-on-one → big event
  },
  {
    id: 'contact_rhythm',
    label: 'Contact rhythm',
    description: 'How often do you like to check in with friends?',
    type: 'ordinal',
    weight: 2,
    options: [0, 1, 2, 3], // rarely → most days
  },
  {
    id: 'core_value',
    label: 'Core value',
    description: 'What matters most in a friendship?',
    type: 'single',
    weight: 3,
    options: ['loyalty', 'growth', 'fun', 'depth', 'calm'],
  },
  {
    id: 'conflict_style',
    label: 'Conflict style',
    description: 'How do you handle disagreements?',
    type: 'single',
    weight: 2,
    options: ['direct', 'wait', 'let-go', 'avoid'],
  },
  {
    id: 'what_you_want',
    label: 'What you want',
    description: 'What kind of connection are you looking for?',
    type: 'affinity',
    weight: 2.5,
    options: ['deep', 'wider', 'activity', 'talk'],
  },
  {
    id: 'interests',
    label: 'Interests',
    description: 'Pick the activities you enjoy',
    type: 'multi',
    weight: 2,
    options: [
      'film', 'outdoors', 'sports', 'music',
      'art', 'cooking', 'gaming', 'reading',
      'travel', 'fitness', 'tech', 'crafts',
    ],
  },
] as const;

/**
 * Symmetric affinity matrix for question 7 ("What you want").
 * Score between two users' answers: AFFINITY_MATRIX[a][b].
 */
export const AFFINITY_MATRIX: Record<string, Record<string, number>> = {
  deep:     { deep: 1,   talk: 0.7, wider: 0.4, activity: 0.4 },
  wider:    { deep: 0.4, talk: 0.6, wider: 1,   activity: 0.7 },
  activity: { deep: 0.4, talk: 0.5, wider: 0.7, activity: 1   },
  talk:     { deep: 0.7, talk: 1,   wider: 0.6, activity: 0.5 },
};

/**
 * Interest → activity mapping for the plan engine (Section 11).
 * Used to suggest meetup activities based on shared interests.
 */
export const INTEREST_ACTIVITY_MAP: Record<string, string> = {
  film: 'a movie',
  outdoors: 'a hike or picnic',
  sports: 'a game',
  music: 'live music',
  art: 'a gallery',
  cooking: 'dinner',
  gaming: 'an arcade bar',
  reading: 'a bookshop and coffee',
  travel: 'coffee and travel stories',
  fitness: 'a workout',
  tech: 'a tech meetup',
  crafts: 'a craft workshop',
};

/** Total weight sum for normalization */
export const TOTAL_WEIGHT = QUESTIONS.reduce((sum, q) => sum + q.weight, 0);
