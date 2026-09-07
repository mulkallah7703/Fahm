import { describe, expect, it } from "vitest";
import type { HistoryListItem, HistorySessionDetail } from "../../types";
import { historyListPath } from "../../services/historyApi";
import {
  canReview,
  durationLabel,
  emptyMessage,
  groupHistory,
  groupIdFor,
  historyErrorMessage,
  historyLiveMessage,
  indicatorText,
  itemMeta,
  itemTitle,
  resumeHref,
  reviewActionLabel,
  reviewHref,
  sessionCountLabel,
} from "./historyView";

function item(partial: Partial<HistoryListItem> = {}): HistoryListItem {
  return {
    id: "s1",
    sessionId: "s1",
    materialId: "m1",
    title: "حالات المادة",
    pageNumber: 38,
    subject: "علوم",
    conceptCount: 2,
    modeCode: "focus",
    modeName: "Focus",
    status: "active",
    lastAccessedAt: "2026-09-05T16:15:00.000Z",
    startedAt: "2026-09-05T16:15:00.000Z",
    completedAt: null,
    durationSeconds: null,
    mode: "focus",
    variant: null,
    variantLabel: null,
    progress: null,
    questionCount: 2,
    answeredCount: 1,
    correctCount: 1,
    needsReview: true,
    indicators: [{ conceptId: "c1", name: "التكاثف", status: "review", label: "يحتاج مراجعة" }],
    ...partial,
  };
}

describe("history view model", () => {
  it("groups by local relative time without hardcoding أمس as data", () => {
    const now = new Date(2026, 8, 3, 12, 0, 0);
    const yesterday = new Date(2026, 8, 2, 19, 15, 0).toISOString();
    const earlierWeek = new Date(2026, 7, 31, 10, 0, 0).toISOString();
    expect(groupIdFor(yesterday, now)).toBe("yesterday");
    expect(groupIdFor(earlierWeek, now)).toBe("week");
    const groups = groupHistory(
      [item({ startedAt: yesterday, lastAccessedAt: yesterday }), item({ sessionId: "s2", id: "s2", startedAt: earlierWeek })],
      now,
    );
    expect(groups.map((group) => group.title)).toEqual(["أمس", "هذا الأسبوع"]);
  });

  it("uses an honest duration fallback", () => {
    expect(durationLabel(null)).toBe("المدة غير متاحة");
    expect(durationLabel(0)).toBe("المدة غير متاحة");
    expect(durationLabel(720)).toBe("12 دقيقة");
  });

  it("renders titles, search, and filter empty states from real inputs", () => {
    expect(itemTitle(item())).toBe("حالات المادة — صفحة 38");
    expect(sessionCountLabel(0)).toBe("Learning history · 0 جلسة");
    expect(emptyMessage("all", "")).toBe("لا يوجد سجل تعلم بعد.");
    expect(emptyMessage("all", "ماء")).toBe("لم نجد نتائج مطابقة.");
    expect(emptyMessage("needs_review", "")).toBe("لا توجد جلسات تحتاج إلى مراجعة حاليًا.");
    expect(historyErrorMessage(null)).toBe("تعذر تحميل سجل التعلم.");
  });

  it("keeps status in text, not color alone", () => {
    expect(indicatorText(item())).toContain("يحتاج مراجعة");
    expect(itemMeta(item())).toContain("أسئلة");
    expect(itemMeta(item())).toContain("المدة غير متاحة");
  });

  it("routes resume and review to existing lesson engines", () => {
    expect(resumeHref("abc")).toBe("/lesson/abc");
    expect(reviewHref("abc")).toBe("/lesson/abc/map");
    expect(canReview(null, item())).toBe(true);
    const detail = {
      session: item(),
      material: { materialId: "m1", title: "حالات المادة", pageNumber: 38 },
      activities: [],
      answers: { questionCount: 0, answeredCount: 0, correctCount: 0, incorrectCount: 0, accuracy: null },
      concepts: [{ conceptId: "c1", name: "التكاثف", masteryScore: 50, masteryLabel: "يحتاج مراجعة", status: "review", review: true }],
      adaptations: [],
      recommendation: null,
      pulse: null,
    } satisfies HistorySessionDetail;
    expect(reviewActionLabel(detail)).toBe("راجع التكاثف الآن");
  });

  it("builds a parameterized list query", () => {
    expect(historyListPath({ page: 1, pageSize: 20, filter: "needs_review", search: "الماء" })).toContain(
      "filter=needs_review",
    );
    expect(historyListPath({ search: "الماء" })).toContain(encodeURIComponent("الماء"));
  });

  it("announces loading and selection for assistive tech", () => {
    expect(historyLiveMessage({ loading: true, error: null })).toContain("تحميل");
    expect(historyLiveMessage({ loading: false, error: "تعذر تحميل سجل التعلم." })).toBe("تعذر تحميل سجل التعلم.");
    expect(historyLiveMessage({ loading: false, error: null, selectedTitle: "درس" })).toContain("درس");
  });
});
