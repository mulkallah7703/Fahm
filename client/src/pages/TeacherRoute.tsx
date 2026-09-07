import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function TeacherRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "teacher") {
    return (
      <main lang="ar" dir="rtl">
        <h1>غير مسموح</h1>
        <p>هذه الصفحة مخصصة للمعلمين.</p>
      </main>
    );
  }
  return children;
}
