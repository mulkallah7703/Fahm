import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { ErrorState } from "../components/common/ErrorState";
import { studentNoun } from "../components/teacher/teacherView";
import { teacherApi } from "../services/teacherApi";
import { ApiError, type TeacherReview } from "../types";
import "../components/common/common.css";
import "../components/teacher/teacher.css";

interface ShellContext { openMenu: () => void }

export function TeacherReviewPage() {
  const { openMenu } = useOutletContext<ShellContext>();
  const [data, setData] = useState<TeacherReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    teacherApi.review()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "تعذر تحميل المراجعة."));
  }, []);

  if (error && !data) return <ErrorState message={error} />;
  if (!data) return <p>جاري التحميل...</p>;

  return (
    <main className="teacher-wrap" lang="ar" dir="rtl">
      <Button className="menu-toggle" variant="ghost" type="button" onClick={openMenu}>القائمة</Button>
      <h1>مراجعة الصف</h1>
      {data.emptyMessage ? <p>{data.emptyMessage}</p> : data.concepts.map((item) => (
        <Card key={item.conceptId}>
          <h2>{item.name}</h2>
          <p>{studentNoun(item.affectedStudents)} · {item.band}</p>
          <p>متوسط الفهم: {item.averageMastery === null ? "لا توجد بيانات كافية" : `${item.averageMastery}%`}</p>
          <p>إجابات غير صحيحة: {item.incorrectAnswers} · طلبات شرح: {item.explanationRequests}</p>
          {item.materialTitle ? <p>الدرس: {item.materialTitle}</p> : null}
          <p className="teacher-insight">{item.recommendedAction}</p>
        </Card>
      ))}
      <Link to="/teacher">عودة للنظرة العامة</Link>
    </main>
  );
}
