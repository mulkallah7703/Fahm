import type {
  CatalogMode,
  LearningModeCode,
  LearningSessionState,
  LearningSetup,
  ModeRecommendation,
  TeachingStrategyContract,
} from "../types";
import { apiClient } from "./apiClient";

export const learningApi = {
  modes() {
    return apiClient.get<{ modes: CatalogMode[] }>("/api/learning/modes");
  },
  setup(materialId: string) {
    return apiClient.get<LearningSetup>(`/api/learning/${materialId}/setup`);
  },
  recommendation(materialId: string) {
    return apiClient.get<ModeRecommendation>(`/api/learning/${materialId}/recommendation`);
  },
  session(materialId: string) {
    return apiClient.get<LearningSessionState>(`/api/learning/${materialId}/session`);
  },
  selectMode(
    materialId: string,
    body: { modeCode: LearningModeCode; adaptiveEnabled: boolean; startLesson?: boolean },
  ) {
    return apiClient.post<TeachingStrategyContract>(`/api/learning/${materialId}/mode`, body);
  },
};
