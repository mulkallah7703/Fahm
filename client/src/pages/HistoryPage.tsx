import { useOutletContext } from "react-router-dom";
import { Button } from "../components/common/Button";
import { HistoryDetails } from "../components/history/HistoryDetails";
import { HistoryEmptyState } from "../components/history/HistoryEmptyState";
import { HistoryErrorState } from "../components/history/HistoryErrorState";
import { HistoryFilters } from "../components/history/HistoryFilters";
import { HistoryHeader } from "../components/history/HistoryHeader";
import { HistorySearch } from "../components/history/HistorySearch";
import { HistorySection } from "../components/history/HistorySection";
import { HistorySkeleton } from "../components/history/HistorySkeleton";
import { groupHistory, historyLiveMessage } from "../components/history/historyView";
import { useHistory } from "../hooks/useHistory";
import "../components/common/common.css";
import "../components/history/history.css";

interface ShellContext {
  openMenu: () => void;
}

export function HistoryPage() {
  const { openMenu } = useOutletContext<ShellContext>();
  const history = useHistory();
  const groups = groupHistory(history.items);

  return (
    <main className="history-page" lang="ar" dir="rtl">
      <p className="sr-only" aria-live="polite">
        {historyLiveMessage({
          loading: history.loading,
          error: history.error,
          selectedTitle: history.selected?.title,
        })}
      </p>
      <Button className="menu-toggle" variant="ghost" type="button" onClick={openMenu}>
        القائمة
      </Button>
      <HistoryHeader total={history.total} />
      <div className="history-toolbar">
        <HistorySearch value={history.draft} onChange={history.setDraft} />
        <HistoryFilters value={history.filter} onChange={history.setFilter} />
      </div>
      {history.loading ? <HistorySkeleton /> : null}
      {!history.loading && history.error && history.items.length === 0 ? (
        <HistoryErrorState message={history.error} onRetry={history.reload} />
      ) : null}
      {!history.loading && !history.error && history.items.length === 0 ? (
        <HistoryEmptyState filter={history.filter} search={history.search} />
      ) : null}
      {!history.loading && history.items.length > 0 ? (
        <div className="history-layout">
          <div>
            {groups.map((group) => (
              <HistorySection
                key={group.id}
                group={group}
                selectedId={history.selected?.sessionId ?? null}
                onSelect={history.select}
              />
            ))}
            {history.hasNext ? (
              <Button className="history-more" type="button" variant="ghost" onClick={history.loadMore}>
                المزيد
              </Button>
            ) : null}
          </div>
          <HistoryDetails item={history.selected} detail={history.detail} loading={history.detailLoading} />
        </div>
      ) : null}
    </main>
  );
}
