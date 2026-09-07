import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { ErrorState } from "../components/common/ErrorState";
import { Skeleton } from "../components/common/Skeleton";
import { useLesson } from "../hooks/useLesson";
import { useStudentMeta } from "../hooks/useStudentMeta";
import { AdaptiveLearningPage } from "./AdaptiveLearningPage";
import { BlindLearningPage } from "./BlindLearningPage";
import { DyslexiaLearningPage } from "./DyslexiaLearningPage";
import { VerifyUnderstandingPage } from "./VerifyUnderstandingPage";
import { TeachingExplanation } from "../components/lesson/TeachingExplanation";
import { TeachingStrategyBanner } from "../components/lesson/TeachingStrategyBanner";
import type { LessonStepStatus } from "../types";
import "../components/common/common.css";
import "../components/lesson/lesson.css";

interface ShellContext {
  openMenu: () => void;
}

function statusMark(status: LessonStepStatus): string {
  if (status === "completed") return "✓";
  if (status === "in_progress" || status === "needs_review") return "●";
  return "○";
}

export function LearningSessionPage() {
  const { sessionId } = useParams();
  const { openMenu } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const { setMeta } = useStudentMeta();
  const lesson = useLesson(sessionId);
  const [selected, setSelected] = useState("");
  const [askText, setAskText] = useState("");

  const data = lesson.data;
  const useBlind =
    data?.mode.code === "blind" || (data?.mode.code === "adaptive" && data.strategy.variant === "verbal");

  useEffect(() => {
    if (!data || useBlind || data.mode.code === "dyslexia" || data.mode.code === "adaptive" || data.assessment?.active) return;
    setMeta({
      pageReady: {
        title: data.material.title,
        pageNumber: data.material.pageNumber,
        conceptCount: data.content.terms.length,
        wordCount: null,
      },
      lessonSteps: data.steps.map((step) => ({
        title: step.title,
        status: step.status,
      })),
      lessonModeName: data.mode.name,
      changeModeHref: `/lesson/${data.material.id}/mode`,
    });
    return () =>
      setMeta({
        pageReady: null,
        lessonSteps: null,
        lessonModeName: null,
        changeModeHref: null,
      });
  }, [data, useBlind, setMeta, data?.assessment?.active]);

  if (lesson.loading) {
    return (
      <div>
        <p className="muted">فَهْم يجهز الشرح...</p>
        <Skeleton height="40px" width="240px" />
        <div style={{ height: 16 }} />
        <Skeleton height="220px" />
      </div>
    );
  }

  if (!data) {
    return (
      <ErrorState
        title="لم يتم العثور على جلسة التعلم."
        message={lesson.error ?? "تعذر تحميل الدرس."}
        onRetry={() => void lesson.reload()}
      />
    );
  }

  if (data.assessment?.active) {
    return <VerifyUnderstandingPage sessionId={sessionId} lesson={lesson} />;
  }

  if (useBlind) {
    return <BlindLearningPage sessionId={sessionId} lesson={lesson} />;
  }

  if (data.mode.code === "dyslexia") {
    return <DyslexiaLearningPage sessionId={sessionId} lesson={lesson} />;
  }

  if (data.mode.code === "adaptive") {
    return <AdaptiveLearningPage sessionId={sessionId} lesson={lesson} />;
  }

  const step = data.currentStep;
  const canAdvance = step.type !== "check_question" || step.status === "completed";
  const showQuestion = step.type === "check_question" && data.question && !data.session.completed;
  const currentLesson = data.teachingPlan?.concepts.find((item) => item.conceptId === step.conceptId) ?? data.teachingPlan?.concepts[0];

  return (
    <div>
      <header className="lesson-header">
        <div>
          <Button className="menu-toggle" variant="ghost" type="button" onClick={openMenu}>
            القائمة
          </Button>
          <div className="mode-chip">{data.mode.englishName}</div>
          <h1>{data.material.title}</h1>
          <p className="lesson-meta">
            {[data.material.subject, `صفحة ${data.material.pageNumber}`, data.mode.englishName]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </div>
        <div className="learning-mode-actions">
          <div className="progress-wrap" aria-label={`التقدم ${data.progress.label}`}>
            <p className="progress-label">{data.progress.label}</p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(data.progress.current / data.progress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <TeachingStrategyBanner plan={data.teachingPlan} />
      {lesson.error ? (
        <p className="status-err" role="alert">
          {lesson.error}
        </p>
      ) : null}
      {data.adaptationMessage ? (
        <p className="mode-hint" role="status">
          {data.adaptationMessage}
        </p>
      ) : null}
      {lesson.busy ? (
        <p className="muted" aria-live="polite">
          {lesson.busy}
        </p>
      ) : null}

      <div className="lesson-page">
        <div>
          {data.session.completed && data.completion ? (
            <Card className="completion-card">
              <h2>{data.completion.message}</h2>
              <p>
                {data.completion.pulse.current !== null
                  ? `أداءك يشير إلى فهم بمستوى ${data.completion.pulse.current}%.`
                  : "أكملنا الخطوات المتاحة من هذا الدرس."}
              </p>
              {data.completion.concepts.length > 0 ? (
                <ul>
                  {data.completion.concepts.map((concept) => (
                    <li key={concept.name}>
                      {concept.name}
                      {concept.needsReview ? " — يحتاج مراجعة" : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              {data.completion.reviewNeeded ? (
                <Button type="button" onClick={() => navigate("/review")}>
                  راجع الآن
                </Button>
              ) : (
                <Button type="button" onClick={() => navigate("/")}>
                  العودة إلى الرئيسية
                </Button>
              )}
            </Card>
          ) : (
            <>
              <Card className="teach-card">
                <p className="step-kicker">{step.title}</p>
                {step.type === "visual" ? (
                  <p className="teach-body">{data.content.visualDescription || "لا يوجد رسم موصوف في هذه الصفحة."}</p>
                ) : (
                  <TeachingExplanation
                    plan={data.teachingPlan}
                    content={data.content}
                    conceptName={currentLesson?.name}
                    nextLabel={showQuestion ? "اختبر فهمك في السؤال التالي." : "بعد أن تقرأ الفكرة، انتقل للتحقق."}
                  />
                )}
              </Card>

              {showQuestion ? (
                <Card className="question-card">
                  <p className="step-kicker">اختبر نفسك</p>
                  <h2>{data.question?.text}</h2>
                  {data.question?.options?.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`option-card ${selected === option ? "selected" : ""}`}
                      onClick={() => setSelected(option)}
                    >
                      {option}
                    </button>
                  ))}
                  {data.question?.type === "short_answer" ? (
                    <input
                      className="ask-input"
                      value={selected}
                      onChange={(event) => setSelected(event.target.value)}
                      aria-label="إجابتك"
                    />
                  ) : null}
                  <Button
                    type="button"
                    disabled={!selected || Boolean(lesson.busy)}
                    onClick={() => void lesson.answer(data.question!.id, selected)}
                  >
                    أجب
                  </Button>
                  {lesson.hint ? <p className="mode-hint">{lesson.hint}</p> : null}
                  {data.feedback ? (
                    <div className={`feedback ${data.feedback.type}`} role="status" aria-live="polite">
                      <strong>{data.feedback.message}</strong>
                      {data.feedback.explanation ? <p>{data.feedback.explanation}</p> : null}
                    </div>
                  ) : null}
                </Card>
              ) : null}

              <div className="learning-mode-footer">
                {canAdvance && !data.session.completed ? (
                  <Button type="button" disabled={Boolean(lesson.busy)} onClick={() => void lesson.advance()}>
                    التالي
                  </Button>
                ) : null}
                {data.steps.every((item) => item.status === "completed") ? (
                  <Button type="button" onClick={() => void lesson.complete()}>
                    إنهاء الدرس
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </div>

        <aside>
          <Card className="terms-card">
            <p className="step-kicker">ماذا أفعل الآن؟</p>
            <p>
              {showQuestion
                ? "أجب عن السؤال القصير لتتحقق من فهمك."
                : "اقرأ الفكرة الأساسية، ثم اطلب مثالًا أو شرحًا أبسط إن احتجت."}
            </p>
          </Card>
          <Card className="help-card">
            <p className="step-kicker">جرّب بنفسك</p>
            <div className="help-actions">
              <Button variant="ghost" type="button" onClick={() => void lesson.simplify()}>
                اشرح لي
              </Button>
              <Button variant="ghost" type="button" onClick={() => void lesson.example()}>
                مثال
              </Button>
              <Button variant="ghost" type="button" onClick={() => void lesson.requestHint()}>
                تلميح
              </Button>
            </div>
            <div className="ask-box" style={{ marginTop: 12 }}>
              <label htmlFor="ask-fahm">اسأل فَهْم</label>
              <input
                id="ask-fahm"
                className="ask-input"
                value={askText}
                onChange={(event) => setAskText(event.target.value)}
              />
              <Button
                variant="ghost"
                type="button"
                disabled={!askText.trim()}
                onClick={() => void lesson.ask(askText)}
              >
                اسأل
              </Button>
              {lesson.askReply ? <p role="status">{lesson.askReply}</p> : null}
            </div>
          </Card>
          <p>
            <Link to={`/lesson/${data.material.id}/mode`}>تغيير الوضع</Link>
          </p>
        </aside>
      </div>
    </div>
  );
}

export function LessonStepSidebarList({
  steps,
}: {
  steps: { title: string; status: LessonStepStatus }[];
}) {
  return (
    <ol className="lesson-steps">
      {steps.map((step) => (
        <li key={step.title} className={step.status}>
          <span aria-hidden="true">{statusMark(step.status)}</span>
          <span>
            {step.title}
            <span className="sr-only"> {step.status}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
