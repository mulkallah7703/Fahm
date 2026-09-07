import { useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { canReview, resumeHref, reviewActionLabel, reviewHref } from "./historyView";
import type { HistoryListItem, HistorySessionDetail } from "../../types";

interface Props {
  item: HistoryListItem;
  detail: HistorySessionDetail | null;
}

export function HistoryActions({ item, detail }: Props) {
  const navigate = useNavigate();
  return (
    <div className="history-actions">
      <Button type="button" variant="ghost" onClick={() => navigate(resumeHref(item.sessionId))}>
        أعد عرض الجلسة
      </Button>
      {canReview(detail, item) ? (
        <Button type="button" onClick={() => navigate(reviewHref(item.sessionId))}>
          {reviewActionLabel(detail)}
        </Button>
      ) : null}
    </div>
  );
}
