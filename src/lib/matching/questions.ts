// ============================================================
// Dating Experience Onboarding Questions & Constants
// ============================================================

export type QuestionType = 'single' | 'ordinal' | 'multi' | 'scale' | 'quiz';

export interface QuestionDef {
  id: string;
  label: string;
  description: string;
  type: QuestionType;
  options: readonly string[] | readonly number[];
}

export const ATTACHMENT_QUIZ = [
  {
    id: 'attachment_anxious',
    statement: "I often worry that partners won't stay with me or don't love me as much as I love them.",
    leaning: 'anxious',
  },
  {
    id: 'attachment_secure',
    statement: "I find it relatively easy to open up, share my feelings, and depend on partners.",
    leaning: 'secure',
  },
  {
    id: 'attachment_avoidant',
    statement: "When a partner gets very close, I feel an urge to pull back or protect my space.",
    leaning: 'avoidant',
  },
] as const;

export const PSYCHOLOGY_QUESTIONS = [
  {
    id: 'conflict_repair',
    label: 'Conflict & Repair Style',
    description: 'When a disagreement occurs in a relationship, what is your default reaction?',
    type: 'single',
    options: [
      'repair',     // Discuss it immediately to resolve and repair connection
      'cool_down',  // Take some space to cool down, then talk it through
      'passive',    // Keep it to myself to avoid creating tension
      'reactive',   // Wait for the other person to bring it up or apologize
    ],
    labels: {
      repair: 'Discuss immediately & resolve',
      cool_down: 'Take space to cool down, then talk',
      passive: 'Keep it to myself to avoid tension',
      reactive: 'Wait for them to initiate repair',
    }
  },
  {
    id: 'core_values',
    label: 'Core Values & Life Priorities',
    description: 'Which core values guide your life priorities and choices most? (Select up to 3)',
    type: 'multi',
    options: ['growth', 'stability', 'freedom', 'intellect', 'ambition'],
    labels: {
      growth: 'Personal Growth & Learning',
      stability: 'Stability, Security & Family',
      freedom: 'Adventure, Freedom & Travel',
      intellect: 'Intellectual & Deep Connection',
      ambition: 'Ambition, Success & Impact',
    }
  },
  {
    id: 'feel_cared_for',
    label: 'Feeling Cared For',
    description: 'How do you feel most cared for by a partner? (Love Language - Receiving)',
    type: 'single',
    options: ['words', 'time', 'acts', 'physical'],
    labels: {
      words: 'Words of support & deep talk',
      time: 'Quality time spent together',
      acts: 'Thoughtful gestures & helpful tasks',
      physical: 'Physical affection & proximity',
    }
  },
  {
    id: 'show_care',
    label: 'Showing Care',
    description: 'How do you naturally show care to a partner? (Love Language - Giving)',
    type: 'single',
    options: ['words', 'time', 'acts', 'physical'],
    labels: {
      words: 'Expressing verbal encouragement',
      time: 'Planning dates & focusing on them',
      acts: 'Doing practical things to help them',
      physical: 'Being physically warm & affectionate',
    }
  },
  {
    id: 'closeness_autonomy',
    label: 'Closeness vs Autonomy',
    description: 'Where do you sit on the spectrum of closeness versus autonomy?',
    type: 'scale',
    options: [1, 2, 3, 4, 5],
    labels: {
      1: 'Highly Autonomous (lots of solo time)',
      3: 'Balanced Closeness & Autonomy',
      5: 'Highly Interdependent (share daily life)',
    }
  },
  {
    id: 'relationship_pace',
    label: 'Relationship Pace & Goals',
    description: 'What is your relationship goal and timeline?',
    type: 'single',
    options: ['commitment', 'exploration', 'family'],
    labels: {
      commitment: 'Intentional dating leading to exclusivity',
      exploration: 'Exploring connections to see where they lead',
      family: 'Aligned on marriage/family on a clear timeline',
    }
  },
  {
    id: 'communication_cadence',
    label: 'Communication Cadence',
    description: 'How would you describe your communication style and directness?',
    type: 'single',
    options: ['high_frequency', 'quality_checkins', 'indirect', 'in_person'],
    labels: {
      high_frequency: 'Texting throughout the day, direct & open',
      quality_checkins: 'Fewer texts but deep, direct check-ins',
      indirect: 'Indirect & gentle, phrasing things softly',
      in_person: 'Minimal texting, saving talk for in-person',
    }
  },
  {
    id: 'stress_response',
    label: 'Stress Response Support',
    description: 'When you are highly stressed, what do you need most from a partner?',
    type: 'single',
    options: ['space', 'reassurance', 'action', 'distraction'],
    labels: {
      space: 'Space & quiet to process alone',
      reassurance: 'Comfort, listening, & reassurance',
      action: 'Practical help solving the problem',
      distraction: 'Distraction with something fun',
    }
  },
  {
    id: 'planning_style',
    label: 'Date Planning Style',
    description: 'How do you prefer to plan dates and activities?',
    type: 'single',
    options: ['structured', 'spontaneous', 'balanced'],
    labels: {
      structured: 'Structured: booking & scheduling in advance',
      spontaneous: 'Spontaneous: deciding on the day by mood',
      balanced: 'Balanced: main event planned, rest open',
    }
  },
  {
    id: 'dealbreakers',
    label: 'Relationship Dealbreakers',
    description: 'Which of these are non-negotiable dealbreakers for you? (Select all that apply)',
    type: 'multi',
    options: ['smoking', 'politics', 'ambition', 'casual', 'pets', 'religion'],
    labels: {
      smoking: 'Smoking or substance use',
      politics: 'Clashing political/world views',
      ambition: 'Lack of life direction or ambition',
      casual: 'Opposing relationship seriousness (casual vs serious)',
      pets: 'Dislike of pets or animals',
      religion: 'Highly religious or not religious',
    }
  },
] as const;

export const DOMAIN_WEIGHTS = {
  attachment: 0.20,
  conflict: 0.12,
  values: 0.12,
  care: 0.10,
  closeness: 0.10,
  pace: 0.12,
  comm: 0.08,
  stress: 0.08,
  planning: 0.08,
} as const;
