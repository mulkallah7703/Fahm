import { Button } from "../common/Button";
import type { PageAnalysis } from "../../types";

interface Props {
  analysis: PageAnalysis;
  onReanalyze: () => void;
  onChooseMode: () => void;
  onOpenMenu: () => void;
  busy: boolean;
}

export function AnalysisHeader({
  analysis,
  onReanalyze,
  onChooseMode,
  onOpenMenu,
  busy,
}: Props) {
  const subtitle = subtitleFor(analysis);

  return (
    <header className="analysis-header">
      <div>
        <Button className="menu-toggle" variant="ghost" type="button" onClick={onOpenMenu}>
          القائمة
        </Button>
        <h1>تحليل الصفحة</h1>
        <p className="analysis-sub">{subtitle}</p>
      </div>
      <div className="analysis-actions">
        <span className="word-pill" aria-label="عدد الكلمات المستخرجة">
          {analysis.wordCount} كلمة
        </span>
        <Button variant="ghost" type="button" onClick={onChooseMode}>
          اختر طريقة الشرح
        </Button>
        <Button variant="ghost" type="button" onClick={onReanalyze} disabled={busy}>
          أعد التحليل
        </Button>
      </div>
    </header>
  );
}

function subtitleFor(analysis: PageAnalysis): string {
  if (analysis.status === "failed") return "تعذر إكمال التحليل.";
  if (analysis.status === "completed" && analysis.processingTimeMs !== null) {
    const seconds = Math.max(0.1, analysis.processingTimeMs / 1000).toFixed(1);
    return `Content understanding · اكتمل التحليل خلال ${seconds} ثانية`;
  }
  if (analysis.status === "pending") return "Content understanding · بانتظار التحليل";
  return "Content understanding · جاري تحليل الصفحة...";
}
