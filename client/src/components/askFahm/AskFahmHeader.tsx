import { Link } from "react-router-dom";
import { Button } from "../common/Button";

interface Props {
  title: string;
  pageNumber: number;
  onOpenMenu: () => void;
}

export function AskFahmHeader({ title, pageNumber, onOpenMenu }: Props) {
  return (
    <header className="lesson-header">
      <div>
        <Button className="menu-toggle" variant="ghost" type="button" onClick={onOpenMenu}>
          القائمة
        </Button>
        <div className="mode-chip">ASK FAHM</div>
        <h1>اسأل فَهْم</h1>
        <p className="lesson-meta">{`مرتبط بصفحة: ${title} — صفحة ${pageNumber}`}</p>
      </div>
      <Link className="btn btn-ghost" to="/">
        الرئيسية
      </Link>
    </header>
  );
}
