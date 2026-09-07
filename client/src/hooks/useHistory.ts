import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { historyApi } from "../services/historyApi";
import { ApiError, type HistoryFilter, type HistoryListItem, type HistorySessionDetail } from "../types";

function asFilter(value: string | null): HistoryFilter {
  return value === "needs_review" ? "needs_review" : "all";
}

export function useHistory() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [params, setParams] = useSearchParams();
  const filter = asFilter(params.get("filter"));
  const search = params.get("q") ?? "";
  const [draft, setDraft] = useState(search);
  const [items, setItems] = useState<HistoryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [detail, setDetail] = useState<HistorySessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fail = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(err instanceof ApiError ? err.message : fallback);
    },
    [navigate],
  );

  const load = useCallback(
    async (nextPage = 1, append = false) => {
      setLoading(!append);
      setError(null);
      try {
        const data = await historyApi.list({ page: nextPage, pageSize: 20, search, filter });
        setItems((current) => (append ? [...current, ...data.items] : data.items));
        setTotal(data.pagination.total);
        setPage(data.pagination.page);
        setHasNext(data.pagination.hasNext);
      } catch (err) {
        fail(err, "تعذر تحميل سجل التعلم.");
        if (!append) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    },
    [fail, filter, search],
  );

  useEffect(() => {
    void load(1, false);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft === search) return;
      const next = new URLSearchParams(params);
      if (draft.trim()) next.set("q", draft.trim());
      else next.delete("q");
      setParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draft, params, search, setParams]);

  const selected = useMemo(
    () => items.find((item) => item.sessionId === sessionId) ?? items[0] ?? null,
    [items, sessionId],
  );

  useEffect(() => {
    if (items.length === 0) return;
    const exists = sessionId ? items.some((item) => item.sessionId === sessionId) : false;
    if (!exists) {
      navigate(`/history/${items[0].sessionId}${params.toString() ? `?${params.toString()}` : ""}`, { replace: true });
    }
  }, [items, navigate, params, sessionId]);

  useEffect(() => {
    const id = sessionId ?? selected?.sessionId;
    if (!id) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    void historyApi
      .session(id)
      .then((next) => {
        if (active) setDetail(next);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setDetail(null);
          setError("لم يتم العثور على الجلسة.");
          return;
        }
        fail(err, "تعذر تحميل تفاصيل الجلسة.");
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fail, selected?.sessionId, sessionId]);

  const select = useCallback(
    (id: string) => {
      navigate(`/history/${id}${params.toString() ? `?${params.toString()}` : ""}`);
    },
    [navigate, params],
  );

  const setFilter = useCallback(
    (next: HistoryFilter) => {
      const query = new URLSearchParams(params);
      if (next === "all") query.delete("filter");
      else query.set("filter", next);
      setParams(query, { replace: true });
    },
    [params, setParams],
  );

  return {
    items,
    total,
    page,
    hasNext,
    filter,
    search,
    draft,
    setDraft,
    selected,
    detail,
    loading,
    detailLoading,
    error,
    select,
    setFilter,
    reload: () => void load(1, false),
    loadMore: () => void load(page + 1, true),
  };
}
