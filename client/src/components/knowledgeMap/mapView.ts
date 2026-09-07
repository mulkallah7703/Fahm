import type {
  KnowledgeMapConceptDetail,
  KnowledgeMapDto,
  KnowledgeMapEdge,
  KnowledgeMapNode,
  MapFilter,
  MapNodeStatus,
} from "../../types";

export const STATUS_META: Record<
  MapNodeStatus,
  { icon: string; shape: string; label: string; className: string }
> = {
  strong: { icon: "●", shape: "دائرة ممتلئة", label: "مفهوم", className: "status-strong" },
  good: { icon: "●", shape: "دائرة ممتلئة", label: "فهم جيد", className: "status-good" },
  review: { icon: "▲", shape: "مثلث", label: "يحتاج مراجعة", className: "status-review" },
  extra: { icon: "■", shape: "مربع", label: "شرح إضافي", className: "status-extra" },
  unassessed: { icon: "○", shape: "دائرة فارغة", label: "لم يُقَيَّم بعد", className: "status-unassessed" },
};

export function statusMeta(status: MapNodeStatus) {
  return STATUS_META[status];
}

export function filterNodes(nodes: KnowledgeMapNode[], filter: MapFilter): KnowledgeMapNode[] {
  if (filter === "all") return nodes;
  if (filter === "current") return nodes.filter((item) => item.isCurrent);
  if (filter === "review") return nodes.filter((item) => item.status === "review" || item.isReviewRecommended);
  if (filter === "strong") return nodes.filter((item) => item.status === "strong" || item.status === "good");
  return nodes.filter((item) => item.status === filter);
}

export function relatedNames(node: KnowledgeMapNode, edges: KnowledgeMapEdge[], nodes: KnowledgeMapNode[]): string[] {
  const names = new Map(nodes.map((item) => [item.conceptId, item.label]));
  return edges
    .filter((edge) => edge.sourceConceptId === node.conceptId || edge.targetConceptId === node.conceptId)
    .map((edge) =>
      edge.sourceConceptId === node.conceptId
        ? names.get(edge.targetConceptId)
        : names.get(edge.sourceConceptId),
    )
    .filter((name): name is string => Boolean(name));
}

export function accessibleNodeLabel(
  node: KnowledgeMapNode,
  edges: KnowledgeMapEdge[],
  nodes: KnowledgeMapNode[],
): string {
  const related = relatedNames(node, edges, nodes);
  const current = node.isCurrent ? "، المفهوم الحالي في الدرس" : "";
  const adapted = node.adapted ? "، تم تكييف الشرح" : "";
  const links = related.length ? `، مرتبط بـ ${related.join(" و ")}` : "، بلا علاقات محفوظة";
  return `${node.label}، ${node.masteryBand}${current}${adapted}${links}`;
}

export function mapNarration(data: KnowledgeMapDto): string {
  if (data.nodes.length === 0) {
    return `${data.emptyMessage ?? "لم تُبنَ خريطة معرفية كافية بعد."} ${data.emptyHint ?? ""}`.trim();
  }
  const lines = data.nodes.map((node, index) => {
    const related = relatedNames(node, data.edges, data.nodes);
    const links = related.length ? `يرتبط بـ ${related.join(" و ")}` : "لا توجد علاقات محفوظة";
    return `${index + 1}. ${node.label}. ${links}. حالتك: ${node.masteryBand}.`;
  });
  const rec = data.recommendation ? ` ابدأ بهذا المفهوم: ${data.recommendation.reason}.` : "";
  return `المفاهيم في هذه الخريطة:\n${lines.join("\n")}${rec}`;
}

export function detailOf(data: KnowledgeMapDto, conceptId: string | null): KnowledgeMapConceptDetail | null {
  if (!conceptId) return null;
  return data.details.find((item) => item.conceptId === conceptId) ?? null;
}

export function actionSessionId(data: KnowledgeMapDto, conceptId: string | null): string | null {
  const node = data.nodes.find((item) => item.conceptId === conceptId);
  return node?.sessionId ?? data.scope.sessionId;
}

export function canExplain(data: KnowledgeMapDto, conceptId: string | null): boolean {
  return Boolean(actionSessionId(data, conceptId));
}

export function canAsk(data: KnowledgeMapDto, conceptId: string | null): boolean {
  return Boolean(actionSessionId(data, conceptId));
}

export function canTest(data: KnowledgeMapDto, conceptId: string | null): boolean {
  return Boolean(actionSessionId(data, conceptId) && data.nodes.length > 0);
}

export function statsLabel(data: KnowledgeMapDto): string {
  return `${data.stats.conceptCount} مفاهيم · ${data.stats.relationshipCount} علاقات`;
}

export function relationshipLine(item: KnowledgeMapConceptDetail["relationships"][number]): string {
  return `${item.type}: ${item.name}`;
}

export function sortReview(nodes: KnowledgeMapNode[]): KnowledgeMapNode[] {
  return [...nodes].sort((left, right) => {
    const rank = (node: KnowledgeMapNode) => {
      if (node.status === "extra") return 0;
      if (node.status === "review") return 1;
      if (node.status === "unassessed") return 2;
      return 3;
    };
    return rank(left) - rank(right) || left.importance - right.importance || left.label.localeCompare(right.label, "ar");
  });
}
