import { ProfileDoc, ProfileAnswerDoc } from "@/types/database";
import { QUESTIONS, AFFINITY_MATRIX, TOTAL_WEIGHT } from "./questions";

/**
 * Calculates a compatibility score (0-100) between two sets of answers.
 * 
 * @param myAnswers Current user's answers, keyed by questionId
 * @param candidateAnswers Candidate user's answers, keyed by questionId
 * @returns Score from 0 to 100
 */
export function calculateCompatScore(
  myAnswers: Record<string, any>,
  candidateAnswers: Record<string, any>
): number {
  let score = 0;
  let maxPossibleScore = 0;

  for (const q of QUESTIONS) {
    const me = myAnswers[q.id];
    const them = candidateAnswers[q.id];

    if (me === undefined || them === undefined) continue;

    maxPossibleScore += q.weight;

    switch (q.type) {
      case 'single':
        if (me === them) score += q.weight;
        break;

      case 'ordinal': {
        // e.g. options = [0, 1, 2, 3, 4]
        // diff of 0 = 100%, diff of 1 = 75%, diff of 4 = 0%
        const diff = Math.abs((me as number) - (them as number));
        const maxDiff = q.options.length - 1;
        const normalizedDiff = 1 - (diff / maxDiff);
        score += q.weight * normalizedDiff;
        break;
      }

      case 'affinity': {
        const matrixValue = AFFINITY_MATRIX[me as string]?.[them as string] || 0;
        score += q.weight * matrixValue;
        break;
      }

      case 'multi': {
        // Jaccard similarity for arrays
        const mySet = new Set(me as string[]);
        const theirSet = new Set(them as string[]);
        const intersection = new Set([...mySet].filter(x => theirSet.has(x)));
        const union = new Set([...mySet, ...theirSet]);
        
        if (union.size > 0) {
          score += q.weight * (intersection.size / union.size);
        }
        break;
      }
    }
  }

  if (maxPossibleScore === 0) return 0;
  return Math.round((score / maxPossibleScore) * 100);
}

/**
 * Determines if two users have overlapping intent modes.
 */
export function intentsOverlap(me: ProfileDoc, candidate: ProfileDoc): boolean {
  return me.intentModes.some(mode => candidate.intentModes.includes(mode));
}

/**
 * Checks if the candidate fits the user's demographic preferences.
 * NOTE: For Phase 1, we also require mutual mode overlap and mutual preference overlap.
 */
export function passesPreFilters(me: ProfileDoc, candidate: ProfileDoc): boolean {
  if (me.communityId !== candidate.communityId) return false;
  if (!intentsOverlap(me, candidate)) return false;

  // Age checks
  if (candidate.age < me.ageMinPref || candidate.age > me.ageMaxPref) return false;
  if (me.age < candidate.ageMinPref || me.age > candidate.ageMaxPref) return false;

  // Gender checks
  if (!me.genderPref.includes('everyone') && !me.genderPref.includes(candidate.gender)) return false;
  if (!candidate.genderPref.includes('everyone') && !candidate.genderPref.includes(me.gender)) return false;

  return true;
}
