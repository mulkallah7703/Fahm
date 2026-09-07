import type { HistoryActivity } from "../../types";

interface Props {
  activities: HistoryActivity[];
}

export function HistoryTimeline({ activities }: Props) {
  if (activities.length === 0) {
    return <p className="muted">لا توجد أنشطة مسجّلة في هذه الجلسة.</p>;
  }
  return (
    <ol className="history-timeline">
      {activities.map((item) => (
        <li key={item.id}>
          {item.label}
          {item.conceptName ? ` — ${item.conceptName}` : ""}
        </li>
      ))}
    </ol>
  );
}
