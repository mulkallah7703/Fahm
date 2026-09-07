import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AnswerFeedback } from "../components/assessment/AnswerFeedback";
import { AssessmentHeader } from "../components/assessment/AssessmentHeader";
import { AssessmentNavigation } from "../components/assessment/AssessmentNavigation";
import { AssessmentProgress } from "../components/assessment/AssessmentProgress";
import { AssessmentResult } from "../components/assessment/AssessmentResult";
import { LearningPulsePanel } from "../components/assessment/LearningPulsePanel";
import { NextStepCard } from "../components/assessment/NextStepCard";
import { QuestionCard } from "../components/assessment/QuestionCard";
import { ReviewRecommendation } from "../components/assessment/ReviewRecommendation";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { ErrorState } from "../components/common/ErrorState";
import { useAssessmentActions } from "../hooks/useAssessment";
import { useAudioPlayback } from "../hooks/useAudioPlayback";
import { useLesson } from "../hooks/useLesson";
import { useStudentMeta } from "../hooks/useStudentMeta";
import { isTypingTarget } from "../services/audio/audioState";
import "../components/common/common.css";
import "../components/lesson/lesson.css";
import "../components/assessment/assessment.css";

interface ShellContext {
  openMenu: () => void;
}

export function VerifyUnderstandingPage({
  sessionId,
  lesson,
}: {
  sessionId: string | undefined;
  lesson: ReturnType<typeof useLesson>;
}) {
  const { openMenu } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const { setMeta } = useStudentMeta();
  const actions = useAssessmentActions(sessionId, lesson.run);
  const audio = useAudioPlayback();
  const [selected, setSelected] = useState("");
  const startedAt = useRef(Date.now());
  const questionRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const data = lesson.data;
  const assessment = data?.assessment ?? null;
  const question = assessment?.question ?? data?.question ?? null;

  useEffect(() => {
    if (!data) return;
    setMeta({
      pageReady: {
        title: data.material.title,
        pageNumber: data.material.pageNumber,
        conceptCount: data.content.terms.length,
        wordCount: null,
      },
      lessonSteps: (assessment?.items ?? []).map((item) => ({
        title: item.conceptName ?? "سؤال",
        status:
          item.status === "correct"
            ? "completed"
            : item.status === "current"
              ? "in_progress"
              : item.status === "incorrect"
                ? "needs_review"
                : "not_started",
      })),
      lessonStepsLabel: "الأسئلة",
      lessonModeName: data.mode.name,
      changeModeHref: `/lesson/${data.material.id}/mode`,
    });
    return () =>
      setMeta({
        pageReady: null,
        lessonSteps: null,
        lessonStepsLabel: null,
        lessonModeName: null,
        changeModeHref: null,
      });
  }, [data, assessment, setMeta]);

  useEffect(() => {
    questionRef.current?.focus();
    setSelected("");
    startedAt.current = Date.now();
  }, [question?.id]);

  useEffect(() => {
    if (data?.feedback) feedbackRef.current?.focus();
  }, [data?.feedback]);

  const submit = useCallback(() => {
    if (!question || !selected || assessment?.answered) return;
    const seconds = Math.round((Date.now() - startedAt.current) / 1000);
    void lesson.answer(question.id, selected, seconds);
  }, [assessment?.answered, lesson, question, selected]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const options = question?.options ?? [];
      if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
        const index = Math.max(0, options.indexOf(selected));
        setSelected(options[Math.min(options.length - 1, index + 1)] ?? selected);
      } else if (event.key === "ArrowUp" || event.key === "ArrowRight") {
        const index = Math.max(0, options.indexOf(selected));
        setSelected(options[Math.max(0, index - 1)] ?? selected);
      } else if (event.key === "Enter" && selected && question && !assessment?.answered) {
        submit();
      } else if (event.key.toLowerCase() === "h") void lesson.requestHint();
      else if (event.key.toLowerCase() === "n") void actions.next();
      else if (event.key.toLowerCase() === "p") void actions.previous();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions, assessment?.answered, lesson, question, selected, submit]);

  useEffect(() => {
    return () => audio.stop();
    // Stop speech only when leaving the assessment, not on every audio state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (!data || !assessment) {
    return (
      <ErrorState
        title="تعذر إعداد اختبار الفهم."
        message={lesson.error ?? "يمكنك متابعة الدرس."}
        onRetry={() => void lesson.reload()}
      />
    );
  }

  const modeClass =
    data.mode.code === "dyslexia" ? "verify-dyslexia" : data.mode.code === "focus" ? "verify-focus" : "";
  const atEnd = assessment.progress.current >= assessment.progress.total && assessment.progress.total > 0;

  return (
    <main className={`verify-wrap ${modeClass}`} lang="ar" dir="rtl">
      <AssessmentHeader
        title={data.material.title}
        progressLabel={assessment.progress.label}
        materialId={data.material.id}
        onOpenMenu={openMenu}
      />

      <p className="sr-only" aria-live="polite">
        {lesson.busy ?? ""}
        {data.feedback ? ` ${data.feedback.message}` : ""}
      </p>
      {lesson.error ? <p className="status-err" role="alert">{lesson.error}</p> : null}
      {data.adaptationMessage ? <p className="mode-hint" role="status">{data.adaptationMessage}</p> : null}

      {assessment.emptyMessage ? (
        <Card>
          <p>{assessment.emptyMessage}</p>
          <Button type="button" onClick={() => void actions.review()}>
            متابعة الدرس
          </Button>
        </Card>
      ) : assessment.summary ? (
        <AssessmentResult
          assessment={assessment}
          onReview={() => void actions.review()}
          onCompleteLesson={() => void lesson.complete()}
          onHome={() => navigate("/")}
        />
      ) : (
        <div className="verify-page">
          <aside>
            <LearningPulsePanel assessment={assessment} />
          </aside>
          <article>
            <AssessmentProgress label={assessment.progress.label} />
            <p>لنرى ما الذي أصبح واضحًا لديك.</p>
            {data.mode.code === "blind" || data.mode.code === "dyslexia" ? (
              <Button
                variant="ghost"
                type="button"
                onClick={() =>
                  void audio.play({
                    text: `${question?.text ?? ""} ${question?.options?.join("، ") ?? ""}`,
                    rate: data.dyslexia?.speechRate ?? data.blind?.speechRate ?? 1,
                    voiceURI: audio.voiceURI,
                  })
                }
              >
                اقرأ السؤال
              </Button>
            ) : null}
            <QuestionCard
              question={question}
              selected={selected}
              answered={assessment.answered}
              feedbackType={data.feedback?.type ?? null}
              headingRef={questionRef}
              onSelect={setSelected}
            />
            <AnswerFeedback feedback={data.feedback} hint={lesson.hint} regionRef={feedbackRef} />
            <NextStepCard
              canSubmit={Boolean(selected) && !assessment.answered}
              answered={assessment.answered}
              atEnd={atEnd}
              canPrevious={assessment.progress.current > 1}
              showReviewHelp={data.feedback?.type === "incorrect"}
              busy={Boolean(lesson.busy)}
              onSubmit={submit}
              onHint={() => void lesson.requestHint()}
              onExplain={() => void lesson.simplify()}
              onExample={() => void lesson.example()}
              onPrevious={() => void actions.previous()}
              onNext={() => void actions.next()}
              onComplete={() => void actions.complete()}
            />
          </article>
          <aside>
            <AssessmentNavigation items={assessment.items} />
            <ReviewRecommendation text={assessment.recommendation} />
          </aside>
        </div>
      )}
    </main>
  );
}
