import { isLearningModeCode, type LearningModeCode } from "../../config/learningModes.js";
import type { RecentAnswerRow } from "../../repositories/answerRepository.js";
import { answerRepository } from "../../repositories/answerRepository.js";

export interface ModeEffectivenessScore {
  mode: LearningModeCode;
  score: number;
  sampleSize: number;
}

export function scoreModeEffectiveness(rows: RecentAnswerRow[]): ModeEffectivenessScore[] {
  const buckets = new Map<LearningModeCode, { correct: number; total: number }>();

  for (const row of rows) {
    if (!row.modeCode || !isLearningModeCode(row.modeCode) || row.isCorrect === null) {
      continue;
    }
    const current = buckets.get(row.modeCode) ?? { correct: 0, total: 0 };
    current.total += 1;
    if (row.isCorrect) current.correct += 1;
    buckets.set(row.modeCode, current);
  }

  return [...buckets.entries()]
    .filter(([, stats]) => stats.total >= 2)
    .map(([mode, stats]) => ({
      mode,
      score: Math.round((stats.correct / stats.total) * 100) / 100,
      sampleSize: stats.total,
    }))
    .sort((a, b) => b.score - a.score);
}

export const modeEffectivenessService = {
  async forStudent(studentProfileId: string): Promise<ModeEffectivenessScore[]> {
    const answers = await answerRepository.listRecentWithMode(studentProfileId);
    return scoreModeEffectiveness(answers);
  },
};
