import { Card } from "../common/Card";
import { Skeleton } from "../common/Skeleton";
import type { HistoryListItem, HistorySessionDetail } from "../../types";
import { durationLabel, itemTitle, whenLabel } from "./historyView";
import { HistoryActions } from "./HistoryActions";
import { HistoryConceptSummary } from "./HistoryConceptSummary";
import { HistoryResultSummary } from "./HistoryResultSummary";
import { HistoryTimeline } from "./HistoryTimeline";

interface Props {
  item: HistoryListItem | null;
  detail: HistorySessionDetail | null;
  loading: boolean;
}

export function HistoryDetails({ item, detail, loading }: Props) {
  if (!item) {
    return (
      <Card className="history-details">
        <h2>تفاصيل الجلسة</h2>
        <p className="muted">اختر جلسة من السجل لعرض ما حدث فيها.</p>
      </Card>
    );
  }

  if (loading && !detail) {
    return (
      <Card className="history-details" aria-busy="true">
        <h2>تفاصيل الجلسة</h2>
        <Skeleton height="22px" width="70%" />
        <Skeleton height="160px" />
      </Card>
    );
  }

  const session = detail?.session ?? item;
  return (
    <Card className="history-details" aria-live="polite">
      <h2>تفاصيل الجلسة</h2>
      <strong>{itemTitle(session)}</strong>
      <p className="muted">
        {whenLabel(session.startedAt)} · {durationLabel(session.durationSeconds)}
      </p>
      <h3>ما حدث في الجلسة</h3>
      <HistoryTimeline activities={detail?.activities ?? []} />
      <h3>نتيجة الجلسة</h3>
      {detail ? <HistoryResultSummary answers={detail.answers} /> : null}
      {detail ? <HistoryConceptSummary concepts={detail.concepts} /> : null}
      {detail && detail.adaptations.length > 0 ? (
        <>
          <h3>تكييف الشرح</h3>
          <ul className="history-result">
            {detail.adaptations.map((item) => (
              <li key={`${item.at}-${item.reason}`}>
                {[item.fromLabel, item.toLabel].filter(Boolean).join(" → ") || item.reason}
                {item.fromLabel && item.toLabel ? ` · ${item.reason}` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {detail?.recommendation ? <p>{detail.recommendation}</p> : null}
      <HistoryActions item={session} detail={detail} />
    </Card>
  );
}
