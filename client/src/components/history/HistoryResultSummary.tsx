import type { HistoryAnswerSummary } from "../../types";

interface Props {
  answers: HistoryAnswerSummary;
}

export function HistoryResultSummary({ answers }: Props) {
  if (answers.answeredCount === 0) {
    return <p className="muted">لا توجد إجابات مسجّلة في هذه الجلسة.</p>;
  }
  return (
    <div className="history-result">
      <p>
        {answers.answeredCount} من {answers.questionCount} أسئلة
        {answers.accuracy != null ? ` · دقة ${answers.accuracy}%` : ""}
      </p>
      <p className="muted">
        صحيحة {answers.correctCount} · غير صحيحة {answers.incorrectCount}
      </p>
    </div>
  );
}
