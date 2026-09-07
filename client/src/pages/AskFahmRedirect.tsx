import { useEffect } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "../components/common/Button";
import { ErrorState } from "../components/common/ErrorState";
import { Skeleton } from "../components/common/Skeleton";
import { useDashboard } from "../hooks/useDashboard";
import "../components/common/common.css";

interface ShellContext {
  openMenu: () => void;
}

export function AskFahmRedirect() {
  const { openMenu } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useDashboard();
  const target = data?.continueLearning?.sessionId ?? data?.recentLessons[0]?.sessionId ?? null;

  useEffect(() => {
    if (target) navigate(`/lesson/${target}/ask`, { replace: true });
  }, [navigate, target]);

  if (loading || target) {
    return (
      <div>
        <Skeleton height="36px" width="220px" />
        <p className="muted">جاري فتح محادثة فَهْم المرتبطة بدرسك...</p>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void reload()} />;
  }

  return (
    <main lang="ar" dir="rtl">
      <Button className="menu-toggle" variant="ghost" type="button" onClick={openMenu}>
        القائمة
      </Button>
      <p className="mode-chip">ASK FAHM</p>
      <h1>اسأل فَهْم</h1>
      <p>ابدأ درسًا أولًا حتى يرتبط فَهْم بصفحة حقيقية.</p>
      <Link className="btn btn-primary" to="/lesson">
        ابدأ درسًا
      </Link>
    </main>
  );
}
