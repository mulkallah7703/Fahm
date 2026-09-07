import { Card } from "../common/Card";
import { EmptyState } from "../common/EmptyState";
import { pulseStatusLabel } from "../../utils/format";
import type { LearningPulse, ReviewConcept } from "../../types";

interface Props {
  pulse: LearningPulse | null;
  concepts: ReviewConcept[];
}

export function LearningPulseCard({ pulse, concepts }: Props) {
  return (
    <Card className="pulse-card" aria-labelledby="pulse-title">
      <div className="pulse-kicker" id="pulse-title">
        LEARNING PULSE
      </div>
      {pulse ? (
        <>
          <div className="pulse-score">
            <strong>{pulse.score}%</strong>
            <span>{pulseStatusLabel(pulse.status)}</span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${pulse.score}%` }} />
          </div>
        </>
      ) : (
        <EmptyState
          title="لا توجد بيانات نبض بعد"
          description="ابدأ أول درس ليظهر متوسط فهمك هنا."
        />
      )}

      <h3 style={{ margin: "20px 0 0", fontSize: "1rem" }}>يحتاج مراجعة</h3>
      {concepts.length === 0 ? (
        <p className="muted">لا توجد مفاهيم تحتاج مراجعة الآن.</p>
      ) : (
        <ul className="review-list">
          {concepts.map((concept, index) => (
            <li key={concept.conceptId}>
              <span className="review-name">
                <span
                  className={`dot ${index === 0 ? "warn" : "bad"}`}
                  aria-hidden="true"
                />
                {concept.name}
              </span>
              <span className="muted">{concept.subject ?? "مفهوم"}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
