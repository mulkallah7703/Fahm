import { useCallback, useMemo } from "react";
import { lessonApi } from "../services/lessonApi";
import type { DyslexiaFontSize, DyslexiaLineSpacing, LessonSession } from "../types";

export function useDyslexiaActions(
  sessionId: string | undefined,
  run: (label: string, work: () => Promise<LessonSession>) => Promise<void>,
) {
  const action = useCallback(
    (label: string, body: Parameters<typeof lessonApi.dyslexiaAction>[1]) => {
      if (!sessionId) return;
      return run(label, () => lessonApi.dyslexiaAction(sessionId, body));
    },
    [run, sessionId],
  );

  return useMemo(
    () => ({
      next: () => action("التسلسل التالي...", { action: "next_segment" }),
      previous: () => action("المقطع السابق...", { action: "previous_segment" }),
      testMe: () => action("جاري إعداد سؤال للتحقق من فهمك...", { action: "test_me" }),
      replay: () => action("", { action: "replay" }),
      focusSegment: (segmentId: string) => action("", { action: "focus_segment", segmentId }),
      setFont: (fontSize: DyslexiaFontSize) => action("", { action: "set_prefs", fontSize }),
      setSpacing: (lineSpacing: DyslexiaLineSpacing) => action("", { action: "set_prefs", lineSpacing }),
      setSpeechRate: (speechRate: number) => action("", { action: "set_prefs", speechRate }),
      setHighlight: (highlightCurrent: boolean) => action("", { action: "set_prefs", highlightCurrent }),
      setAutoRead: (autoRead: boolean) => action("", { action: "set_prefs", autoRead }),
      setWordClick: (wordClickEnabled: boolean) => action("", { action: "set_prefs", wordClickEnabled }),
      resetPrefs: () => action("", { action: "reset_prefs" }),
      explainWord: (word: string, segmentId?: string) =>
        action("جاري شرح الكلمة...", { action: "explain_word", word, segmentId }),
      simplifyWord: (word: string) => action("جاري تبسيط الكلمة...", { action: "simplify_word", word }),
      saveNote: (note: string, segmentId?: string) =>
        action("جاري حفظ الملاحظة...", { action: "save_note", note, segmentId }),
      deleteNote: (segmentId?: string) => action("", { action: "delete_note", segmentId }),
    }),
    [action],
  );
}
