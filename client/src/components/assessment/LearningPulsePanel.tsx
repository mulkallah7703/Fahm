import { Card } from "../common/Card";
import { pulseStatusLabel } from "../../utils/format";
import type { AssessmentExperience } from "../../types";
import { ConceptEvidencePanel } from "./ConceptEvidencePanel";

interface Props {
  assessment: AssessmentExperience;
}

export function LearningPulsePanel({ assessment }: Props) {
  return (
    <Card>
      <p className="step-kicker">LEARNING PULSE</p>
      {assessment.pulseScore !== null ? (
        <p>{`${Math.round(assessment.pulseScore)} · ${pulseStatusLabel(assessment.pulseStatus ?? "")}`}</p>
      ) : (
        <p className="muted">سيظهر النبض بعد إجابات حقيقية.</p>
      )}
      <ConceptEvidencePanel evidence={assessment.evidence} />
      <p className="muted">{`إجابات صحيحة: ${assessment.metrics.correctCount} من ${Math.max(assessment.metrics.answered, 1)}`}</p>
      {assessment.metrics.averageSeconds !== null ? (
        <p className="muted">{`متوسط زمن الإجابة: ${assessment.metrics.averageSeconds} ث`}</p>
      ) : null}
      {assessment.metrics.explanationRequests > 0 ? (
        <p className="muted">{`طلبات إعادة الشرح: ${assessment.metrics.explanationRequests}`}</p>
      ) : null}
    </Card>
  );
}
