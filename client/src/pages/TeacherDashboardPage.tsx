import { useEffect } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { ErrorState } from "../components/common/ErrorState";
import { Skeleton } from "../components/common/Skeleton";
import { bandMeta, cellLabel, exportCsv, studentNoun } from "../components/teacher/teacherView";
import { useStudentMeta } from "../hooks/useStudentMeta";
import { useTeacherDashboard } from "../hooks/useTeacherDashboard";
import { modeLabel, relativeTimeAr } from "../utils/format";
import "../components/common/common.css";
import "../components/lesson/lesson.css";
import "../components/teacher/teacher.css";

interface ShellContext {
  openMenu: () => void;
}

export function TeacherDashboardPage() {
  const { openMenu } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const { setMeta } = useStudentMeta();
  const dash = useTeacherDashboard();
  const data = dash.data;

  useEffect(() => {
    if (!data) return;
    setMeta({
      displayName: data.teacher.name,
      classInfo: {
        kicker: "الصف",
        title: [data.classInfo.subject, data.classInfo.schoolName].filter(Boolean).join(" • ") || "طلابك",
        detail: studentNoun(data.classInfo.assignedCount),
      },
    });
    return () => setMeta({ classInfo: null });
  }, [data, setMeta]);

  if (dash.loading) {
    return (
      <div aria-busy="true" aria-live="polite">
        <Skeleton height="36px" width="260px" />
        <Skeleton height="110px" />
        <Skeleton height="280px" />
      </div>
    );
  }

  if (!data) {
    return <ErrorState title="تعذر تحميل لوحة المعلم." message={dash.error ?? "حاول مرة أخرى."} onRetry={dash.reload} />;
  }

  const title = data.scope.material ? `رؤى تعلم الطلاب — ${data.scope.material.title}` : "رؤى تعلم الطلاب";
  const maxReview = Math.max(1, ...data.reviewPriority.map((item) => item.affectedStudents));

  const download = () => {
    const blob = new Blob([exportCsv(data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fahm-teacher-dashboard.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="teacher-wrap" lang="ar" dir="rtl">
      <header className="teacher-header">
        <div>
          <Button className="menu-toggle" variant="ghost" type="button" onClick={openMenu}>القائمة</Button>
          <div className="mode-chip">TEACHER</div>
          <h1>{title}</h1>
          <p className="lesson-meta">آخر تحديث {relativeTimeAr(data.updatedAt)}</p>
        </div>
        <div className="teacher-actions">
          <div className="teacher-toggle" role="group" aria-label="الفترة">
            <button type="button" aria-pressed={dash.range === "week"} onClick={() => dash.setRange("week")}>هذا الأسبوع</button>
            <button type="button" aria-pressed={dash.range === "month"} onClick={() => dash.setRange("month")}>الشهر</button>
          </div>
          <Button type="button" variant="ghost" onClick={dash.reload}>تحديث</Button>
          <Button type="button" variant="ghost" onClick={download}>تصدير</Button>
        </div>
      </header>
      <p className="sr-only" aria-live="polite">{dash.loading ? "جاري تحديث البيانات" : dash.error ?? ""}</p>
      {dash.error ? <p className="status-err" role="alert">{dash.error}</p> : null}

      <section className="teacher-kpis" aria-label="مؤشرات الصف">
        <Card className="teacher-kpi">
          <p className="step-kicker">إكمال الدرس</p>
          <strong>{data.empty.students ?? data.overview.completionLabel}</strong>
        </Card>
        <Card className="teacher-kpi">
          <p className="step-kicker">متوسط الفهم</p>
          <strong className={data.overview.averageUnderstanding !== null ? "good" : ""}>
            {data.overview.averageUnderstandingLabel}
          </strong>
        </Card>
        <Card className="teacher-kpi">
          <p className="step-kicker">يحتاجون شرحًا إضافيًا</p>
          <strong className="warn">{data.overview.needsAdditionalExplanation}</strong>
        </Card>
        <Card className="teacher-kpi">
          <p className="step-kicker">طلبات إعادة الشرح</p>
          <strong>{data.overview.explanationRequests}</strong>
        </Card>
      </section>

      <div className="teacher-grid">
        <Card>
          <p className="step-kicker">حالة الطلاب</p>
          <div className="legend">
            <span>● مفهوم</span>
            <span>▲ يحتاج مراجعة</span>
            <span>■ شرح إضافي</span>
            <span>○ لم يُقَيَّم بعد</span>
          </div>
          {data.empty.students ? <p>{data.empty.students}</p> : null}
          <div className="teacher-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  {data.conceptColumns.map((column) => <th key={column.conceptId}>{column.name}</th>)}
                  <th>الوضع المفضل</th>
                  <th>آخر نشاط</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((student) => (
                  <tr key={student.studentId}>
                    <td>
                      <button type="button" className="row" onClick={() => navigate(`/teacher/students/${student.studentId}`)}>
                        {student.name}
                      </button>
                    </td>
                    {student.cells.map((cell) => {
                      const meta = bandMeta(cell.band);
                      const concept = data.conceptColumns.find((item) => item.conceptId === cell.conceptId)?.name ?? "";
                      return (
                        <td key={cell.conceptId}>
                          <span aria-label={cellLabel(student.name, concept, cell.band)}>
                            <span aria-hidden="true">{meta.icon}</span> {meta.label}
                          </span>
                        </td>
                      );
                    })}
                    <td>{modeLabel(student.modeCode, student.modeName)}</td>
                    <td>{student.lastActivityAt ? relativeTimeAr(student.lastActivityAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            {data.students.length} من {data.studentTotal} طالبًا
            {" · "}
            <Link to="/teacher/students">عرض الجميع</Link>
          </p>
        </Card>

        <aside>
          <Card>
            <p className="step-kicker">أكثر المفاهيم التي تحتاج مراجعة</p>
            {data.empty.review ? <p>{data.empty.review}</p> : data.reviewPriority.map((item) => (
              <div key={item.conceptId} className="review-row">
                <strong>{item.name}</strong>
                <p className="muted">{studentNoun(item.affectedStudents)} · {item.band}</p>
                <div className="review-bar" aria-hidden="true">
                  <div className="review-fill" style={{ width: `${Math.round((item.affectedStudents / maxReview) * 100)}%` }} />
                </div>
              </div>
            ))}
          </Card>
          <Card>
            <p className="step-kicker">توزيع الأوضاع</p>
            {data.modeDistribution.length === 0 ? <p>لا توجد بيانات كافية بعد.</p> : (
              <>
                <div className="mode-stack" aria-hidden="true">
                  {data.modeDistribution.map((item) => (
                    <div key={item.code} className="mode-seg" style={{ width: `${item.percent}%`, background: item.code === "adaptive" ? "var(--accent)" : item.code === "focus" ? "var(--warning)" : item.code === "dyslexia" ? "var(--success)" : "var(--danger)" }} />
                  ))}
                </div>
                <ul>
                  {data.modeDistribution.map((item) => (
                    <li key={item.code}>{item.name}: {item.percent}%</li>
                  ))}
                </ul>
              </>
            )}
          </Card>
          <Card>
            <p className="step-kicker">اقتراح فَهْم</p>
            {data.recommendations.map((item) => (
              <p key={item.id} className="teacher-insight">{item.text}</p>
            ))}
          </Card>
          <div className="teacher-actions">
            {data.actions.review ? (
              <Link className="btn btn-primary" to="/teacher/review">ابدأ مراجعة للصف</Link>
            ) : null}
            <Button type="button" variant="ghost" disabled>
              أرسل ملاحظة لأولياء الأمور
            </Button>
          </div>
          <p className="muted">إرسال الملاحظات لولي الأمر غير متاح في النظام الحالي.</p>
        </aside>
      </div>
    </main>
  );
}
