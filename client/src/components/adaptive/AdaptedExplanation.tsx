import type { RefObject } from "react";

interface Props {
  currentLabel: string;
  currentBlurb: string;
  currentExplanation: string;
  previousExplanation: string | null;
  visualDescription: string | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

export function AdaptedExplanation({
  currentLabel,
  currentBlurb,
  currentExplanation,
  previousExplanation,
  visualDescription,
  headingRef,
}: Props) {
  return (
    <article className="adapted-block">
      <section className="adapted-now">
        <p className="step-kicker">الشرح الجديد — {currentLabel}</p>
        <h2 ref={headingRef} tabIndex={-1}>
          {currentLabel}
        </h2>
        <p className="muted">{currentBlurb}</p>
        <p>{currentExplanation}</p>
      </section>
      <div className="adapted-compare">
        {previousExplanation ? (
          <section>
            <p className="step-kicker">الشرح السابق</p>
            <p>{previousExplanation}</p>
          </section>
        ) : null}
        {visualDescription ? (
          <section>
            <p className="step-kicker">ما يظهر في الصفحة</p>
            <p>{visualDescription}</p>
          </section>
        ) : null}
      </div>
    </article>
  );
}
