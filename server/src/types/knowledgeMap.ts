export type MapMasteryBand = "مفهوم" | "فهم جيد" | "يحتاج مراجعة" | "شرح إضافي" | "لم يُقَيَّم بعد";

export type MapNodeStatus = "strong" | "good" | "review" | "extra" | "unassessed";

export interface KnowledgeMapNode {
  id: string;
  conceptId: string;
  label: string;
  description: string | null;
  masteryScore: number | null;
  masteryBand: MapMasteryBand;
  status: MapNodeStatus;
  importance: number;
  isCurrent: boolean;
  isReviewRecommended: boolean;
  adapted: boolean;
  relationshipCount: number;
  sessionId: string | null;
  group: string | null;
  x: number;
  y: number;
}

export interface KnowledgeMapEdge {
  id: string;
  sourceConceptId: string;
  targetConceptId: string;
  relationshipType: string;
  label: string;
  strength: number | null;
}

export interface KnowledgeMapConceptDetail {
  conceptId: string;
  name: string;
  description: string | null;
  masteryBand: MapMasteryBand;
  insight: string | null;
  relationships: { direction: "from" | "to"; type: string; name: string }[];
  attempts: number | null;
  correct: number | null;
  incorrect: number | null;
  explanationCount: number | null;
  adapted: boolean;
}

export interface KnowledgeMapDto {
  scope: {
    type: "session" | "student";
    sessionId: string | null;
    materialId: string | null;
    title: string;
    pageNumber: number | null;
    modeCode: string | null;
  };
  presentation: {
    blind: boolean;
    dyslexia: boolean;
    focus: boolean;
    simplified: boolean;
    fontSize: number | null;
    lineSpacing: number | null;
  };
  nodes: KnowledgeMapNode[];
  edges: KnowledgeMapEdge[];
  details: KnowledgeMapConceptDetail[];
  stats: {
    conceptCount: number;
    relationshipCount: number;
    reviewCount: number;
    extraCount: number;
    unassessedCount: number;
  };
  selectedConceptId: string | null;
  recommendation: { conceptId: string; label: string; reason: string } | null;
  pulse: { reviewCount: number; extraCount: number } | null;
  emptyMessage: string | null;
  emptyHint: string | null;
  preferredView: "map" | "list" | "review" | null;
  navigateTo: string | null;
}
