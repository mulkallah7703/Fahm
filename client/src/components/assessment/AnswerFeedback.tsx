import type { RefObject } from "react";
import type { LessonFeedback } from "../../types";

interface Props {
  feedback: LessonFeedback | null;
  hint: string | null;
  regionRef: RefObject<HTMLDivElement | null>;
}

export function AnswerFeedback({ feedback, hint, regionRef }: Props) {
  return (
    <>
      {feedback ? (
        <div className={`feedback ${feedback.type}`} ref={regionRef} tabIndex={-1} role="status">
          <strong>{feedback.message}</strong>
          {feedback.explanation ? <p>{feedback.explanation}</p> : null}
        </div>
      ) : null}
      {hint ? <p className="mode-hint">{hint}</p> : null}
    </>
  );
}
