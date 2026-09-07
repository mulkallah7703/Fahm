import { useCallback, useMemo } from "react";
import { lessonApi } from "../services/lessonApi";
import type { LessonSession } from "../types";

export function useAssessmentActions(
  sessionId: string | undefined,
  run: (label: string, work: () => Promise<LessonSession>) => Promise<void>,
) {
  const action = useCallback(
    (label: string, name: Parameters<typeof lessonApi.assessmentAction>[1]) => {
      if (!sessionId) return;
      return run(label, () => lessonApi.assessmentAction(sessionId, name));
    },
    [run, sessionId],
  );

  return useMemo(
    () => ({
      start: () => action("جاري إعداد اختبار الفهم...", "start"),
      next: () => action("", "next"),
      previous: () => action("", "previous"),
      complete: () => action("جاري إنهاء اختبار الفهم...", "complete"),
      review: () => action("لنراجع الفكرة...", "review"),
    }),
    [action],
  );
}
