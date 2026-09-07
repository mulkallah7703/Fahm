import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AnalysisHeader } from "../components/analysis/AnalysisHeader";
import { AnalysisPipeline } from "../components/analysis/AnalysisPipeline";
import { ConceptsCard } from "../components/analysis/ConceptsCard";
import { ExtractedTextCard } from "../components/analysis/ExtractedTextCard";
import { VisualAnalysisCard } from "../components/analysis/VisualAnalysisCard";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { ErrorState } from "../components/common/ErrorState";
import { Skeleton } from "../components/common/Skeleton";
import { useAnalysisStatus } from "../hooks/useAnalysisStatus";
import "../components/common/common.css";
import "../components/analysis/analysis.css";

interface ShellContext {
  openMenu: () => void;
}

export function PageAnalysisPage() {
  const { materialId } = useParams();
  const { openMenu } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const { data, loading, error, reanalyze, setData } = useAnalysisStatus(materialId);

  if (loading) {
    return (
      <div>
        <Skeleton height="40px" width="240px" />
        <div style={{ height: 16 }} />
        <Skeleton height="240px" />
      </div>
    );
  }

  if (!data) {
    return (
      <ErrorState
        title="لم يتم العثور على الصفحة."
        message={error ?? "تعذر تحميل التحليل."}
        onRetry={() => navigate("/lesson/new")}
      />
    );
  }

  const busy = ["ocr_processing", "vision_processing", "concept_extraction"].includes(data.status);

  const goToMode = () => navigate(`/lesson/${data.material.id}/mode`);

  return (
    <div>
      <AnalysisHeader
        analysis={data}
        onReanalyze={() => void reanalyze()}
        onChooseMode={goToMode}
        onOpenMenu={openMenu}
        busy={busy}
      />
      {error && data.status !== "failed" ? <p className="status-err">{error}</p> : null}
      <div className="analysis-page">
        <div>
          <AnalysisPipeline analysis={data} onRetry={() => void reanalyze()} />
          <ConceptsCard analysis={data} />
          <ExtractedTextCard analysis={data} onUpdated={setData} />
        </div>
        <div>
          <VisualAnalysisCard analysis={data} />
          {data.status === "completed" ? (
            <Card className="ready-note">
              <p>صفحتك جاهزة للتعلم.</p>
              <p className="muted">
                تم استخراج النص
                {data.vision ? " · تم تحليل المحتوى البصري" : ""}
                {data.concepts.length > 0 ? ` · تم اكتشاف ${data.concepts.length} مفاهيم` : ""}
                {data.relationships.length > 0 ? " · تم تحديد علاقات بين المفاهيم" : ""}
                .
              </p>
              <Button type="button" onClick={goToMode}>
                ابدأ التعلم
              </Button>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
