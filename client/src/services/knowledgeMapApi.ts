import type { KnowledgeMapAction, KnowledgeMapConceptDetail, KnowledgeMapDto } from "../types";
import { apiClient } from "./apiClient";

export const knowledgeMapApi = {
  student() {
    return apiClient.get<KnowledgeMapDto>("/api/knowledge-map");
  },
  session(sessionId: string) {
    return apiClient.get<KnowledgeMapDto>(`/api/learning/sessions/${sessionId}/map`);
  },
  concept(sessionId: string, conceptId: string) {
    return apiClient.get<KnowledgeMapConceptDetail>(
      `/api/learning/sessions/${sessionId}/map/concepts/${conceptId}`,
    );
  },
  action(sessionId: string, action: KnowledgeMapAction, conceptId?: string) {
    return apiClient.post<KnowledgeMapDto>(`/api/learning/sessions/${sessionId}/map/action`, {
      action,
      conceptId,
    });
  },
};
