import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { ErrorState } from "../components/common/ErrorState";
import { bandMeta } from "../components/teacher/teacherView";
import { teacherApi } from "../services/teacherApi";
import { ApiError, type TeacherStudentInsight } from "../types";
import { modeLabel, pulseStatusLabel, relativeTimeAr } from "../utils/format";
import "../components/common/common.css";
import "../components/teacher/teacher.css";

interface ShellContext { openMenu: () => void }

export function TeacherStudentPage() {
  const { studentId } = useParams();
  const { openMenu } = useOutletContext<ShellContext>();
  const [data, setData] = useState<TeacherStudentInsight | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    teacherApi.student(studentId)
      .then(setData)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "لم يتم العثور على الطالب."));
  }, [studentId]);

  if (error && !data) return <ErrorState title="لم يتم العثور على الطالب." message={error} />;
  if (!data) return <p>جاري التحميل...</p>;

  return (
    <main className="teacher-wrap" lang="ar" dir="rtl">
      <Button className="menu-toggle" variant="ghost" type="button" onClick={openMenu}>القائمة</Button>
      <h1>{data.student.name}</h1>
      <p>{modeLabel(data.student.modeCode, data.student.modeName)}</p>
      {data.pulse ? <p>نبض التعلم: {data.pulse.score} · {pulseStatusLabel(data.pulse.status)}</p> : <p>لا توجد بيانات فهم كافية بعد.</p>}
      <Card>
        <p className="step-kicker">التقدم</p>
        <p>{data.progress.completedSessions} من {data.progress.sessionCount} جلسات مكتملة</p>
        <p>{data.progress.lastActivityAt ? relativeTimeAr(data.progress.lastActivityAt) : "بدون نشاط بعد"}</p>
      </Card>
      <Card>
        <p className="step-kicker">إتقان المفاهيم</p>
        {data.mastery.length === 0 ? <p>لا توجد بيانات فهم كافية بعد.</p> : data.mastery.map((item) => {
          const meta = bandMeta(item.band);
          return (
            <p key={item.conceptId}>
              <span aria-hidden="true">{meta.icon}</span> {item.name} — {item.band}
              {item.score !== null ? ` (${item.score})` : ""}
            </p>
          );
        })}
      </Card>
      <Card>
        <p className="step-kicker">آخر الإجابات</p>
        {data.recentAnswers.map((item, index) => (
          <p key={`${item.answeredAt}-${index}`}>
            {item.conceptName ?? "سؤال"} · {item.isCorrect === null ? "بدون تقييم" : item.isCorrect ? "صحيحة" : "غير صحيحة"} · {relativeTimeAr(item.answeredAt)}
          </p>
        ))}
      </Card>
      <Link to="/teacher/students">عودة للطلاب</Link>
    </main>
  );
}
