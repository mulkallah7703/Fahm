import type { AskFahmExperience, BlindExperience, DyslexiaFontSize, DyslexiaLineSpacing, LessonSession, TtsResponse } from "../types";
import { apiClient } from "./apiClient";

export const lessonApi = {
  get(sessionId: string) {
    return apiClient.get<LessonSession>(`/api/learning/sessions/${sessionId}`);
  },
  advance(sessionId: string) {
    return apiClient.post<LessonSession>(`/api/learning/sessions/${sessionId}/advance`);
  },
  answer(sessionId: string, body: { questionId: string; answer: string; responseTimeSeconds?: number }) {
    return apiClient.post<LessonSession>(`/api/learning/sessions/${sessionId}/answers`, body);
  },
  hint(sessionId: string) {
    return apiClient.post<LessonSession & { hint: string }>(`/api/learning/sessions/${sessionId}/hint`);
  },
  simplify(sessionId: string) {
    return apiClient.post<LessonSession>(`/api/learning/sessions/${sessionId}/simplify`);
  },
  example(sessionId: string) {
    return apiClient.post<LessonSession>(`/api/learning/sessions/${sessionId}/example`);
  },
  ask(sessionId: string, question: string) {
    return apiClient.post<AskFahmExperience>(`/api/learning/sessions/${sessionId}/ask`, { question });
  },
  complete(sessionId: string) {
    return apiClient.post<LessonSession>(`/api/learning/sessions/${sessionId}/complete`);
  },
  blind(sessionId: string) {
    return apiClient.get<LessonSession>(`/api/learning/sessions/${sessionId}/blind`);
  },
  blindSegments(sessionId: string) {
    return apiClient.get<BlindExperience>(`/api/learning/sessions/${sessionId}/blind/segments`);
  },
  blindAction(
    sessionId: string,
    body: { action: string; paragraphIndex?: number; speed?: number; segmentId?: string },
  ) {
    return apiClient.post<LessonSession>(`/api/learning/sessions/${sessionId}/blind/action`, body);
  },
  blindAudio(sessionId: string, segmentId: string) {
    return apiClient.post<TtsResponse>(`/api/learning/sessions/${sessionId}/blind/audio`, { segmentId });
  },
  tts(body: { text: string; sessionId?: string; voice?: string }) {
    return apiClient.post<TtsResponse>("/api/tts", body);
  },
  assessment(sessionId: string) {
    return apiClient.get<LessonSession>(`/api/learning/sessions/${sessionId}/assessment`);
  },
  assessmentAction(sessionId: string, action: "start" | "next" | "previous" | "complete" | "review") {
    return apiClient.post<LessonSession>(`/api/learning/sessions/${sessionId}/assessment/action`, { action });
  },
  adaptive(sessionId: string) {
    return apiClient.get<LessonSession>(`/api/learning/sessions/${sessionId}/adaptive`);
  },
  adaptiveAction(sessionId: string, action: "understood" | "not_understood" | "try_another" | "continue" | "test_me") {
    return apiClient.post<LessonSession>(`/api/learning/sessions/${sessionId}/adaptive/action`, { action });
  },
  dyslexia(sessionId: string) {
    return apiClient.get<LessonSession>(`/api/learning/sessions/${sessionId}/dyslexia`);
  },
  dyslexiaAction(
    sessionId: string,
    body: {
      action: string;
      word?: string;
      segmentId?: string;
      note?: string;
      fontSize?: DyslexiaFontSize;
      lineSpacing?: DyslexiaLineSpacing;
      speechRate?: number;
      highlightCurrent?: boolean;
      autoRead?: boolean;
      wordClickEnabled?: boolean;
    },
  ) {
    return apiClient.post<LessonSession>(`/api/learning/sessions/${sessionId}/dyslexia/action`, body);
  },
};
