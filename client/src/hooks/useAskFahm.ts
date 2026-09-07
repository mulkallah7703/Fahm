import { useCallback, useEffect, useState } from "react";
import { askFahmApi } from "../services/askFahmApi";
import { ApiError, type AskFahmExperience } from "../types";

export function useAskFahm(sessionId: string | undefined) {
  const [data, setData] = useState<AskFahmExperience | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) {
      setError("معرف الجلسة غير صالح.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await askFahmApi.get(sessionId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر تحميل محادثة فَهْم.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = useCallback(
    async (message: string, conceptId?: string) => {
      if (!sessionId) return null;
      setSending(true);
      setError(null);
      try {
        const next = await askFahmApi.send(sessionId, message, conceptId);
        setData(next);
        return next;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "تعذر إرسال السؤال.");
        return null;
      } finally {
        setSending(false);
      }
    },
    [sessionId],
  );

  const action = useCallback(
    async (name: "simplify" | "example" | "listen" | "test_me" | "show_map") => {
      if (!sessionId) return null;
      setSending(true);
      setError(null);
      try {
        const next = await askFahmApi.action(sessionId, name);
        setData(next);
        return next;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "تعذر إكمال الإجراء.");
        return null;
      } finally {
        setSending(false);
      }
    },
    [sessionId],
  );

  return { data, loading, sending, error, reload: load, send, action };
}
