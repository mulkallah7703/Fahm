import type { HistoryListItem } from "../../types";
import type { HistoryGroup } from "./historyView";
import { HistoryItem } from "./HistoryItem";

interface Props {
  group: HistoryGroup;
  selectedId: string | null;
  onSelect: (sessionId: string) => void;
}

export function HistorySection({ group, selectedId, onSelect }: Props) {
  return (
    <section className="history-section" aria-labelledby={`history-${group.id}`}>
      <h2 id={`history-${group.id}`}>{group.title}</h2>
      <div className="history-list">
        {group.items.map((item: HistoryListItem) => (
          <HistoryItem
            key={item.sessionId}
            item={item}
            selected={item.sessionId === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
