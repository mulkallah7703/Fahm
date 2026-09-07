import { Link } from "react-router-dom";
import { Button } from "../common/Button";

interface Props {
  greeting: string;
  title: string;
  onOpenMenu: () => void;
}

export function Header({ greeting, title, onOpenMenu }: Props) {
  return (
    <header className="dashboard-header">
      <Button
        className="menu-toggle"
        variant="ghost"
        type="button"
        aria-label="فتح القائمة"
        onClick={onOpenMenu}
      >
        القائمة
      </Button>
      <div>
        <p className="greeting">{greeting}</p>
        <h1 className="dashboard-heading">{title}</h1>
      </div>
      <div className="header-actions">
        <Link to="/lesson/new" className="btn btn-ghost">
          درس جديد
        </Link>
        <Link to="/settings" className="btn btn-text">
          الإعدادات
        </Link>
      </div>
    </header>
  );
}
