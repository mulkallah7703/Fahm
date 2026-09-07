import type { AssessmentExperience } from "../../types";

interface Props {
  evidence: AssessmentExperience["evidence"];
}

export function ConceptEvidencePanel({ evidence }: Props) {
  if (!evidence.length) return null;
  return (
    <div>
      {evidence.map((item) => (
        <div key={item.conceptId} className="evidence-row">
          <div>
            <strong>{item.name}</strong>
            <p className="muted">{item.label}</p>
            <div
              className="mastery-bar"
              role="img"
              aria-label={`${item.name}: ${item.label}`}
            >
              <div className="mastery-fill" style={{ width: `${Math.max(8, item.masteryScore)}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
