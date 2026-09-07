import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../types";
import "../components/common/common.css";
import "./auth.css";

export function RegisterPage() {
  const { user, loading, register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        firstName,
        lastName: lastName || undefined,
        gradeLevel: gradeLevel || undefined,
        email,
        password,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذر إنشاء الحساب.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <Card className="auth-card">
        <div className="auth-mark" aria-hidden="true">ف</div>
        <h1>إنشاء حساب طالب</h1>
        <p className="lead muted">سجّل لتبدأ رحلة التعلم مع فَهْم.</p>
        <form onSubmit={(event) => void onSubmit(event)}>
          <div className="field">
            <label htmlFor="firstName">الاسم الأول</label>
            <input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="lastName">اسم العائلة</label>
            <input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="gradeLevel">الصف</label>
            <input
              id="gradeLevel"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="مثل: السادس أ"
            />
          </div>
          <div className="field">
            <label htmlFor="email">البريد الإلكتروني</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">كلمة المرور</label>
            <input
              id="password"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="status-err" role="alert">{error}</p> : null}
          <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "جاري الإنشاء..." : "إنشاء الحساب"}
          </Button>
        </form>
        <p className="auth-switch muted">
          لديك حساب؟ <Link to="/login">تسجيل الدخول</Link>
        </p>
      </Card>
    </div>
  );
}
