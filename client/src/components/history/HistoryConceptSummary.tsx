import type { HistoryConceptSummary as Concept } from "../../types";
import { indicatorClass } from "./historyView";

interface Props {
  concepts: Concept[];
}

export function HistoryConceptSummary({ concepts }: Props) {
  if (concepts.length === 0) {
    return <p className="muted">لا توجد مفاهيم مرتبطة بهذه الجلسة.</p>;
  }
  return (
    <ul className="history-result">
      {concepts.map((item) => (
        <li key={item.conceptId} className="history-concept">
          <span className="history-concept-label">
            <span className={`history-dot ${indicatorClass(item.status)}`} aria-hidden="true" />
            {item.name}
          </span>
          <span>{item.masteryLabel}</span>
        </li>
      ))}
    </ul>
  );
}
