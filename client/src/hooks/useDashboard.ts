import { useCallback, useEffect, useState } from "react";
import { dashboardApi } from "../services/dashboardApi";
import { ApiError, type DashboardData } from "../types";
import { useAuth } from "./useAuth";

export function useDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (user?.role === "teacher") {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await dashboardApi.get();
      setData(next);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "تعذر تحميل بيانات التعلم.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}
