import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { ErrorState } from "../components/common/ErrorState";
import { teacherApi } from "../services/teacherApi";
import { ApiError, type TeacherStudentList } from "../types";
import { modeLabel, relativeTimeAr } from "../utils/format";
import "../components/common/common.css";
import "../components/teacher/teacher.css";

interface ShellContext { openMenu: () => void }

export function TeacherStudentsPage() {
  const { openMenu } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const [data, setData] = useState<TeacherStudentList | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    teacherApi.students(page, 12, search || undefined)
      .then((next) => { if (!cancelled) { setData(next); setError(null); } })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "تعذر تحميل الطلاب.");
      });
    return () => { cancelled = true; };
  }, [page, search]);

  if (error && !data) return <ErrorState message={error} onRetry={() => setPage(1)} />;

  return (
    <main className="teacher-wrap" lang="ar" dir="rtl">
      <Button className="menu-toggle" variant="ghost" type="button" onClick={openMenu}>القائمة</Button>
      <h1>الطلاب</h1>
      <label htmlFor="teacher-search">بحث</label>
      <input id="teacher-search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
      {!data || data.students.length === 0 ? <p>لا يوجد طلاب مرتبطون بك بعد.</p> : (
        <div className="teacher-card-list">
          {data.students.map((student) => (
            <Card key={student.studentId}>
              <button type="button" className="row" onClick={() => navigate(`/teacher/students/${student.studentId}`)}>
                <strong>{student.name}</strong>
                <p>{modeLabel(student.modeCode, student.modeName)} · {student.lastActivityAt ? relativeTimeAr(student.lastActivityAt) : "بدون نشاط بعد"}</p>
              </button>
            </Card>
          ))}
        </div>
      )}
      {data && data.total > data.pageSize ? (
        <div className="teacher-actions">
          <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>السابق</Button>
          <Button type="button" variant="ghost" disabled={page * data.pageSize >= data.total} onClick={() => setPage((value) => value + 1)}>التالي</Button>
        </div>
      ) : null}
      <Link to="/teacher">عودة للنظرة العامة</Link>
    </main>
  );
}
