import { Link, useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { EmptyState } from "../common/EmptyState";
import { conceptCountLabel, modeLabel, relativeTimeAr } from "../../utils/format";
import type { RecentLesson } from "../../types";

interface Props {
  lessons: RecentLesson[];
}

export function RecentLessons({ lessons }: Props) {
  const navigate = useNavigate();

  return (
    <section aria-labelledby="recent-lessons-title">
      <div className="section-head">
        <h2 id="recent-lessons-title">آخر الدروس</h2>
        <Link className="history-link" to="/history">
          السجل الكامل
        </Link>
      </div>
      {lessons.length === 0 ? (
        <Card>
          <EmptyState
            title="لا توجد دروس بعد."
            description="ابدأ برفع أول صفحة لتبدأ رحلة التعلم."
            action={
              <Button type="button" onClick={() => navigate("/lesson/new")}>
                ابدأ الآن
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="lesson-list">
          {lessons.map((lesson) => (
            <Card as="article" className="lesson-item" key={lesson.sessionId}>
              <div>
                <h3>
                  {lesson.title}
                  {lesson.pageNumber ? `، صفحة ${lesson.pageNumber}` : ""}
                </h3>
                <p>
                  {[
                    lesson.subject,
                    relativeTimeAr(lesson.lastAccessedAt),
                    conceptCountLabel(lesson.conceptCount),
                    modeLabel(lesson.modeCode, lesson.modeName),
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="dots" aria-hidden="true">
                  <span className="dot warn" />
                  <span className="dot bad" />
                  <span className="dot good" />
                </div>
                <Link
                  className="thumb"
                  to={lesson.materialId ? `/lesson/${lesson.materialId}/analyze` : `/lesson/${lesson.sessionId}`}
                  aria-label="فتح التحليل"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
