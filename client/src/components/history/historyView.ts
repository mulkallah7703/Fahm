import type { HistoryFilter, HistoryListItem, HistorySessionDetail } from "../../types";
import { conceptCountLabel, modeLabel } from "../../utils/format";

export type HistoryGroupId = "today" | "yesterday" | "week" | "older";

export interface HistoryGroup {
  id: HistoryGroupId;
  title: string;
  items: HistoryListItem[];
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfWeek(value: Date): Date {
  const day = startOfDay(value);
  const weekday = day.getDay();
  const saturdayOffset = (weekday + 1) % 7;
  day.setDate(day.getDate() - saturdayOffset);
  return day;
}

export function groupIdFor(iso: string, now = new Date()): HistoryGroupId {
  const then = startOfDay(new Date(iso));
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (then.getTime() === today.getTime()) return "today";
  if (then.getTime() === yesterday.getTime()) return "yesterday";
  if (then.getTime() >= startOfWeek(now).getTime()) return "week";
  return "older";
}

const GROUP_TITLES: Record<HistoryGroupId, string> = {
  today: "اليوم",
  yesterday: "أمس",
  week: "هذا الأسبوع",
  older: "أقدم",
};

export function groupHistory(items: HistoryListItem[], now = new Date()): HistoryGroup[] {
  const buckets: Record<HistoryGroupId, HistoryListItem[]> = {
    today: [],
    yesterday: [],
    week: [],
    older: [],
  };
  for (const item of items) {
    buckets[groupIdFor(item.startedAt || item.lastAccessedAt, now)].push(item);
  }
  return (Object.keys(GROUP_TITLES) as HistoryGroupId[])
    .map((id) => ({ id, title: GROUP_TITLES[id], items: buckets[id] }))
    .filter((group) => group.items.length > 0);
}

export function durationLabel(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "المدة غير متاحة";
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "أقل من دقيقة";
  if (minutes === 1) return "دقيقة واحدة";
  if (minutes === 2) return "دقيقتان";
  if (minutes <= 10) return `${minutes} دقائق`;
  return `${minutes} دقيقة`;
}

export function sessionCountLabel(total: number): string {
  return `Learning history · ${total} جلسة`;
}

export function emptyMessage(filter: HistoryFilter, search: string): string {
  if (search.trim()) return "لم نجد نتائج مطابقة.";
  if (filter === "needs_review") return "لا توجد جلسات تحتاج إلى مراجعة حاليًا.";
  return "لا يوجد سجل تعلم بعد.";
}

export function historyErrorMessage(fallback?: string | null): string {
  return fallback?.trim() || "تعذر تحميل سجل التعلم.";
}

export function itemMeta(item: HistoryListItem): string {
  return [
    item.conceptCount > 0 ? conceptCountLabel(item.conceptCount) : null,
    item.questionCount > 0 ? `${item.questionCount} أسئلة` : null,
    durationLabel(item.durationSeconds),
    [modeLabel(item.modeCode ?? item.mode, item.modeName), item.variantLabel].filter(Boolean).join(" · "),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function itemTitle(item: HistoryListItem): string {
  return item.pageNumber ? `${item.title} — صفحة ${item.pageNumber}` : item.title;
}

export function whenLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" });
}

export function indicatorClass(status: HistoryListItem["indicators"][number]["status"]): string {
  if (status === "strong" || status === "good") return "good";
  if (status === "review") return "warn";
  if (status === "extra") return "bad";
  return "dim";
}

export function indicatorText(item: HistoryListItem): string {
  if (item.indicators.length === 0) return item.needsReview ? "تحتاج مراجعة" : "بدون تقييم بعد";
  return item.indicators.map((dot) => `${dot.name} — ${dot.label}`).join("، ");
}

export function resumeHref(sessionId: string): string {
  return `/lesson/${sessionId}`;
}

export function reviewHref(sessionId: string): string {
  return `/lesson/${sessionId}/map`;
}

export function canReview(detail: HistorySessionDetail | null, item: HistoryListItem | null): boolean {
  if (detail?.concepts.some((concept) => concept.review)) return true;
  return Boolean(item?.needsReview);
}

export function reviewActionLabel(detail: HistorySessionDetail | null): string {
  const review = detail?.concepts.filter((concept) => concept.review) ?? [];
  if (review.length === 1) return `راجع ${review[0]?.name} الآن`;
  return "راجع المفاهيم";
}

export function answersEmpty(detail: HistorySessionDetail): boolean {
  return detail.answers.answeredCount === 0;
}

export function historyLiveMessage(input: {
  loading: boolean;
  error: string | null;
  selectedTitle?: string | null;
}): string {
  if (input.loading) return "جارٍ تحميل سجل التعلم.";
  if (input.error) return input.error;
  if (input.selectedTitle) return `تم اختيار ${input.selectedTitle}.`;
  return "";
}
