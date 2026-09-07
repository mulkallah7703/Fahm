import type { HistoryFilter, HistoryListResult, HistorySessionDetail } from "../types";
import { apiClient } from "./apiClient";

export function historyListPath(input: {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: HistoryFilter;
}): string {
  const params = new URLSearchParams();
  params.set("page", String(input.page ?? 1));
  params.set("pageSize", String(input.pageSize ?? 20));
  params.set("filter", input.filter ?? "all");
  const search = input.search?.trim() ?? "";
  if (search) params.set("search", search);
  return `/api/history?${params.toString()}`;
}

export const historyApi = {
  list(input: { page?: number; pageSize?: number; search?: string; filter?: HistoryFilter } = {}) {
    return apiClient.get<HistoryListResult>(historyListPath(input));
  },
  session(sessionId: string) {
    return apiClient.get<HistorySessionDetail>(`/api/history/${sessionId}`);
  },
};
