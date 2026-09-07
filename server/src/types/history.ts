import type { RecentLesson } from "./index.js";

export type HistoryFilter = "all" | "needs_review";

export interface HistoryQuery {
  page: number;
  pageSize: number;
  offset: number;
  search: string;
  filter: HistoryFilter;
}

export interface HistoryIndicator {
  conceptId: string;
  name: string;
  status: "strong" | "good" | "review" | "extra" | "unassessed";
  label: string;
}

export interface HistoryListItem extends RecentLesson {
  id: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  mode: string | null;
  variant: string | null;
  variantLabel: string | null;
  progress: number | null;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  needsReview: boolean;
  indicators: HistoryIndicator[];
}

export interface HistoryListResult {
  items: HistoryListItem[];
  total: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  };
}

export interface HistoryActivity {
  id: string;
  type: string;
  label: string;
  at: string;
  conceptName: string | null;
}

export interface HistoryAnswerSummary {
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number | null;
}

export interface HistoryConceptSummary {
  conceptId: string;
  name: string;
  masteryScore: number | null;
  masteryLabel: string;
  status: HistoryIndicator["status"];
  review: boolean;
}

export interface HistoryAdaptation {
  fromLabel: string | null;
  toLabel: string | null;
  reason: string;
  at: string;
  conceptName: string | null;
}

export interface HistorySessionDetail {
  session: HistoryListItem;
  material: {
    materialId: string | null;
    title: string;
    pageNumber: number | null;
  };
  activities: HistoryActivity[];
  answers: HistoryAnswerSummary;
  concepts: HistoryConceptSummary[];
  adaptations: HistoryAdaptation[];
  recommendation: string | null;
  pulse: { score: number; status: string } | null;
}
