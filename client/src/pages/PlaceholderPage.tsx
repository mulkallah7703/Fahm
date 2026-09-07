import { Link, useOutletContext } from "react-router-dom";
import { Button } from "../components/common/Button";
import "../components/common/common.css";

interface ShellContext {
  openMenu: () => void;
}

interface Props {
  kicker: string;
  title: string;
  description: string;
}

export function PlaceholderPage({ kicker, title, description }: Props) {
  const { openMenu } = useOutletContext<ShellContext>();
  return (
    <div className="page-placeholder">
      <Button className="menu-toggle" variant="ghost" type="button" onClick={openMenu}>
        القائمة
      </Button>
      <p className="page-kicker">{kicker}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <p>
        <Link className="btn btn-ghost" to="/">
          العودة إلى الرئيسية
        </Link>
      </p>
    </div>
  );
}
