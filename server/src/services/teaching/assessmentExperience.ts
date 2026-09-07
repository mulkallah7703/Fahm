import type { AssessmentExperienceDto, AssessmentLessonState } from "../../types/assessment.js";
import type { AnalysisDto } from "../../types/analysis.js";
import type { MasteryRow } from "../../types/index.js";
import type { LessonState, PublicQuestion } from "../../types/teaching.js";
import { questionRepository } from "../../repositories/questionRepository.js";
import { studentAnswerRepository } from "../../repositories/studentAnswerRepository.js";
import { MASTERY_WEIGHTS } from "../../config/learningPulse.js";
import { parseSecret } from "./questionFactory.js";
import {
  assessmentHash,
  masteryLabel,
  planAssessmentQuestions,
  recommendationFrom,
  summaryMessage,
} from "./assessmentPlanner.js";

export function emptyAssessment(hash: string): AssessmentLessonState {
  return {
    contentHash: hash,
    itemIds: [],
    currentIndex: 0,
    active: false,
    completed: false,
    startedAt: new Date().toISOString(),
  };
}

export function shouldRebuildPlan(
  assessment: AssessmentLessonState | null | undefined,
  hash: string,
): boolean {
  return !assessment || assessment.contentHash !== hash;
}

export function toSafeAssessmentQuestion(row: {
  questionId: string;
  questionType: string;
  questionText: string;
  correctAnswer: string | null;
  difficultyLevel: string | null;
}): PublicQuestion {
  return {
    id: row.questionId,
    type: row.questionType as PublicQuestion["type"],
    text: row.questionText,
    options: parseSecret(row.correctAnswer)?.options ?? null,
    difficulty: (row.difficultyLevel as PublicQuestion["difficulty"]) ?? "easy",
  };
}

export async function ensureAssessmentPlan(
  sessionId: string,
  state: LessonState,
  analysis: AnalysisDto,
  mastery: MasteryRow[],
): Promise<{ created: boolean }> {
  const hash = assessmentHash(analysis, state.difficulty);
  if (!shouldRebuildPlan(state.assessment, hash)) {
    return { created: false };
  }
  const planned = planAssessmentQuestions(analysis, state, mastery);
  const ids: string[] = [];
  for (const built of planned) {
    const questionId = await questionRepository.insert({
      sessionId,
      conceptId: built.conceptId,
      questionType: built.type,
      questionText: built.text,
      correctAnswer: JSON.stringify(built.secret),
      difficultyLevel: built.difficulty,
      aiModel: "grounded-factory",
    });
    ids.push(questionId);
  }
  state.assessment = {
    contentHash: hash,
    itemIds: ids,
    currentIndex: 0,
    active: state.assessment?.active ?? false,
    completed: false,
    startedAt: new Date().toISOString(),
  };
  return { created: true };
}

export async function publicAssessment(
  state: LessonState,
  analysis: AnalysisDto,
  studentProfileId: string,
  mastery: MasteryRow[],
  pulse: { score: number; status: string } | null,
): Promise<AssessmentExperienceDto | null> {
  const assessment = state.assessment;
  if (!assessment) return null;
  const rows = await questionRepository.findMany(assessment.itemIds);
  const answers = await studentAnswerRepository.listForQuestions(studentProfileId, assessment.itemIds);
  const answerById = new Map(answers.map((item) => [item.questionId, item]));
  const conceptById = new Map(analysis.concepts.map((item) => [item.id, item]));
  const currentId = assessment.itemIds[assessment.currentIndex] ?? null;
  const currentRow = rows.find((row) => row.questionId === currentId) ?? null;
  const items = assessment.itemIds.map((id, index) => {
    const row = rows.find((item) => item.questionId === id);
    const answer = answerById.get(id);
    const concept = row?.conceptId ? conceptById.get(row.conceptId) : null;
    let status: "pending" | "current" | "correct" | "incorrect" | "partial" = "pending";
    if (answer?.isCorrect === true) status = "correct";
    else if (answer?.isCorrect === false) status = "incorrect";
    if (index === assessment.currentIndex && !assessment.completed) status = answer ? status : "current";
    return {
      questionId: id,
      conceptId: row?.conceptId ?? null,
      conceptName: concept?.name ?? null,
      status,
    };
  });
  const question = currentRow ? toSafeAssessmentQuestion(currentRow) : null;
  const uniqueAnswers = [...new Map(answers.map((item) => [item.questionId, item])).values()];
  const times = uniqueAnswers
    .map((item) => item.responseTimeSeconds)
    .filter((item): item is number => item !== null);
  const lessonTerms = state.content.terms;
  const evidence = lessonTerms.map((term) => {
    const row = mastery.find((item) => item.conceptId === term.conceptId);
    const score = row?.masteryScore ?? 0;
    const status = row?.masteryStatus ?? "unknown";
    return {
      conceptId: term.conceptId,
      name: term.name,
      masteryScore: score,
      status,
      label: masteryLabel(score, status),
      needsReview: score <= MASTERY_WEIGHTS.reviewScoreMax,
    };
  });
  const review = evidence.filter((item) => item.needsReview).map((item) => item.name);
  const understood = evidence.filter((item) => !item.needsReview && item.masteryScore > 0).map((item) => item.name);
  const correct = uniqueAnswers.filter((item) => item.isCorrect).length;
  const answered = uniqueAnswers.length;
  const total = assessment.itemIds.length;
  const current = total === 0 ? 0 : Math.min(assessment.currentIndex + 1, total);
  return {
    active: assessment.active,
    emptyMessage: total === 0 ? "لا توجد معلومات كافية لإعداد اختبار فهم لهذه الصفحة." : null,
    progress: { current, total, label: total === 0 ? "لا أسئلة بعد" : `السؤال ${current} من ${total}` },
    items,
    question,
    answered: Boolean(currentId && answerById.has(currentId)),
    evidence,
    pulseScore: pulse?.score ?? null,
    pulseStatus: pulse?.status ?? null,
    metrics: {
      correctCount: correct,
      answered,
      explanationRequests: state.explanationRequests,
      averageSeconds: times.length ? Math.round(times.reduce((sum, item) => sum + item, 0) / times.length) : null,
    },
    recommendation: recommendationFrom(review),
    summary: assessment.completed
      ? {
          message: summaryMessage(correct, answered, review.length),
          correctCount: correct,
          answered,
          understood,
          review,
        }
      : null,
  };
}
