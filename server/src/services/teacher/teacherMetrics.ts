import { MASTERY_WEIGHTS } from "../../config/learningPulse.js";
import { computeOverallPulse } from "../masteryCalculationService.js";
import { masteryLabel } from "../teaching/assessmentPlanner.js";
import type { MasteryRow } from "../../types/index.js";
import type { MapMasteryBand } from "../../types/knowledgeMap.js";
import { bandFor } from "../knowledgeMap/mapGraph.js";

export function rangeStart(range: "week" | "month", now = new Date()): Date {
  const days = range === "week" ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function assessedMastery(rows: MasteryRow[]): MasteryRow[] {
  return rows.filter((row) => (row.attemptsCount ?? 0) > 0);
}

export function classAverage(rows: MasteryRow[]): number | null {
  const assessed = assessedMastery(rows);
  if (assessed.length === 0) return null;
  return computeOverallPulse(assessed)?.score ?? null;
}

export function studentNeedsExtra(rows: MasteryRow[]): boolean {
  return assessedMastery(rows).some((row) => masteryLabel(row.masteryScore, row.masteryStatus) === "شرح إضافي");
}

export function bandOf(row: MasteryRow | undefined): { band: MapMasteryBand; status: string } {
  const result = bandFor(row);
  return { band: result.band, status: result.status };
}

export function percentParts(counts: number[]): number[] {
  const total = counts.reduce((sum, value) => sum + value, 0);
  if (total === 0) return counts.map(() => 0);
  const raw = counts.map((value) => (value * 100) / total);
  const floors = raw.map((value) => Math.floor(value));
  let remain = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((left, right) => right.frac - left.frac);
  const next = [...floors];
  for (const item of order) {
    if (remain <= 0) break;
    next[item.index] += 1;
    remain -= 1;
  }
  return next;
}

export function escapeLike(value: string): string {
  return value.replace(/[%_[\]]/g, (char) => `[${char}]`);
}

export function ownedOnly<T extends { studentProfileId: string }>(
  rows: T[],
  allowed: Set<string>,
): T[] {
  return rows.filter((row) => allowed.has(row.studentProfileId));
}

export function recommendTeacher(input: {
  topReview: { name: string; affectedStudents: number } | null;
  explanationRequests: number;
  assignedStudents: number;
  dominantMode: { name: string; percent: number } | null;
}): { id: string; text: string }[] {
  if (input.assignedStudents === 0) {
    return [{ id: "empty", text: "لا توجد بيانات كافية لإصدار توصية بعد." }];
  }
  const items: { id: string; text: string }[] = [];
  if (input.topReview && input.topReview.affectedStudents >= 1) {
    items.push({
      id: "review",
      text: `اقتراح فَهْم: مراجعة جماعية قصيرة لـ «${input.topReview.name}» قبل الدرس القادم.`,
    });
  }
  if (input.explanationRequests >= 3) {
    items.push({
      id: "explain",
      text: "لاحظ فَهْم كثرة طلبات إعادة الشرح. راجع الفكرة نفسها بمثال أوضح قبل الانتقال.",
    });
  }
  if (input.dominantMode && input.dominantMode.percent >= 40) {
    items.push({
      id: "mode",
      text: `أكثر الطلاب يتعلمون بوضع ${input.dominantMode.name}. راعِ هذا عند تجهيز الدرس القادم.`,
    });
  }
  if (items.length === 0) {
    return [{ id: "empty", text: "لا توجد بيانات كافية لإصدار توصية بعد." }];
  }
  return items.slice(0, 2);
}

export function reviewAction(band: MapMasteryBand, affected: number): string {
  if (band === "شرح إضافي") return "أعد شرح المفهوم بمثال أقرب إلى صفحة الدرس.";
  if (band === "يحتاج مراجعة" || affected > 0) return "قدّم مراجعة قصيرة ثم تحقق من الفهم.";
  return "تابع تقدّم الطلاب في هذا المفهوم.";
}

export { MASTERY_WEIGHTS };
