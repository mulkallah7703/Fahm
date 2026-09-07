import { useCallback, useEffect, useState } from "react";
import { lessonApi } from "../services/lessonApi";
import { ApiError, type LessonSession } from "../types";

export function useLesson(sessionId: string | undefined) {
  const [data, setData] = useState<LessonSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [askReply, setAskReply] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) {
      setError("معرف الجلسة غير صالح.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await lessonApi.get(sessionId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر تحميل جلسة التعلم.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(
    async (label: string, work: () => Promise<LessonSession>) => {
      if (!sessionId) return;
      if (label) setBusy(label);
      setError(null);
      try {
        setData(await work());
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "تعذر إكمال الطلب.");
      } finally {
        setBusy(null);
      }
    },
    [sessionId],
  );

  return {
    data,
    loading,
    error,
    busy,
    hint,
    askReply,
    reload: load,
    advance: () => run("فَهْم يجهز الشرح...", () => lessonApi.advance(sessionId!)),
    answer: (questionId: string, answer: string, responseTimeSeconds?: number) =>
      run("جاري تحليل إجابتك...", () => lessonApi.answer(sessionId!, { questionId, answer, responseTimeSeconds })),
    simplify: () => run("فَهْم يجهز الشرح...", () => lessonApi.simplify(sessionId!)),
    example: () => run("فَهْم يجهز الشرح...", () => lessonApi.example(sessionId!)),
    complete: () => run("جاري إنهاء الدرس...", () => lessonApi.complete(sessionId!)),
    requestHint: async () => {
      if (!sessionId) return;
      setBusy("جاري إعداد تلميح...");
      try {
        const result = await lessonApi.hint(sessionId);
        setData(result);
        setHint(result.hint);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "تعذر تجهيز التلميح.");
      } finally {
        setBusy(null);
      }
    },
    run,
    ask: async (question: string) => {
      if (!sessionId) return;
      setBusy("جاري سؤال فَهْم...");
      try {
        const result = await lessonApi.ask(sessionId, question);
        setAskReply(result.reply);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "تعذر إرسال السؤال.");
      } finally {
        setBusy(null);
      }
    },
  };
}
