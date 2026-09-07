import type { AuthUser } from "../types";
import { apiClient } from "./apiClient";

export const authApi = {
  login(email: string, password: string) {
    return apiClient.post<{ user: AuthUser }>("/api/auth/login", { email, password });
  },
  register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    gradeLevel?: string;
  }) {
    return apiClient.post<{ user: AuthUser }>("/api/auth/register", input);
  },
  logout() {
    return apiClient.post<{ loggedOut: boolean }>("/api/auth/logout");
  },
  me() {
    return apiClient.get<{ user: AuthUser }>("/api/auth/me");
  },
};
