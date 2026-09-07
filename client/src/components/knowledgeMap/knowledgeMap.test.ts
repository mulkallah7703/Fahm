import { describe, expect, it } from "vitest";
import type { KnowledgeMapDto, KnowledgeMapNode } from "../../types";
import {
  accessibleNodeLabel,
  canAsk,
  canExplain,
  canTest,
  filterNodes,
  mapNarration,
  relationshipLine,
  statsLabel,
  statusMeta,
} from "./mapView";

function node(partial: Partial<KnowledgeMapNode> & Pick<KnowledgeMapNode, "conceptId" | "label">): KnowledgeMapNode {
  return {
    id: partial.conceptId,
    description: null,
    masteryScore: null,
    masteryBand: "لم يُقَيَّم بعد",
    status: "unassessed",
    importance: 10,
    isCurrent: false,
    isReviewRecommended: false,
    adapted: false,
    relationshipCount: 0,
    sessionId: "s1",
    group: "درس",
    x: 90,
    y: 80,
    ...partial,
  };
}

function data(nodes: KnowledgeMapNode[], edges: KnowledgeMapDto["edges"] = []): KnowledgeMapDto {
  return {
    scope: {
      type: "session",
      sessionId: "s1",
      materialId: "m1",
      title: "درس",
      pageNumber: 1,
      modeCode: "adaptive",
    },
    presentation: { blind: false, dyslexia: true, focus: true, simplified: false, fontSize: 18, lineSpacing: 1.8 },
    nodes,
    edges,
    details: [],
    stats: {
      conceptCount: nodes.length,
      relationshipCount: edges.length,
      reviewCount: nodes.filter((item) => item.status === "review").length,
      extraCount: nodes.filter((item) => item.status === "extra").length,
      unassessedCount: nodes.filter((item) => item.status === "unassessed").length,
    },
    selectedConceptId: null,
    recommendation: { conceptId: "c2", label: "ب", reason: "ب — يحتاج مراجعة" },
    pulse: { reviewCount: 1, extraCount: 0 },
    emptyMessage: nodes.length ? null : "لم تُبنَ خريطة معرفية كافية بعد.",
    emptyHint: nodes.length ? null : "ابدأ درسًا أو أجب عن أسئلة لتظهر العلاقات ومستوى فهمك هنا.",
    preferredView: null,
    navigateTo: null,
  };
}

describe("knowledge map view model", () => {
  const nodes = [
    node({ conceptId: "c1", label: "أ", status: "strong", masteryBand: "مفهوم", masteryScore: 90 }),
    node({ conceptId: "c2", label: "ب", status: "review", masteryBand: "يحتاج مراجعة", isReviewRecommended: true }),
    node({ conceptId: "c3", label: "ج", status: "extra", masteryBand: "شرح إضافي", isCurrent: true }),
  ];
  const edges = [
    { id: "r1", sourceConceptId: "c1", targetConceptId: "c2", relationshipType: "يؤدي إلى", label: "يؤدي إلى", strength: 80 },
  ];

  it("filters by real status without inventing nodes", () => {
    expect(filterNodes(nodes, "review").map((item) => item.label)).toEqual(["ب"]);
    expect(filterNodes(nodes, "strong").map((item) => item.label)).toEqual(["أ"]);
    expect(filterNodes(nodes, "current").map((item) => item.label)).toEqual(["ج"]);
    expect(filterNodes(nodes, "all")).toHaveLength(3);
  });

  it("builds an accessible label with text status and relationships", () => {
    const label = accessibleNodeLabel(nodes[1]!, edges, nodes);
    expect(label).toContain("ب");
    expect(label).toContain("يحتاج مراجعة");
    expect(label).toContain("أ");
  });

  it("narrates a blind-compatible map", () => {
    const text = mapNarration(data(nodes, edges));
    expect(text).toContain("المفاهيم في هذه الخريطة");
    expect(text).toContain("حالتك: يحتاج مراجعة");
    expect(text).toContain("ابدأ بهذا المفهوم");
  });

  it("shows empty narration without fake concepts", () => {
    expect(mapNarration(data([]))).toContain("لم تُبنَ خريطة معرفية");
  });

  it("exposes zoom labels and status shapes", () => {
    expect(statusMeta("review")).toMatchObject({ icon: "▲", label: "يحتاج مراجعة", shape: "مثلث" });
    expect(statusMeta("unassessed").label).toBe("لم يُقَيَّم بعد");
    expect(relationshipLine({ direction: "from", type: "يؤدي إلى", name: "ب" })).toBe("يؤدي إلى: ب");
    expect(statsLabel(data(nodes, edges))).toBe("3 مفاهيم · 1 علاقات");
  });

  it("enables only functional actions", () => {
    const ready = data(nodes, edges);
    expect(canExplain(ready, "c1")).toBe(true);
    expect(canAsk(ready, "c1")).toBe(true);
    expect(canTest(ready, "c1")).toBe(true);
    const orphan = data([node({ conceptId: "c9", label: "يتيم", sessionId: null })]);
    orphan.scope.sessionId = null;
    expect(canExplain(orphan, "c9")).toBe(false);
    expect(canAsk(orphan, "c9")).toBe(false);
  });

  it("keeps dyslexia presentation values from the server", () => {
    expect(data(nodes).presentation.dyslexia).toBe(true);
    expect(data(nodes).presentation.fontSize).toBe(18);
    expect(data(nodes).presentation.focus).toBe(true);
  });
});
