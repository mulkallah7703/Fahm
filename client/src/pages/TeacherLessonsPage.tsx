import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { teacherApi } from "../services/teacherApi";
import type { TeacherLessonList } from "../types";
import { relativeTimeAr } from "../utils/format";
import "../components/common/common.css";
import "../components/teacher/teacher.css";

interface ShellContext { openMenu: () => void }

export function TeacherLessonsPage() {
  const { openMenu } = useOutletContext<ShellContext>();
  const [data, setData] = useState<TeacherLessonList | null>(null);

  useEffect(() => {
    void teacherApi.lessons().then(setData);
  }, []);

  return (
    <main className="teacher-wrap" lang="ar" dir="rtl">
      <Button className="menu-toggle" variant="ghost" type="button" onClick={openMenu}>القائمة</Button>
      <h1>الدروس</h1>
      {!data || data.lessons.length === 0 ? <p>لم يبدأ الطلاب التعلم بعد.</p> : data.lessons.map((item) => (
        <Card key={item.materialId}>
          <strong>{item.title}</strong>
          <p>{item.studentCount} طلاب · {item.lastActivityAt ? relativeTimeAr(item.lastActivityAt) : ""}</p>
          <Link to={`/teacher?materialId=${item.materialId}`}>عرض الرؤى</Link>
        </Card>
      ))}
      <Link to="/teacher">عودة للنظرة العامة</Link>
    </main>
  );
}
