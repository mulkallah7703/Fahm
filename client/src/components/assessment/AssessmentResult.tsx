import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { ReviewRecommendation } from "./ReviewRecommendation";
import type { AssessmentExperience } from "../../types";

interface Props {
  assessment: AssessmentExperience;
  onReview: () => void;
  onCompleteLesson: () => void;
  onHome: () => void;
}

export function AssessmentResult({ assessment, onReview, onCompleteLesson, onHome }: Props) {
  const summary = assessment.summary;
  if (!summary) return null;
  return (
    <Card className="completion-card">
      <h2>أكملت اختبار الفهم.</h2>
      <p>{summary.message}</p>
      <p>{`إجابات صحيحة: ${summary.correctCount} من ${summary.answered}`}</p>
      {summary.understood.length ? <p>فهم جيد: {summary.understood.join("، ")}</p> : null}
      {summary.review.length ? <p>تحتاج مراجعة: {summary.review.join("، ")}</p> : null}
      <ReviewRecommendation text={assessment.recommendation} />
      <div className="verify-actions">
        {summary.review.length ? (
          <Button type="button" onClick={onReview}>
            راجع الفكرة
          </Button>
        ) : null}
        <Button variant="ghost" type="button" onClick={onCompleteLesson}>
          أكمل الدرس
        </Button>
        <Button variant="text" type="button" onClick={onHome}>
          الرئيسية
        </Button>
      </div>
    </Card>
  );
}
