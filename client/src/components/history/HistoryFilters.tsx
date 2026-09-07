import type { HistoryFilter } from "../../types";

interface Props {
  value: HistoryFilter;
  onChange: (value: HistoryFilter) => void;
}

const FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "needs_review", label: "تحتاج مراجعة" },
];

export function HistoryFilters({ value, onChange }: Props) {
  return (
    <div className="history-filters" role="group" aria-label="تصفية السجل">
      {FILTERS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
