interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function HistorySearch({ value, onChange }: Props) {
  return (
    <div className="history-search">
      <label className="sr-only" htmlFor="history-search">
        ابحث في الصفحات والموضوعات
      </label>
      <input
        id="history-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="ابحث في الصفحات والموضوعات..."
        autoComplete="off"
      />
    </div>
  );
}
