import { useMemo, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { KnowledgeMapDto } from "../../types";
import { accessibleNodeLabel, statusMeta } from "./mapView";

interface Props {
  data: KnowledgeMapDto;
  selectedId: string | null;
  scale: number;
  onSelect: (conceptId: string) => void;
}

export function MapCanvas({ data, selectedId, scale, onSelect }: Props) {
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const ordered = useMemo(
    () => [...data.nodes].sort((left, right) => left.x - right.x || left.y - right.y),
    [data.nodes],
  );
  const width = Math.max(720, ...data.nodes.map((item) => item.x + 180), 1);
  const height = Math.max(520, ...data.nodes.map((item) => item.y + 90), 1);

  const move = (currentId: string, key: string) => {
    const index = ordered.findIndex((item) => item.conceptId === currentId);
    if (index < 0) return;
    let next = index;
    if (key === "ArrowLeft" || key === "ArrowDown") next = Math.min(ordered.length - 1, index + 1);
    if (key === "ArrowRight" || key === "ArrowUp") next = Math.max(0, index - 1);
    const target = ordered[next];
    if (target) buttons.current[target.conceptId]?.focus();
  };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, conceptId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(conceptId);
      return;
    }
    if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      move(conceptId, event.key);
    }
  };

  return (
    <div className="map-canvas" style={{ transform: `scale(${scale})` }}>
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        {data.edges.map((edge) => {
          const from = data.nodes.find((item) => item.conceptId === edge.sourceConceptId);
          const to = data.nodes.find((item) => item.conceptId === edge.targetConceptId);
          if (!from || !to) return null;
          return (
            <line
              key={edge.id}
              x1={from.x + 66}
              y1={from.y + 24}
              x2={to.x + 66}
              y2={to.y + 24}
              stroke="rgba(154, 151, 171, 0.45)"
              strokeWidth="2"
            />
          );
        })}
      </svg>
      {data.nodes.map((node) => {
        const meta = statusMeta(node.status);
        return (
          <button
            key={node.conceptId}
            ref={(el) => {
              buttons.current[node.conceptId] = el;
            }}
            type="button"
            className={`map-node ${meta.className}${selectedId === node.conceptId ? " selected" : ""}${node.isCurrent ? " current" : ""}`}
            style={{ left: node.x, top: node.y }}
            aria-label={accessibleNodeLabel(node, data.edges, data.nodes)}
            aria-current={selectedId === node.conceptId ? "true" : undefined}
            aria-describedby={`map-status-${node.conceptId}`}
            onClick={() => onSelect(node.conceptId)}
            onKeyDown={(event) => onKey(event, node.conceptId)}
          >
            <span aria-hidden="true">{meta.icon} {node.label}</span>
            <small id={`map-status-${node.conceptId}`}>
              {node.label} — {node.masteryBand}
              {node.isCurrent ? " · الحالي" : ""}
              {node.adapted ? " · تم تكييف الشرح" : ""}
            </small>
          </button>
        );
      })}
    </div>
  );
}
