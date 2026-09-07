import { useCallback, useMemo } from "react";
import { lessonApi } from "../services/lessonApi";
import type { LessonSession } from "../types";

export function useAdaptiveActions(
  sessionId: string | undefined,
  run: (label: string, work: () => Promise<LessonSession>) => Promise<void>,
) {
  const action = useCallback(
    (label: string, name: Parameters<typeof lessonApi.adaptiveAction>[1]) => {
      if (!sessionId) return;
      return run(label, () => lessonApi.adaptiveAction(sessionId, name));
    },
    [run, sessionId],
  );

  return useMemo(
    () => ({
      understood: () => action("رائع، نكمل...", "understood"),
      notUnderstood: () => action("لنجرّب طريقة أخرى...", "not_understood"),
      tryAnother: () => action("جاري اختيار طريقة أخرى...", "try_another"),
      testMe: () => action("جاري إعداد سؤال للتحقق من فهمك...", "test_me"),
      continueLesson: () => action("فَهْم يجهز الشرح...", "continue"),
    }),
    [action],
  );
}
