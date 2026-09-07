import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../types";
import "../components/common/common.css";
import "./auth.css";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to={user.role === "teacher" ? "/teacher" : "/"} replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر تسجيل الدخول.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <Card className="auth-card">
        <div className="auth-mark" aria-hidden="true">ف</div>
        <p className="page-kicker" style={{ textAlign: "center" }}>FAHM</p>
        <h1>مرحباً بك في فَهْم</h1>
        <p className="lead muted">كل عقل يتعلم بطريقته.</p>
        <form onSubmit={(event) => void onSubmit(event)}>
          <div className="field">
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">كلمة المرور</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? <p className="status-err" role="alert">{error}</p> : null}
          <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "جاري الدخول..." : "دخول"}
          </Button>
        </form>
        <p className="auth-switch muted">
          ليس لديك حساب؟ <Link to="/register">إنشاء حساب طالب</Link>
        </p>
      </Card>
    </div>
  );
}
