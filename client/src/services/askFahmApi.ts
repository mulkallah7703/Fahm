import type { AskFahmExperience } from "../types";
import { apiClient } from "./apiClient";

export const askFahmApi = {
  get(sessionId: string) {
    return apiClient.get<AskFahmExperience>(`/api/learning/sessions/${sessionId}/ask`);
  },
  send(sessionId: string, message: string, conceptId?: string) {
    return apiClient.post<AskFahmExperience>(`/api/learning/sessions/${sessionId}/ask`, {
      message,
      conceptId,
    });
  },
  action(sessionId: string, action: "simplify" | "example" | "listen" | "test_me" | "show_map") {
    return apiClient.post<AskFahmExperience>(`/api/learning/sessions/${sessionId}/ask/action`, { action });
  },
};
