import { Button } from "../common/Button";
import type { KnowledgeMapDto, KnowledgeMapNode } from "../../types";
import { canAsk, canExplain, canTest, statusMeta } from "./mapView";

interface Props {
  data: KnowledgeMapDto;
  nodes: KnowledgeMapNode[];
  selectedId: string | null;
  acting: boolean;
  onSelect: (conceptId: string) => void;
  onExplain: (conceptId: string) => void;
  onAsk: (conceptId: string) => void;
  onTest: (conceptId: string) => void;
}

export function ConceptList({
  data,
  nodes,
  selectedId,
  acting,
  onSelect,
  onExplain,
  onAsk,
  onTest,
}: Props) {
  if (nodes.length === 0) {
    return <p className="muted">لا توجد مفاهيم ضمن هذا التصفية.</p>;
  }
  return (
    <div className="map-list" role="list">
      {nodes.map((node) => {
        const meta = statusMeta(node.status);
        return (
          <article key={node.conceptId} className={`map-card ${selectedId === node.conceptId ? "selected" : ""}`} role="listitem">
            <button type="button" className="map-card" onClick={() => onSelect(node.conceptId)} aria-current={selectedId === node.conceptId}>
              {node.group ? <p className="step-kicker">{node.group}</p> : null}
              <strong>
                <span aria-hidden="true">{meta.icon} </span>
                {node.label}
              </strong>
              <p>
                {node.masteryBand}
                {node.relationshipCount ? ` · ${node.relationshipCount} علاقات` : " · بلا علاقات محفوظة"}
                {node.isReviewRecommended ? " · يحتاج مراجعة" : ""}
              </p>
            </button>
            <div className="map-card-actions">
              {canExplain(data, node.conceptId) ? (
                <Button type="button" disabled={acting} onClick={() => onExplain(node.conceptId)}>
                  شرح
                </Button>
              ) : null}
              {canAsk(data, node.conceptId) ? (
                <Button type="button" variant="ghost" disabled={acting} onClick={() => onAsk(node.conceptId)}>
                  اسأل فَهْم
                </Button>
              ) : null}
              {canTest(data, node.conceptId) ? (
                <Button type="button" variant="ghost" disabled={acting} onClick={() => onTest(node.conceptId)}>
                  اختبرني
                </Button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
