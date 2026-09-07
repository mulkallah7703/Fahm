import { ApiError, type ApiResponse } from "../types";

const TIMEOUT_MS = 20_000;

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = new Headers(init.headers);
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(path, {
      ...init,
      headers,
      credentials: "include",
      signal: controller.signal,
    });

    let payload: ApiResponse<T> | null = null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      payload = (await response.json()) as ApiResponse<T>;
    }

    if (!response.ok || !payload || payload.success === false) {
      const message =
        payload && payload.success === false
          ? payload.error.message
          : networkMessage(response.status);
      const code =
        payload && payload.success === false ? payload.error.code : "HTTP_ERROR";
      throw new ApiError(message, response.status, code);
    }

    return payload.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("انتهت مهلة الطلب. حاول مرة أخرى.", 408, "TIMEOUT");
    }
    throw new ApiError("تحقق من اتصال الإنترنت وحاول مرة أخرى.", 0, "NETWORK");
  } finally {
    window.clearTimeout(timeout);
  }
}

function networkMessage(status: number): string {
  if (status === 401) return "يلزم تسجيل الدخول للمتابعة.";
  if (status === 403) return "لا تملك صلاحية الوصول إلى هذا المورد.";
  if (status >= 500) return "تعذر إكمال الطلب حالياً.";
  return "تعذر إكمال الطلب.";
}

export const apiClient = {
  get<T>(path: string) {
    return request<T>(path, { method: "GET" });
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body ?? {}),
    });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body ?? {}),
    });
  },
  delete<T>(path: string) {
    return request<T>(path, { method: "DELETE" });
  },
};
