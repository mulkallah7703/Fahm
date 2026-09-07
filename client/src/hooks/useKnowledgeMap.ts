import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { knowledgeMapApi } from "../services/knowledgeMapApi";
import { ApiError, type KnowledgeMapAction, type KnowledgeMapDto, type MapFilter } from "../types";

export function useKnowledgeMap(sessionId: string | undefined) {
  const navigate = useNavigate();
  const [data, setData] = useState<KnowledgeMapDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">("map");
  const [filter, setFilter] = useState<MapFilter>("all");

  const fail = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        setError("لم يتم العثور على الخريطة.");
        setData(null);
        return;
      }
      setError(err instanceof ApiError ? err.message : fallback);
    },
    [navigate],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = sessionId ? await knowledgeMapApi.session(sessionId) : await knowledgeMapApi.student();
      setData(next);
      setSelectedId(next.selectedConceptId);
      if (next.preferredView === "review" || next.preferredView === "list") {
        setView("list");
        if (next.preferredView === "review") setFilter("review");
      }
    } catch (err) {
      fail(err, "تعذر تحميل خريطة المعرفة.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fail, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const select = useCallback(
    async (conceptId: string) => {
      setSelectedId(conceptId);
      if (!sessionId) return;
      setActing(true);
      try {
        const next = await knowledgeMapApi.action(sessionId, "select", conceptId);
        setData(next);
        setSelectedId(next.selectedConceptId);
      } catch (err) {
        fail(err, "تعذر تحديد المفهوم.");
      } finally {
        setActing(false);
      }
    },
    [fail, sessionId],
  );

  const action = useCallback(
    async (name: KnowledgeMapAction, conceptId?: string) => {
      const targetSession = sessionId ?? data?.nodes.find((item) => item.conceptId === conceptId)?.sessionId ?? data?.scope.sessionId;
      if (!targetSession) {
        if (name === "review") {
          setView("list");
          setFilter("review");
        }
        return null;
      }
      setActing(true);
      setError(null);
      try {
        const next = await knowledgeMapApi.action(targetSession, name, conceptId);
        setData(next);
        setSelectedId(next.selectedConceptId);
        if (next.preferredView === "review") {
          setView("list");
          setFilter("review");
        }
        if (next.navigateTo) navigate(next.navigateTo);
        return next;
      } catch (err) {
        fail(err, "تعذر إكمال الإجراء.");
        return null;
      } finally {
        setActing(false);
      }
    },
    [data, fail, navigate, sessionId],
  );

  return {
    data,
    loading,
    acting,
    error,
    selectedId,
    view,
    filter,
    setView,
    setFilter,
    reload: load,
    select,
    action,
  };
}
