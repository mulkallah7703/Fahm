import type { RefObject } from "react";
import type { LessonQuestion } from "../../types";
import { QuestionOption } from "./QuestionOption";

interface Props {
  question: LessonQuestion | null;
  selected: string;
  answered: boolean;
  feedbackType: "correct" | "incorrect" | "partial" | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onSelect: (value: string) => void;
}

export function QuestionCard({
  question,
  selected,
  answered,
  feedbackType,
  headingRef,
  onSelect,
}: Props) {
  return (
    <section className="verify-question">
      <p className="muted">{question?.type === "short_answer" ? "أجب بكلماتك" : "اختر إجابة"}</p>
      <h2 ref={headingRef} tabIndex={-1}>
        {question?.text}
      </h2>
      {question?.options ? (
        <div className="verify-options" role="radiogroup" aria-label="خيارات الإجابة">
          {question.options.map((option) => {
            const chosen = selected === option;
            const marked = answered && chosen && feedbackType && feedbackType !== "partial" ? feedbackType : null;
            return (
              <QuestionOption
                key={option}
                option={option}
                selected={chosen}
                marked={marked}
                disabled={answered}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      ) : (
        <textarea
          className="ask-input"
          value={selected}
          onChange={(event) => onSelect(event.target.value)}
          disabled={answered}
          maxLength={2000}
          aria-label="إجابتك"
        />
      )}
    </section>
  );
}
