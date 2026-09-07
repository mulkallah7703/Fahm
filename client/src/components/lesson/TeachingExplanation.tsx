import type { ReactNode } from "react";
import type { LessonSession } from "../../types";

interface Props {
  plan: LessonSession["teachingPlan"] | undefined;
  content: LessonSession["content"];
  conceptName?: string | null;
  nextLabel?: string;
}

export function TeachingExplanation({ plan, content, conceptName, nextLabel }: Props) {
  const name = conceptName || content.terms[0]?.name || content.title;
  const core = content.coreIdea || content.simplifiedExplanation || content.mainIdea;
  const steps = content.steps?.length ? content.steps : content.keyPoints.map((item) => item.text);
  const terms = content.importantTerms?.length
    ? content.importantTerms
    : content.terms.map((item) => ({ term: item.name, meaning: item.definition }));
  if (content.unreadable) {
    return (
      <CardBlock>
        <p className="step-kicker">تعذر قراءة هذا الجزء</p>
        <h2>{content.mainIdea}</h2>
        <p className="muted">يمكنك إعادة تحليل الصفحة من شاشة التحليل.</p>
      </CardBlock>
    );
  }

  return (
    <div className="teach-stack">
      <CardBlock>
        <p className="step-kicker">الفكرة التي نتعلمها الآن</p>
        <h2 className="teach-concept">{name}</h2>
        {plan?.label ? <p className="muted">{plan.label} — {plan.objective}</p> : null}
      </CardBlock>
      {content.hook ? <p className="teach-hook">{content.hook}</p> : null}
      <CardBlock>
        <p className="step-kicker">الفكرة الأساسية</p>
        <p className="teach-body">{core}</p>
      </CardBlock>
      {steps.length > 0 ? (
        <CardBlock>
          <p className="step-kicker">كيف يحدث؟</p>
          <ol className="teach-points">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </CardBlock>
      ) : null}
      {content.example ? (
        <CardBlock>
          <p className="step-kicker">مثال من المادة</p>
          <p className="teach-body">{content.example}</p>
        </CardBlock>
      ) : null}
      {content.whyItMatters ? (
        <CardBlock>
          <p className="step-kicker">لماذا هذا مهم؟</p>
          <p className="teach-body">{content.whyItMatters}</p>
        </CardBlock>
      ) : null}
      {content.relationship ? (
        <CardBlock>
          <p className="step-kicker">علاقته بما تعلمناه</p>
          <p className="teach-body">{content.relationship}</p>
        </CardBlock>
      ) : null}
      {terms.length > 0 ? (
        <CardBlock>
          <p className="step-kicker">مصطلحات مهمة</p>
          <div className="teach-terms">
            {terms.map((item) => (
              <div key={item.term} className="teach-term">
                <strong>{item.term}</strong>
                <p>{item.meaning}</p>
              </div>
            ))}
          </div>
        </CardBlock>
      ) : null}
      {nextLabel ? <p className="teach-next">{nextLabel}</p> : null}
    </div>
  );
}

function CardBlock({ children }: { children: ReactNode }) {
  return <div className="teach-block">{children}</div>;
}
