import { Button } from "../common/Button";
import { HintButton } from "./HintButton";

interface Props {
  canSubmit: boolean;
  answered: boolean;
  atEnd: boolean;
  canPrevious: boolean;
  showReviewHelp: boolean;
  busy: boolean;
  onSubmit: () => void;
  onHint: () => void;
  onExplain: () => void;
  onExample: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: () => void;
}

export function NextStepCard({
  canSubmit,
  answered,
  atEnd,
  canPrevious,
  showReviewHelp,
  busy,
  onSubmit,
  onHint,
  onExplain,
  onExample,
  onPrevious,
  onNext,
  onComplete,
}: Props) {
  return (
    <div className="verify-actions">
      <Button type="button" disabled={!canSubmit || busy} onClick={onSubmit}>
        أجب
      </Button>
      <HintButton onHint={onHint} disabled={busy} />
      {showReviewHelp ? (
        <>
          <Button variant="ghost" type="button" disabled={busy} onClick={onExplain}>
            اشرح لي الفكرة
          </Button>
          <Button variant="text" type="button" disabled={busy} onClick={onExample}>
            مثال
          </Button>
        </>
      ) : null}
      <Button variant="ghost" type="button" disabled={!canPrevious || busy} onClick={onPrevious}>
        السابق
      </Button>
      {answered && !atEnd ? (
        <Button type="button" disabled={busy} onClick={onNext}>
          السؤال التالي
        </Button>
      ) : null}
      {answered && atEnd ? (
        <Button type="button" disabled={busy} onClick={onComplete}>
          عرض النتيجة
        </Button>
      ) : null}
    </div>
  );
}
