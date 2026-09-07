import { FOCUS_VISIBLE_MAX } from "../../config/knowledgeMap.js";
import { MASTERY_WEIGHTS } from "../../config/learningPulse.js";
import type { RelationshipDetailRow } from "../../repositories/conceptRepository.js";
import type { MasteryRow } from "../../types/index.js";
import type {
  KnowledgeMapConceptDetail,
  KnowledgeMapDto,
  KnowledgeMapEdge,
  KnowledgeMapNode,
  MapMasteryBand,
  MapNodeStatus,
} from "../../types/knowledgeMap.js";
import { masteryLabel } from "../teaching/assessmentPlanner.js";

export interface MapConceptInput {
  conceptId: string;
  name: string;
  description: string | null;
  importance: number;
  sessionId: string | null;
  group: string | null;
}

export interface BuildMapInput {
  scope: KnowledgeMapDto["scope"];
  presentation: KnowledgeMapDto["presentation"];
  concepts: MapConceptInput[];
  relationships: RelationshipDetailRow[];
  mastery: MasteryRow[];
  adaptedIds: Set<string>;
  currentConceptId: string | null;
  selectedConceptId: string | null;
  preferredView?: KnowledgeMapDto["preferredView"];
  navigateTo?: string | null;
}

export function bandFor(row: MasteryRow | undefined): {
  band: MapMasteryBand;
  status: MapNodeStatus;
  score: number | null;
  review: boolean;
} {
  if (!row || (row.attemptsCount ?? 0) === 0) {
    return { band: "لم يُقَيَّم بعد", status: "unassessed", score: null, review: false };
  }
  const label = masteryLabel(row.masteryScore, row.masteryStatus);
  if (label === "مفهوم") return { band: label, status: "strong", score: row.masteryScore, review: false };
  if (label === "فهم جيد") return { band: label, status: "good", score: row.masteryScore, review: false };
  if (label === "شرح إضافي") return { band: label, status: "extra", score: row.masteryScore, review: true };
  return {
    band: "يحتاج مراجعة",
    status: "review",
    score: row.masteryScore,
    review: row.masteryScore <= MASTERY_WEIGHTS.reviewScoreMax,
  };
}

export function realEdges(conceptIds: Set<string>, rows: RelationshipDetailRow[]): KnowledgeMapEdge[] {
  const seen = new Set<string>();
  const edges: KnowledgeMapEdge[] = [];
  const sorted = [...rows].sort((left, right) => left.relationshipId.localeCompare(right.relationshipId));
  for (const row of sorted) {
    if (!conceptIds.has(row.sourceConceptId) || !conceptIds.has(row.targetConceptId)) continue;
    if (row.sourceConceptId === row.targetConceptId) continue;
    const key = `${row.sourceConceptId}|${row.targetConceptId}|${row.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({
      id: row.relationshipId,
      sourceConceptId: row.sourceConceptId,
      targetConceptId: row.targetConceptId,
      relationshipType: row.type,
      label: row.type,
      strength: row.confidenceScore,
    });
  }
  return edges;
}

export function layoutPositions(
  ids: string[],
  edges: Array<{ source: string; target: string }>,
): Map<string, { x: number; y: number }> {
  const ordered = [...ids].sort((left, right) => left.localeCompare(right));
  const incoming = new Map(ordered.map((id) => [id, 0]));
  const outgoing = new Map(ordered.map((id) => [id, [] as string[]]));
  const sortedEdges = [...edges].sort((left, right) =>
    `${left.source}${left.target}`.localeCompare(`${right.source}${right.target}`),
  );
  for (const edge of sortedEdges) {
    if (!incoming.has(edge.source) || !incoming.has(edge.target)) continue;
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.get(edge.source)?.push(edge.target);
  }
  for (const list of outgoing.values()) list.sort((left, right) => left.localeCompare(right));

  const layers: string[][] = [];
  const remaining = new Set(ordered);
  let frontier = ordered.filter((id) => (incoming.get(id) ?? 0) === 0);
  if (frontier.length === 0 && ordered[0]) frontier = [ordered[0]];

  while (remaining.size > 0 && layers.length <= ordered.length) {
    const layer = frontier.filter((id) => remaining.has(id)).sort((left, right) => left.localeCompare(right));
    if (layer.length === 0) {
      const next = [...remaining].sort((left, right) => left.localeCompare(right))[0];
      if (!next) break;
      layers.push([next]);
      remaining.delete(next);
      frontier = [...remaining];
      continue;
    }
    layers.push(layer);
    for (const id of layer) remaining.delete(id);
    const next = new Set<string>();
    for (const id of layer) {
      for (const child of outgoing.get(id) ?? []) {
        if (remaining.has(child)) next.add(child);
      }
    }
    frontier = next.size ? [...next] : [...remaining];
  }

  const positions = new Map<string, { x: number; y: number }>();
  layers.forEach((layer, column) => {
    layer.forEach((id, row) => {
      positions.set(id, { x: 90 + column * 220, y: 80 + row * 108 });
    });
  });
  return positions;
}

export function recommendConcept(
  nodes: KnowledgeMapNode[],
  mastery: MasteryRow[],
  edges: KnowledgeMapEdge[],
): { conceptId: string; label: string; reason: string } | null {
  if (nodes.length === 0) return null;
  const byId = new Map(mastery.map((row) => [row.conceptId, row]));
  const weakIds = new Set(nodes.filter((item) => item.isReviewRecommended).map((item) => item.conceptId));
  const scored = nodes
    .map((node) => {
      const row = byId.get(node.conceptId);
      let score = node.importance / 100;
      let supported = false;
      if ((row?.incorrectAnswers ?? 0) >= 2) {
        score += 80;
        supported = true;
      }
      if (node.status === "extra") {
        score += 60;
        supported = true;
      }
      if (node.status === "review") {
        score += 50;
        supported = true;
      }
      const linkedWeak = edges.some(
        (edge) =>
          (edge.sourceConceptId === node.conceptId || edge.targetConceptId === node.conceptId) &&
          (weakIds.has(edge.sourceConceptId) || weakIds.has(edge.targetConceptId)),
      );
      if (linkedWeak && node.status !== "strong") {
        score += 20;
        supported = node.status !== "good" || supported;
      }
      if (node.adapted && node.status !== "strong") {
        score += 15;
        supported = true;
      }
      if ((row?.explanationCount ?? 0) > 0 && node.isReviewRecommended) {
        score += 10;
        supported = true;
      }
      if (node.status === "unassessed") {
        score += 8;
        supported = true;
      }
      return { node, score, supported };
    })
    .filter((item) => item.supported);

  if (scored.length === 0) return null;
  scored.sort((left, right) => right.score - left.score || left.node.conceptId.localeCompare(right.node.conceptId));
  const top = scored[0]?.node;
  if (!top) return null;
  return { conceptId: top.conceptId, label: top.label, reason: `${top.label} — ${top.masteryBand}` };
}

export function insightFor(row: MasteryRow | undefined, name: string, adapted: boolean): string | null {
  if (!row || row.attemptsCount === 0) {
    return `لم نملك أدلة كافية لتحديد مستوى فهمك في «${name}» بعد.`;
  }
  if ((row.incorrectAnswers ?? 0) >= 2) {
    return `أجبت بشكل غير صحيح أكثر من مرة على «${name}». هذه الفكرة تحتاج مراجعة.`;
  }
  if (row.masteryScore <= 39) return `يبدو أن «${name}» تحتاج شرحًا إضافيًا.`;
  if (row.masteryScore <= MASTERY_WEIGHTS.reviewScoreMax) return `لاحظ فَهْم أن «${name}» تحتاج مراجعة.`;
  if (adapted) return `تم تكييف شرح «${name}» بناءً على تفاعلك.`;
  if (row.masteryScore >= 70) return `أظهرت فهمًا جيدًا لمفهوم «${name}».`;
  return null;
}

export function simplifyForFocus(
  nodes: KnowledgeMapNode[],
  currentConceptId: string | null,
  max = FOCUS_VISIBLE_MAX,
): Set<string> {
  if (nodes.length <= max) return new Set(nodes.map((item) => item.conceptId));
  const ranked = [...nodes].sort((left, right) => {
    const rank = (node: KnowledgeMapNode) => {
      if (currentConceptId && node.conceptId === currentConceptId) return 100;
      if (node.isCurrent) return 90;
      if (node.status === "extra") return 80;
      if (node.status === "review") return 70;
      if (node.status === "unassessed") return 40;
      return node.importance;
    };
    return rank(right) - rank(left) || right.importance - left.importance || left.conceptId.localeCompare(right.conceptId);
  });
  return new Set(ranked.slice(0, max).map((item) => item.conceptId));
}

export function emptyCopy(
  scopeType: "session" | "student",
  conceptCount: number,
  relationshipCount: number,
): { message: string | null; hint: string | null } {
  if (conceptCount === 0) {
    if (scopeType === "student") {
      return {
        message: "لم تُبنَ خريطة معرفية كافية بعد.",
        hint: "ابدأ درسًا أو أجب عن أسئلة لتظهر العلاقات ومستوى فهمك هنا.",
      };
    }
    return {
      message: "لم تُستخرج مفاهيم من هذه الصفحة بعد.",
      hint: "ابدأ درسًا لإنشاء خريطة معرفية مرتبطة بتعلمك.",
    };
  }
  if (relationshipCount === 0) {
    return {
      message: "المفاهيم موجودة، لكن لا توجد علاقات محفوظة بينها حتى الآن.",
      hint: null,
    };
  }
  return { message: null, hint: null };
}

export function detailFor(
  node: KnowledgeMapNode,
  edges: KnowledgeMapEdge[],
  nodes: KnowledgeMapNode[],
  row: MasteryRow | undefined,
): KnowledgeMapConceptDetail {
  const names = new Map(nodes.map((item) => [item.conceptId, item.label]));
  const relationships = edges
    .filter((edge) => edge.sourceConceptId === node.conceptId || edge.targetConceptId === node.conceptId)
    .map((edge) =>
      edge.sourceConceptId === node.conceptId
        ? { direction: "from" as const, type: edge.label, name: names.get(edge.targetConceptId) ?? "" }
        : { direction: "to" as const, type: edge.label, name: names.get(edge.sourceConceptId) ?? "" },
    )
    .filter((item) => item.name);
  const assessed = Boolean(row && row.attemptsCount > 0);
  return {
    conceptId: node.conceptId,
    name: node.label,
    description: node.description,
    masteryBand: node.masteryBand,
    insight: insightFor(row, node.label, node.adapted),
    relationships,
    attempts: assessed ? row?.attemptsCount ?? null : null,
    correct: assessed ? row?.correctAnswers ?? null : null,
    incorrect: assessed ? row?.incorrectAnswers ?? null : null,
    explanationCount: assessed ? row?.explanationCount ?? null : null,
    adapted: node.adapted,
  };
}

export function buildKnowledgeMap(input: BuildMapInput): KnowledgeMapDto {
  const conceptIds = new Set(input.concepts.map((item) => item.conceptId));
  const edges = realEdges(conceptIds, input.relationships);
  const byMastery = new Map(input.mastery.map((row) => [row.conceptId, row]));
  const counts = new Map<string, number>();
  for (const edge of edges) {
    counts.set(edge.sourceConceptId, (counts.get(edge.sourceConceptId) ?? 0) + 1);
    counts.set(edge.targetConceptId, (counts.get(edge.targetConceptId) ?? 0) + 1);
  }
  const positions = layoutPositions(
    input.concepts.map((item) => item.conceptId),
    edges.map((edge) => ({ source: edge.sourceConceptId, target: edge.targetConceptId })),
  );

  const allNodes: KnowledgeMapNode[] = [...input.concepts]
    .sort((left, right) => left.conceptId.localeCompare(right.conceptId))
    .map((concept) => {
      const mastery = byMastery.get(concept.conceptId);
      const band = bandFor(mastery);
      const point = positions.get(concept.conceptId) ?? { x: 90, y: 80 };
      return {
        id: concept.conceptId,
        conceptId: concept.conceptId,
        label: concept.name,
        description: concept.description,
        masteryScore: band.score,
        masteryBand: band.band,
        status: band.status,
        importance: concept.importance,
        isCurrent: Boolean(input.currentConceptId && concept.conceptId === input.currentConceptId),
        isReviewRecommended: band.review,
        adapted: input.adaptedIds.has(concept.conceptId),
        relationshipCount: counts.get(concept.conceptId) ?? 0,
        sessionId: concept.sessionId,
        group: concept.group,
        x: point.x,
        y: point.y,
      };
    });

  const stats = {
    conceptCount: allNodes.length,
    relationshipCount: edges.length,
    reviewCount: allNodes.filter((item) => item.status === "review").length,
    extraCount: allNodes.filter((item) => item.status === "extra").length,
    unassessedCount: allNodes.filter((item) => item.status === "unassessed").length,
  };

  let nodes = allNodes;
  let visibleEdges = edges;
  let simplified = false;
  if (input.presentation.focus && allNodes.length > FOCUS_VISIBLE_MAX) {
    const visible = simplifyForFocus(allNodes, input.currentConceptId);
    if (input.selectedConceptId) visible.add(input.selectedConceptId);
    nodes = allNodes.filter((item) => visible.has(item.conceptId));
    visibleEdges = edges.filter(
      (edge) => visible.has(edge.sourceConceptId) && visible.has(edge.targetConceptId),
    );
    simplified = true;
  }

  const empty = emptyCopy(input.scope.type, stats.conceptCount, stats.relationshipCount);
  const selected =
    input.selectedConceptId && nodes.some((item) => item.conceptId === input.selectedConceptId)
      ? input.selectedConceptId
      : nodes.find((item) => item.isCurrent)?.conceptId ?? null;

  return {
    scope: input.scope,
    presentation: { ...input.presentation, simplified },
    nodes,
    edges: visibleEdges,
    details: allNodes.map((node) => detailFor(node, edges, allNodes, byMastery.get(node.conceptId))),
    stats,
    selectedConceptId: selected,
    recommendation: recommendConcept(allNodes, input.mastery, edges),
    pulse:
      stats.reviewCount + stats.extraCount > 0
        ? { reviewCount: stats.reviewCount, extraCount: stats.extraCount }
        : null,
    emptyMessage: empty.message,
    emptyHint: empty.hint,
    preferredView: input.preferredView ?? null,
    navigateTo: input.navigateTo ?? null,
  };
}
