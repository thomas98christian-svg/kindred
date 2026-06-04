import { ProfileDoc } from "@/types/database";
import { DOMAIN_WEIGHTS } from "./questions";

export interface ScoreBreakdown {
  attachment: number;
  conflict: number;
  values: number;
  care: number;
  closeness: number;
  pace: number;
  comm: number;
  stress: number;
  planning: number;
}

export interface MatchCompatResult {
  score: number; // 0 to 100
  breakdown: ScoreBreakdown;
  reason: string;
}

/**
 * Calculates a detailed compatibility score and reason between two profiles.
 */
export function calculateCompatScore(
  me: ProfileDoc,
  candidate: ProfileDoc
): MatchCompatResult {
  const p1 = me.psychology;
  const p2 = candidate.psychology;

  // Fallback if psychology is missing
  if (!p1 || !p2) {
    return {
      score: 50,
      breakdown: {
        attachment: 0.5,
        conflict: 0.5,
        values: 0.5,
        care: 0.5,
        closeness: 0.5,
        pace: 0.5,
        comm: 0.5,
        stress: 0.5,
        planning: 0.5,
      },
      reason: "Complete your questionnaire to unlock detailed compatibility science.",
    };
  }

  // 1. Attachment Tendency (Weight: 20%)
  // secure-secure = 1.0, secure-insecure = 0.8, anxious-avoidant = 0.2 (penalty), insecure-insecure (same) = 0.6, avoidant-avoidant = 0.5
  let attachmentScore = 0.6;
  const a1 = p1.attachmentTendency;
  const a2 = p2.attachmentTendency;
  if (a1 === 'secure' && a2 === 'secure') {
    attachmentScore = 1.0;
  } else if (a1 === 'secure' || a2 === 'secure') {
    attachmentScore = 0.8;
  } else if ((a1 === 'anxious' && a2 === 'avoidant') || (a1 === 'avoidant' && a2 === 'anxious')) {
    attachmentScore = 0.2; // Anxious-avoidant is a known difficult pairing dynamics
  } else if (a1 === 'avoidant' && a2 === 'avoidant') {
    attachmentScore = 0.5;
  }

  // 2. Conflict & Repair Style (Weight: 12%)
  let conflictScore = 0.6;
  const c1 = p1.conflictRepair;
  const c2 = p2.conflictRepair;
  if (c1 === c2) {
    conflictScore = 1.0;
  } else if ((c1 === 'repair' && c2 === 'cool_down') || (c1 === 'cool_down' && c2 === 'repair')) {
    conflictScore = 0.8; // complement well
  } else if (c1 === 'passive' && c2 === 'passive') {
    conflictScore = 0.4; // avoiding everything
  }

  // 3. Core Values & Priorities (Weight: 12%)
  // Jaccard similarity
  let valuesScore = 0.4;
  const v1 = p1.coreValues || [];
  const v2 = p2.coreValues || [];
  if (v1.length > 0 && v2.length > 0) {
    const set1 = new Set(v1);
    const set2 = new Set(v2);
    const intersect = v1.filter(x => set2.has(x));
    const union = new Set([...v1, ...v2]);
    valuesScore = intersect.length / union.size;
  }

  // 4. Care Exchange (Love Languages) (Weight: 10%)
  // Matches feelCaredFor (receiving) with showCare (giving)
  let careScore = 0.5;
  const receivesA = p1.feelCaredFor;
  const givesA = p1.showCare;
  const receivesB = p2.feelCaredFor;
  const givesB = p2.showCare;

  const matchesOneWay = (givesA === receivesB);
  const matchesOtherWay = (givesB === receivesA);
  if (matchesOneWay && matchesOtherWay) {
    careScore = 1.0;
  } else if (matchesOneWay || matchesOtherWay) {
    careScore = 0.8;
  }

  // 5. Closeness vs Autonomy (Weight: 10%)
  // Scale of 1 to 5. diff of 0 = 1.0, diff of 1 = 0.85, diff of 4 = 0.2
  const closeDiff = Math.abs(p1.closenessAutonomy - p2.closenessAutonomy);
  const closenessScore = 1 - (closeDiff / 5);

  // 6. Relationship Pace & Goals (Weight: 12%)
  let paceScore = 0.5;
  const pace1 = p1.relationshipPace;
  const pace2 = p2.relationshipPace;
  if (pace1 === pace2) {
    paceScore = 1.0;
  } else if ((pace1 === 'commitment' && pace2 === 'family') || (pace1 === 'family' && pace2 === 'commitment')) {
    paceScore = 0.8; // close alignment
  } else if (pace1 === 'exploration' || pace2 === 'exploration') {
    paceScore = 0.3; // exploring vs commitment clash
  }

  // 7. Communication Cadence (Weight: 8%)
  let commScore = 0.6;
  const comm1 = p1.communicationCadence;
  const comm2 = p2.communicationCadence;
  if (comm1 === comm2) {
    commScore = 1.0;
  } else if ((comm1 === 'high_frequency' && comm2 === 'in_person') || (comm1 === 'in_person' && comm2 === 'high_frequency')) {
    commScore = 0.4; // texting clash
  } else if ((comm1 === 'quality_checkins' && comm2 === 'in_person') || (comm1 === 'in_person' && comm2 === 'quality_checkins')) {
    commScore = 0.7;
  }

  // 8. Stress Response Support (Weight: 8%)
  let stressScore = 0.7;
  const s1 = p1.stressResponse;
  const s2 = p2.stressResponse;
  if (s1 === s2) {
    stressScore = 1.0;
  } else if ((s1 === 'space' && s2 === 'reassurance') || (s1 === 'reassurance' && s2 === 'space')) {
    stressScore = 0.5; // space vs reassurance clash
  }

  // 9. Planning Style (Weight: 8%)
  let planningScore = 0.6;
  const plan1 = p1.planningStyle;
  const plan2 = p2.planningStyle;
  if (plan1 === plan2) {
    planningScore = 1.0;
  } else if (plan1 === 'balanced' || plan2 === 'balanced') {
    planningScore = 0.8;
  } else {
    planningScore = 0.5; // structured vs spontaneous opposites
  }

  // Weighted compatibility score (0 to 1)
  let rawScore = 
    (attachmentScore * DOMAIN_WEIGHTS.attachment) +
    (conflictScore * DOMAIN_WEIGHTS.conflict) +
    (valuesScore * DOMAIN_WEIGHTS.values) +
    (careScore * DOMAIN_WEIGHTS.care) +
    (closenessScore * DOMAIN_WEIGHTS.closeness) +
    (paceScore * DOMAIN_WEIGHTS.pace) +
    (commScore * DOMAIN_WEIGHTS.comm) +
    (stressScore * DOMAIN_WEIGHTS.stress) +
    (planningScore * DOMAIN_WEIGHTS.planning);

  // Convert to 0 - 100 percentage
  let finalPercent = Math.round(rawScore * 100);

  // Apply Dealbreakers Penalty (-15% per clash)
  let dealbreakerClashes = 0;
  const myBreakers = p1.dealbreakers || [];
  const candidateBreakers = p2.dealbreakers || [];

  // Check my dealbreakers against candidate
  if (myBreakers.includes('casual') && candidate.seriousness === 'casual') dealbreakerClashes++;
  if (myBreakers.includes('smoking') && candidate.bio?.toLowerCase().includes('smok')) dealbreakerClashes++;
  if (myBreakers.includes('religion') && (candidate.bio?.toLowerCase().includes('atheist') || candidate.bio?.toLowerCase().includes('secular'))) dealbreakerClashes++;

  // Check candidate dealbreakers against me
  if (candidateBreakers.includes('casual') && me.seriousness === 'casual') dealbreakerClashes++;
  if (candidateBreakers.includes('smoking') && me.bio?.toLowerCase().includes('smok')) dealbreakerClashes++;

  finalPercent = Math.max(10, finalPercent - (dealbreakerClashes * 15));

  // Determine why-you-two reason string (based on highest score segment)
  const scores = {
    attachment: attachmentScore,
    conflict: conflictScore,
    values: valuesScore,
    care: careScore,
    closeness: closenessScore,
    pace: paceScore,
    planning: planningScore,
  };

  let maxCategory = 'attachment';
  let maxScore = attachmentScore;
  for (const [cat, val] of Object.entries(scores)) {
    if (val > maxScore) {
      maxScore = val;
      maxCategory = cat;
    }
  }

  let reason = "You show great overall alignment in your communication cadence and relationship goals.";
  if (maxCategory === 'attachment' && maxScore >= 0.8) {
    if (a1 === 'secure' && a2 === 'secure') {
      reason = "Your mutual secure attachment styles and relationship comfort levels form a very steady, secure foundation.";
    } else {
      reason = "Your secure attachment compatibility and relationship comfort levels form a supportive, steady foundation.";
    }
  } else if (maxCategory === 'values' && maxScore >= 0.7) {
    reason = "You both deeply prioritize personal growth and shared values, aligning your long-term life directions.";
  } else if (maxCategory === 'conflict' && maxScore >= 0.8) {
    reason = "You are highly aligned in how you resolve arguments, taking space to cool down before repairing.";
  } else if (maxCategory === 'care' && maxScore >= 0.8) {
    reason = "Your giving and receiving love languages are highly complementary, meaning you naturally make each other feel valued.";
  } else if (maxCategory === 'closeness' && maxScore >= 0.8) {
    reason = "You both share a matching vision for balancing independent autonomy with deep couple integration.";
  } else if (maxCategory === 'pace' && maxScore >= 0.8) {
    reason = "You are both looking for a similar relationship pace and long-term commitment timeline.";
  } else if (maxCategory === 'planning' && maxScore >= 0.8) {
    if (plan1 === plan2) {
      reason = `You both share a ${plan1} planning style, meaning you will coordinate dates and weekend activities easily.`;
    } else {
      reason = "Your planning styles are highly compatible, helping you coordinate dates and weekend activities easily.";
    }
  }

  return {
    score: finalPercent,
    breakdown: {
      attachment: attachmentScore,
      conflict: conflictScore,
      values: valuesScore,
      care: careScore,
      closeness: closenessScore,
      pace: paceScore,
      comm: commScore,
      stress: stressScore,
      planning: planningScore,
    },
    reason,
  };
}

/**
 * Checks if the candidate fits the user's demographic preferences.
 */
export function passesPreFilters(me: ProfileDoc, candidate: ProfileDoc): boolean {
  if (me.communityId !== candidate.communityId) return false;

  // Age checks
  if (candidate.age < me.ageMinPref || candidate.age > me.ageMaxPref) return false;
  if (me.age < candidate.ageMinPref || me.age > candidate.ageMaxPref) return false;

  // Gender checks
  if (!me.genderPref.includes('everyone') && !me.genderPref.includes(candidate.gender)) return false;
  if (!candidate.genderPref.includes('everyone') && !candidate.genderPref.includes(me.gender)) return false;

  return true;
}
