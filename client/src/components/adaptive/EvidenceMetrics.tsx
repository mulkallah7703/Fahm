import type { AdaptiveEvidence } from "../../types";

interface Props {
  evidence: AdaptiveEvidence;
}

export function EvidenceMetrics({ evidence }: Props) {
  const items = [
    evidence.explanationRequests > 0
      ? { label: "طلبات إعادة الشرح", value: String(evidence.explanationRequests) }
      : null,
    evidence.incorrectAnswers > 0
      ? { label: "إجابات غير دقيقة", value: String(evidence.incorrectAnswers) }
      : null,
    evidence.replayCount > 0 ? { label: "إعادة الفكرة", value: String(evidence.replayCount) } : null,
    evidence.hintCount > 0 ? { label: "تلميحات", value: String(evidence.hintCount) } : null,
    evidence.pauseSeconds && evidence.pauseSeconds > 0
      ? { label: "زمن التوقف", value: `${evidence.pauseSeconds} ث` }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  if (items.length === 0) return null;

  return (
    <section className="evidence-card" aria-label="إشارات التكيف">
      <p className="step-kicker">إشارات التكيف</p>
      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
