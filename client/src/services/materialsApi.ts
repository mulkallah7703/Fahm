import type { UploadResponse } from "../types";
import { apiClient } from "./apiClient";

export const materialsApi = {
  upload(file: File) {
    const body = new FormData();
    body.append("file", file);
    return apiClient.post<UploadResponse>("/api/materials/upload", body);
  },
  createFromText(text: string, title?: string) {
    return apiClient.post<UploadResponse>("/api/materials/text", { text, title });
  },
};
