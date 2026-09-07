import type { DashboardData, RecentLesson } from "../types";
import { apiClient } from "./apiClient";

export const dashboardApi = {
  get() {
    return apiClient.get<DashboardData>("/api/dashboard");
  },
  history(limit = 20, offset = 0) {
    return apiClient.get<{ items: RecentLesson[]; total: number }>(
      `/api/history?limit=${limit}&offset=${offset}`,
    );
  },
};
