import { Card } from "../common/Card";

interface Props {
  kicker: string;
  title: string;
  description: string;
  onClick: () => void;
}

export function QuickActionCard({ kicker, title, description, onClick }: Props) {
  return (
    <Card as="div">
      <button type="button" className="quick-card" onClick={onClick}>
        <div className="kicker">{kicker}</div>
        <h3>{title}</h3>
        <p>{description}</p>
      </button>
    </Card>
  );
}
