import { useCallback } from "react";
import { lessonApi } from "../services/lessonApi";
import type { LessonSession } from "../types";

export function useBlindActions(
  sessionId: string | undefined,
  run: (label: string, work: () => Promise<LessonSession>) => Promise<void>,
) {
  const action = useCallback(
    (
      label: string,
      body: { action: string; paragraphIndex?: number; speed?: number; segmentId?: string },
    ) => {
      if (!sessionId) return;
      return run(label, () => lessonApi.blindAction(sessionId, body));
    },
    [run, sessionId],
  );

  return {
    readPage: () => action("جاري تجهيز الشرح الصوتي...", { action: "read_page" }),
    describeDiagram: () => action("جاري تجهيز وصف الرسم...", { action: "describe_diagram" }),
    describeTable: () => action("جاري تجهيز وصف الجدول...", { action: "describe_table" }),
    readParagraph: (paragraphIndex: number) =>
      action("جاري قراءة الفقرة...", { action: "read_paragraph", paragraphIndex }),
    moreDetail: () => action("جاري تجهيز وصف أكثر تفصيلًا...", { action: "more_detail" }),
    nextSegment: () => action("التسلسل التالي...", { action: "next_segment" }),
    previousSegment: () => action("العنصر السابق...", { action: "previous_segment" }),
    replay: () => action("إعادة القراءة...", { action: "replay" }),
    testMe: () => action("جاري إعداد سؤال للتحقق من فهمك...", { action: "test_me" }),
    whereAmI: () => action("أين أنا؟", { action: "where_am_i" }),
    whatNow: () => action("ماذا أتعلم الآن؟", { action: "what_now" }),
    keyPoint: () => action("ما أهم نقطة؟", { action: "key_point" }),
    setSpeed: (speed: number) => action("جاري ضبط السرعة...", { action: "set_speed", speed }),
    markStarted: () => action("", { action: "audio_started" }),
    markPaused: () => action("", { action: "audio_paused" }),
    markListened: (segmentId: string) => action("", { action: "mark_listened", segmentId }),
  };
}
