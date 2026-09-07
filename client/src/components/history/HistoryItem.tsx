import type { HistoryListItem } from "../../types";
import { indicatorClass, indicatorText, itemMeta, itemTitle } from "./historyView";

interface Props {
  item: HistoryListItem;
  selected: boolean;
  onSelect: (sessionId: string) => void;
}

export function HistoryItem({ item, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      className="history-item"
      aria-current={selected ? "true" : undefined}
      aria-label={`${itemTitle(item)}. ${itemMeta(item)}. ${indicatorText(item)}`}
      onClick={() => onSelect(item.sessionId)}
    >
      <div>
        <h3>{itemTitle(item)}</h3>
        <p>{itemMeta(item)}</p>
        <span className="sr-only">{indicatorText(item)}</span>
      </div>
      <div className="history-item-side">
        <div className="history-dots" aria-hidden="true">
          {item.indicators.length > 0
            ? item.indicators.map((dot) => (
                <span key={dot.conceptId} className={`history-dot ${indicatorClass(dot.status)}`} />
              ))
            : item.needsReview
              ? <span className="history-dot warn" />
              : <span className="history-dot dim" />}
        </div>
        <span className="history-thumb" aria-hidden="true" />
      </div>
    </button>
  );
}
