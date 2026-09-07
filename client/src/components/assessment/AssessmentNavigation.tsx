import { Card } from "../common/Card";
import type { AssessmentItem } from "../../types";

interface Props {
  items: AssessmentItem[];
}

export function AssessmentNavigation({ items }: Props) {
  return (
    <Card>
      <p className="step-kicker">الأسئلة</p>
      {items.map((item, index) => (
        <p key={item.questionId} className={`nav-item ${item.status}`}>
          <span>{`${index + 1}. ${item.conceptName ?? "سؤال"}`}</span>
          <span aria-hidden="true">
            {item.status === "correct" || item.status === "incorrect" ? "●" : "○"}
          </span>
        </p>
      ))}
    </Card>
  );
}
