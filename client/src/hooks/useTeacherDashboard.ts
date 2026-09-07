import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { teacherApi } from "../services/teacherApi";
import { ApiError, type TeacherDashboard, type TeacherRange } from "../types";

export function useTeacherDashboard(initial: TeacherRange = "week") {
  const navigate = useNavigate();
  const [data, setData] = useState<TeacherDashboard | null>(null);
  const [range, setRange] = useState<TeacherRange>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextRange = range) => {
    setLoading(true);
    setError(null);
    try {
      setData(await teacherApi.dashboard(nextRange));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setError("هذه الصفحة مخصصة للمعلمين.");
        setData(null);
        return;
      }
      setError(err instanceof ApiError ? err.message : "تعذر تحميل لوحة المعلم.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [navigate, range]);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  return { data, loading, error, range, setRange, reload: () => void load(range) };
}
