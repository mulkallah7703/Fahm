import { sessionCountLabel } from "./historyView";

interface Props {
  total: number;
}

export function HistoryHeader({ total }: Props) {
  return (
    <header className="history-header">
      <p className="history-kicker">LEARNING HISTORY</p>
      <h1>سجل التعلم</h1>
      <p className="history-subtitle">{sessionCountLabel(total)}</p>
    </header>
  );
}
