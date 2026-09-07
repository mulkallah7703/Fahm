import { Link } from "react-router-dom";
import { Button } from "../common/Button";

interface Props {
  title: string;
  progressLabel: string;
  materialId: string;
  onOpenMenu: () => void;
}

export function AssessmentHeader({ title, progressLabel, materialId, onOpenMenu }: Props) {
  return (
    <header className="lesson-header">
      <div>
        <Button className="menu-toggle" variant="ghost" type="button" onClick={onOpenMenu}>
          القائمة
        </Button>
        <div className="mode-chip">VERIFY UNDERSTANDING</div>
        <h1>اختبار الفهم</h1>
        <p className="lesson-meta">{`${title} · ${progressLabel}`}</p>
      </div>
      <Link className="btn btn-ghost" to={`/lesson/${materialId}/mode`}>
        تغيير الوضع
      </Link>
    </header>
  );
}
