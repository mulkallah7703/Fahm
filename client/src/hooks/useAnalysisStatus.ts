import { useCallback, useEffect, useRef, useState } from "react";
import { analysisApi } from "../services/analysisApi";
import { ApiError, type PageAnalysis } from "../types";

const POLL_MS = 1600;
const MAX_POLLS = 80;

function isActive(status: PageAnalysis["status"]): boolean {
  return (
    status === "ocr_processing" ||
    status === "ocr_completed" ||
    status === "vision_processing" ||
    status === "vision_completed" ||
    status === "concept_extraction"
  );
}

export function useAnalysisStatus(materialId: string | undefined) {
  const [data, setData] = useState<PageAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const polls = useRef(0);
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const apply = useCallback((next: PageAnalysis) => {
    setData(next);
    setError(next.error?.message ?? null);
  }, []);

  const load = useCallback(async () => {
    if (!materialId) {
      setError("لم يتم العثور على الصفحة.");
      setLoading(false);
      return;
    }
    try {
      const current = await analysisApi.get(materialId);
      apply(current);
      if (current.status === "pending") {
        const started = await analysisApi.analyze(materialId, false);
        apply(started);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }, [apply, materialId]);

  const reanalyze = useCallback(async () => {
    if (!materialId) return;
    setError(null);
    try {
      const next = await analysisApi.analyze(materialId, true);
      apply(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر تحليل المحتوى حاليًا.");
    }
  }, [apply, materialId]);

  useEffect(() => {
    void load();
    return stop;
  }, [load, stop]);

  useEffect(() => {
    stop();
    if (!data || !isActive(data.status)) {
      polls.current = 0;
      return;
    }
    if (polls.current >= MAX_POLLS) {
      setError("استغرق التحليل وقتاً أطول من المتوقع.");
      return;
    }
    timer.current = window.setTimeout(() => {
      polls.current += 1;
      if (!materialId) return;
      void analysisApi
        .get(materialId)
        .then(apply)
        .catch((err: unknown) => {
          setError(err instanceof ApiError ? err.message : "تعذر الاتصال بالخادم.");
        });
    }, POLL_MS);
    return stop;
  }, [apply, data, materialId, stop]);

  return { data, loading, error, reload: load, reanalyze, setData };
}
