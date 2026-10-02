import { FactorCode, FactorScoreResult, GlobalDomainScore, QualityFlags, QuestionItem } from '../types';
import { FACTORS_DATA, GLOBAL_DOMAINS } from '../data/factorsData';
import { QUESTIONS_POOL } from '../data/questionsData';

// Standard IPIP Norms (Mean & SD per factor for a 10-item scale benchmark)
export const FACTOR_NORMS: Record<FactorCode, { mean: number; sd: number }> = {
  A: { mean: 35.2, sd: 5.8 },
  B: { mean: 37.4, sd: 5.4 },
  C: { mean: 34.8, sd: 6.2 },
  E: { mean: 32.5, sd: 6.0 },
  F: { mean: 33.1, sd: 6.3 },
  G: { mean: 38.6, sd: 5.5 },
  H: { mean: 31.8, sd: 6.9 },
  I: { mean: 34.0, sd: 6.4 },
  L: { mean: 28.5, sd: 5.9 },
  M: { mean: 32.8, sd: 6.1 },
  N: { mean: 31.2, sd: 5.7 },
  O: { mean: 29.4, sd: 6.5 },
  Q1: { mean: 36.5, sd: 5.6 },
  Q2: { mean: 30.2, sd: 6.3 },
  Q3: { mean: 37.8, sd: 5.8 },
  Q4: { mean: 28.9, sd: 6.2 },
};

/**
 * Standard Normal Cumulative Distribution Function for percentile approximation
 */
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

export function computeQualityFlags(
  answers: Record<number, number>,
  durationSeconds: number,
  tooFastMinutes: number = 6
): QualityFlags {
  let attentionChecksFailed = 0;
  const notes: string[] = [];

  // Check attention check items
  const attentionItems = QUESTIONS_POOL.filter((q) => q.isAttentionCheck);
  for (const item of attentionItems) {
    const ans = answers[item.id];
    if (ans !== undefined && item.expectedAnswer !== undefined && ans !== item.expectedAnswer) {
      attentionChecksFailed++;
    }
  }

  if (attentionChecksFailed > 0) {
    notes.push(`Failed ${attentionChecksFailed} attention verification check(s).`);
  }

  // Check straight-lining (same answer >= 85% of questions)
  const answerValues = Object.values(answers);
  const total = answerValues.length;
  let isStraightLining = false;

  if (total >= 50) {
    const counts: Record<number, number> = {};
    for (const val of answerValues) {
      counts[val] = (counts[val] || 0) + 1;
    }
    const maxCount = Math.max(...Object.values(counts));
    if (maxCount / total >= 0.85) {
      isStraightLining = true;
      notes.push("High response repetition detected across majority of questions.");
    }
  }

  // Check completion duration
  const isTooFast = durationSeconds > 0 && durationSeconds < tooFastMinutes * 60;
  if (isTooFast) {
    notes.push(`Completed in ${Math.round(durationSeconds / 60)} minutes, which is faster than the recommended ${tooFastMinutes} min baseline.`);
  }

  const flagged = attentionChecksFailed >= 2 || isStraightLining || isTooFast;

  return {
    attentionChecksFailed,
    isStraightLining,
    isTooFast,
    durationSeconds,
    flagged,
    notes,
  };
}

export function computeFactorScores(
  answers: Record<number, number>,
  scalePoints: number = 5
): { scores: FactorScoreResult[]; globalDomains: GlobalDomainScore[] } {
  const factorCodes: FactorCode[] = [
    'A', 'B', 'C', 'E', 'F', 'G', 'H', 'I',
    'L', 'M', 'N', 'O', 'Q1', 'Q2', 'Q3', 'Q4',
  ];

  const scores: FactorScoreResult[] = [];

  for (const code of factorCodes) {
    const factorDef = FACTORS_DATA[code];
    const factorQuestions = QUESTIONS_POOL.filter((q) => q.factorCode === code && !q.isAttentionCheck);

    let rawSum = 0;
    let answeredCount = 0;

    for (const q of factorQuestions) {
      const ans = answers[q.id];
      if (ans !== undefined) {
        // Reverse key calculation
        const itemScore = q.reverseKeyed ? scalePoints + 1 - ans : ans;
        rawSum += itemScore;
        answeredCount++;
      }
    }

    // Scale to a standard 10-item equivalent if not all answered
    const factorItemCount = factorQuestions.length || 10;
    const effectiveRaw = answeredCount > 0 ? (rawSum / answeredCount) * 10 : 30;

    const norm = FACTOR_NORMS[code] || { mean: 30, sd: 6 };
    const zScore = (effectiveRaw - norm.mean) / (norm.sd || 1);

    // Sten: standard ten scale from 1 to 10
    const rawSten = Math.round(5.5 + 2 * zScore);
    const sten = Math.max(1, Math.min(10, rawSten));

    const percentile = Math.round(normalCDF(zScore) * 100);

    let band: 'low' | 'average' | 'high' = 'average';
    let interpretation = factorDef.averagePoleDesc;

    if (sten <= 3) {
      band = 'low';
      interpretation = factorDef.lowPoleDesc;
    } else if (sten >= 8) {
      band = 'high';
      interpretation = factorDef.highPoleDesc;
    }

    scores.push({
      factorCode: code,
      factorName: factorDef.name,
      rawScore: Math.round(effectiveRaw * 10) / 10,
      zScore: Math.round(zScore * 100) / 100,
      sten,
      percentile,
      band,
      lowLabel: factorDef.lowLabel,
      highLabel: factorDef.highLabel,
      interpretation,
    });
  }

  // Compute 5 Global Domains
  const scoreMap = new Map<FactorCode, FactorScoreResult>();
  scores.forEach((s) => scoreMap.set(s.factorCode, s));

  const globalDomains: GlobalDomainScore[] = GLOBAL_DOMAINS.map((domain) => {
    let domainStenSum = 0;
    let count = 0;

    for (const fc of domain.constituentFactors) {
      const factorRes = scoreMap.get(fc);
      if (factorRes) {
        domainStenSum += factorRes.sten;
        count++;
      }
    }

    const domainSten = count > 0 ? Math.round(domainStenSum / count) : 5.5;
    const clampedSten = Math.max(1, Math.min(10, Math.round(domainSten)));

    let band: 'low' | 'average' | 'high' = 'average';
    if (clampedSten <= 3) band = 'low';
    else if (clampedSten >= 8) band = 'high';

    return {
      name: domain.name,
      description: domain.description,
      sten: clampedSten,
      band,
      constituentFactors: domain.constituentFactors,
    };
  });

  return { scores, globalDomains };
}
