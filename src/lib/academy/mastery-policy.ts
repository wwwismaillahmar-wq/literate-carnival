/**
 * ASLAN-ACADEMY-UNIFIED-004 — configurable mastery policy evaluator.
 * Pure, fail-closed decision engine. The caller MUST load evidence from the
 * authenticated learner's server-side enrollment and verified assessment records.
 * Never accept evidence supplied by a browser request as authoritative.
 */
export type MasteryCondition =
  | { kind: 'assessment'; assessmentId: string; minimumScore: number }
  | { kind: 'practical'; activityId: string; requiredStatus: 'approved' }
  | { kind: 'safety'; competencyId: string }
  | { kind: 'prerequisite'; unitId: string }
  | { kind: 'release_after'; isoDate: string };

export type MasteryRule =
  | { operator: 'all' | 'any'; rules: MasteryRule[] }
  | { operator: 'condition'; condition: MasteryCondition };

export type MasteryEvidence = {
  assessmentScores: Record<string, number | undefined>;
  approvedActivities: readonly string[];
  passedSafetyCompetencies: readonly string[];
  masteredUnits: readonly string[];
  now: string;
};

export type MasteryDecision = { allowed: boolean; unmet: string[] };

const MAX_DEPTH = 12;
const MAX_NODES = 256;
const validId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 180;

export function evaluateMastery(rule: MasteryRule, evidence: MasteryEvidence): MasteryDecision {
  let nodes = 0;
  const evaluate = (node: MasteryRule, depth: number): MasteryDecision => {
    nodes += 1;
    if (nodes > MAX_NODES || depth > MAX_DEPTH || !node || typeof node !== 'object') {
      return { allowed: false, unmet: ['invalid_policy'] };
    }
    if (node.operator === 'all' || node.operator === 'any') {
      if (!Array.isArray(node.rules) || node.rules.length === 0 || node.rules.length > MAX_NODES) {
        return { allowed: false, unmet: ['invalid_policy'] };
      }
      const results = node.rules.map(child => evaluate(child, depth + 1));
      if (results.some(result => result.unmet.includes('invalid_policy'))) {
        return { allowed: false, unmet: ['invalid_policy'] };
      }
      const allowed = node.operator === 'all'
        ? results.every(result => result.allowed)
        : results.some(result => result.allowed);
      return { allowed, unmet: allowed ? [] : results.flatMap(result => result.unmet) };
    }
    if (node.operator !== 'condition' || !node.condition) {
      return { allowed: false, unmet: ['invalid_policy'] };
    }
    const c = node.condition;
    let allowed = false;
    let key = 'invalid_policy';
    switch (c.kind) {
      case 'assessment': {
        if (!validId(c.assessmentId) || !Number.isFinite(c.minimumScore) ||
            c.minimumScore < 0 || c.minimumScore > 100) break;
        const score = evidence.assessmentScores[c.assessmentId];
        allowed = typeof score === 'number' && Number.isFinite(score) &&
          score >= c.minimumScore && score <= 100;
        key = 'assessment:' + c.assessmentId;
        break;
      }
      case 'practical':
        if (!validId(c.activityId) || c.requiredStatus !== 'approved') break;
        allowed = evidence.approvedActivities.includes(c.activityId);
        key = 'practical:' + c.activityId;
        break;
      case 'safety':
        if (!validId(c.competencyId)) break;
        allowed = evidence.passedSafetyCompetencies.includes(c.competencyId);
        key = 'safety:' + c.competencyId;
        break;
      case 'prerequisite':
        if (!validId(c.unitId)) break;
        allowed = evidence.masteredUnits.includes(c.unitId);
        key = 'prerequisite:' + c.unitId;
        break;
      case 'release_after': {
        const release = Date.parse(c.isoDate);
        const now = Date.parse(evidence.now);
        if (!Number.isFinite(release) || !Number.isFinite(now)) break;
        allowed = now >= release;
        key = 'release_after:' + c.isoDate;
        break;
      }
      default:
        break;
    }
    return { allowed, unmet: allowed ? [] : [key] };
  };
  return evaluate(rule, 0);
}
