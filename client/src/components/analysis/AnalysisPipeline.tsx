import { Button } from "../common/Button";
import { Card } from "../common/Card";
import type { AnalysisStage, PageAnalysis } from "../../types";

const LABELS: Record<AnalysisStage["key"], string> = {
  ocr: "OCR — استخراج النص",
  vision: "Vision — وصف الرسم والجداول",
  grade: "تصنيف المستوى الدراسي",
  concepts: "استخراج المفاهيم",
};

interface Props {
  analysis: PageAnalysis;
  onRetry: () => void;
}

export function AnalysisPipeline({ analysis, onRetry }: Props) {
  return (
    <Card className="pipeline" aria-label="ماذا استخرجت فَهْم؟">
      <h2>ماذا استخرجت فَهْم؟</h2>
      <ol className="pipeline-list">
        {analysis.stages.map((stage) => (
          <li key={stage.key} className="pipeline-item">
            <div>
              <div className="step-label">{LABELS[stage.key]}</div>
              <p className="step-msg">{stageMessage(stage)}</p>
            </div>
            <span className={`step-badge ${stage.state}`}>
              {badge(stage.state)}
            </span>
          </li>
        ))}
      </ol>
      <div className="stats-row">
        <div className="stat">
          <strong>{analysis.wordCount}</strong>
          <span>كلمة مستخرجة</span>
        </div>
        <div className="stat">
          <strong>{analysis.vision?.elements.length ?? 0}</strong>
          <span>عنصر بصري</span>
        </div>
        <div className="stat">
          <strong>
            {analysis.gradeEstimate?.gradeLevel
              ? `الصف ${analysis.gradeEstimate.gradeLevel}`
              : "غير محدد"}
          </strong>
          <span>المستوى الدراسي</span>
        </div>
        <div className="stat">
          <strong>{analysis.concepts.length}</strong>
          <span>مفاهيم</span>
        </div>
      </div>
      {analysis.gradeEstimate?.note ? (
        <p className="warning">{analysis.gradeEstimate.note}</p>
      ) : null}
      {analysis.stages.some((stage) => stage.state === "failed") ? (
        <div style={{ marginTop: 12 }}>
          <Button type="button" onClick={onRetry}>
            إعادة المحاولة
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function stageMessage(stage: AnalysisStage): string {
  if (stage.message) return stage.message;
  if (stage.state === "pending") return "قيد الانتظار";
  if (stage.state === "processing") return "جاري التنفيذ...";
  if (stage.state === "failed") return "تعذر الإكمال";
  return "تم";
}

function badge(state: AnalysisStage["state"]): string {
  if (state === "completed") return "تم ✓";
  if (state === "processing") return "● جاري التحليل";
  if (state === "failed") return "فشل";
  return "○";
}
