import type { LearningModeCode, PageAnalysis } from "../types";
import { apiClient } from "./apiClient";

export const analysisApi = {
  get(materialId: string) {
    return apiClient.get<PageAnalysis>(`/api/materials/${materialId}/analysis`);
  },
  analyze(materialId: string, force = false) {
    return apiClient.post<PageAnalysis>(`/api/materials/${materialId}/analyze`, { force });
  },
  correctOcr(materialId: string, text: string) {
    return apiClient.patch<PageAnalysis>(`/api/materials/${materialId}/ocr`, { text });
  },
  startLearning(materialId: string, modeCode: LearningModeCode) {
    return apiClient.post<{ sessionId: string; modeCode: string }>(
      `/api/materials/${materialId}/learn`,
      { modeCode },
    );
  },
};
