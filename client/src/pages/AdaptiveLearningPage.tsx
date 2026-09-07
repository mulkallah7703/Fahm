import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { AdaptiveActions } from "../components/adaptive/AdaptiveActions";
import { AdaptedExplanation } from "../components/adaptive/AdaptedExplanation";
import { AdaptiveInsightBanner } from "../components/adaptive/AdaptiveInsightBanner";
import { EvidenceMetrics } from "../components/adaptive/EvidenceMetrics";
import { StrategyLadder } from "../components/adaptive/StrategyLadder";
import { TeachingStrategyBanner } from "../components/lesson/TeachingStrategyBanner";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { ErrorState } from "../components/common/ErrorState";
import { useAdaptiveActions } from "../hooks/useAdaptiveLesson";
import { useLesson } from "../hooks/useLesson";
import { useStudentMeta } from "../hooks/useStudentMeta";
import { isTypingTarget } from "../services/audio/audioState";
import "../components/common/common.css";
import "../components/lesson/lesson.css";
import "../components/adaptive/adaptive.css";

interface ShellContext {
  openMenu: () => void;
}

export function AdaptiveLearningPage({
  sessionId,
  lesson,
}: {
  sessionId: string | undefined;
  lesson: ReturnType<typeof useLesson>;
}) {
  const { openMenu } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const { setMeta } = useStudentMeta();
  const actions = useAdaptiveActions(sessionId, lesson.run);
  const [selected, setSelected] = useState("");
  const [askText, setAskText] = useState("");
  const [announce, setAnnounce] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const lastVariant = useRef<string | null>(null);

  const data = lesson.data;
  const adaptive = data?.adaptive ?? null;

  useEffect(() => {
    if (!data || !adaptive) return;
    setMeta({
      pageReady: {
        title: data.material.title,
        pageNumber: data.material.pageNumber,
        conceptCount: data.content.terms.length,
        wordCount: null,
      },
      lessonSteps: data.steps.map((step) => ({ title: step.title, status: step.status })),
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
  }, [data, adaptive, setMeta]);

  useEffect(() => {
    if (adaptive?.insight) setAnnounce(adaptive.insight);
  }, [adaptive?.insight]);

  useEffect(() => {
    if (!adaptive?.currentVariant) return;
    if (lastVariant.current && lastVariant.current !== adaptive.currentVariant) {
      setAnnounce(`غيّر فَهْم طريقة الشرح بناءً على تفاعلك. الطريقة الجديدة: ${adaptive.currentLabel}.`);
      headingRef.current?.focus();
    }
    lastVariant.current = adaptive.currentVariant;
  }, [adaptive?.currentVariant, adaptive?.currentLabel]);

  const showQuestion = Boolean(data?.question) && data?.currentStep.type === "check_question" && !data.session.completed;

  useEffect(() => {
    if (showQuestion) questionRef.current?.focus();
  }, [showQuestion, data?.question?.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === "q") void actions.testMe();
      else if (key === "u") void actions.understood();
      else if (key === "n") void actions.notUnderstood();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!data || !adaptive) {
    return (
      <ErrorState
        title="لم يتم العثور على جلسة التعلم."
        message={lesson.error ?? "تعذر تحميل الدرس."}
        onRetry={() => void lesson.reload()}
      />
    );
  }

  const concept = data.content.terms[0]?.name ?? data.material.title;

  return (
    <main className="adaptive-wrap" lang="ar" dir="rtl">
      <header className="lesson-header">
        <div>
          <Button className="menu-toggle" variant="ghost" type="button" onClick={openMenu}>
            القائمة
          </Button>
          <div className="mode-chip">{data.mode.englishName}</div>
          <h1>{concept}</h1>
          <p className="lesson-meta">{`${data.mode.englishName} · ${data.material.title} · ${data.progress.label}`}</p>
        </div>
        <Link className="btn btn-ghost" to={`/lesson/${data.material.id}/mode`}>
          تغيير الوضع
        </Link>
      </header>
      <TeachingStrategyBanner plan={data.teachingPlan} />

      <p className="sr-only" aria-live="polite">
        {announce}
        {lesson.busy ? ` ${lesson.busy}` : ""}
      </p>
      {data.adaptationMessage ? <p className="mode-hint" role="status">{data.adaptationMessage}</p> : null}
      {lesson.error ? <p className="status-err" role="alert">{lesson.error}</p> : null}

      {data.session.completed && data.completion ? (
        <Card className="completion-card">
          <h2>{data.completion.message}</h2>
          <Button type="button" onClick={() => navigate(data.completion?.reviewNeeded ? "/review" : "/")}>
            {data.completion.reviewNeeded ? "راجع الآن" : "العودة إلى الرئيسية"}
          </Button>
        </Card>
      ) : (
        <div className="adaptive-page">
          <aside>
            <StrategyLadder strategies={adaptive.strategies} />
            <EvidenceMetrics evidence={adaptive.evidence} />
            {adaptive.history.length > 0 ? (
              <Card className="adaptive-profile">
                <p className="step-kicker">سجل التكيف</p>
                <ul className="adaptive-history">
                  {adaptive.history.map((item) => (
                    <li key={`${item.fromLabel}-${item.toLabel}-${item.reason}`}>
                      {item.fromLabel} ← {item.toLabel}
                      <p className="muted">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <Card className="adaptive-profile">
                <p className="step-kicker">ملف التعلم الشخصي</p>
                <p className="muted">سيُبنى من تفاعل هذه الجلسة فقط، دون تشخيص.</p>
              </Card>
            )}
          </aside>
          <div>
            <AdaptiveInsightBanner
              insight={adaptive.insight}
              emptyMessage={adaptive.emptyMessage}
              reasonLabel={adaptive.reasonLabel}
              actionLabel={adaptive.actionLabel}
            />
            <AdaptedExplanation
              currentLabel={adaptive.currentLabel}
              currentBlurb={adaptive.currentBlurb}
              currentExplanation={data.content.simplifiedExplanation || data.content.mainIdea}
              previousExplanation={adaptive.previousExplanation}
              visualDescription={adaptive.visualDescription}
              headingRef={headingRef}
            />
            {showQuestion ? (
              <Card className="question-card">
                <p className="step-kicker">اختبر فهمك</p>
                <h2 ref={questionRef} tabIndex={-1}>{data.question?.text}</h2>
                <div role="radiogroup" aria-label="خيارات الإجابة">
                  {data.question?.options?.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected === option}
                      className={`option-card ${selected === option ? "selected" : ""}`}
                      onClick={() => setSelected(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <Button type="button" disabled={!selected || Boolean(lesson.busy)} onClick={() => void lesson.answer(data.question!.id, selected)}>
                  أجب
                </Button>
                {data.feedback ? (
                  <div className={`feedback ${data.feedback.type}`} role="status">
                    <strong>{data.feedback.message}</strong>
                    {data.feedback.explanation ? <p>{data.feedback.explanation}</p> : null}
                  </div>
                ) : null}
              </Card>
            ) : (
              <AdaptiveActions
                busy={Boolean(lesson.busy)}
                canTryAnother={adaptive.canTryAnother}
                limitReached={adaptive.limitReached}
                onUnderstood={() => void actions.understood()}
                onNotUnderstood={() => void actions.notUnderstood()}
                onTryAnother={() => void actions.tryAnother()}
                onTestMe={() => void actions.testMe()}
              />
            )}
            <Card className="help-card">
              <p className="step-kicker">مساعدة إضافية</p>
              <div className="adaptive-action-row">
                <Button variant="ghost" type="button" onClick={() => void lesson.simplify()}>
                  أبسط
                </Button>
                <Button variant="ghost" type="button" onClick={() => void lesson.example()}>
                  مثال
                </Button>
                <Button variant="ghost" type="button" onClick={() => void lesson.requestHint()}>
                  تلميح
                </Button>
              </div>
              {lesson.hint ? <p>{lesson.hint}</p> : null}
              <label htmlFor="adaptive-ask">اسأل فَهْم</label>
              <textarea
                id="adaptive-ask"
                className="ask-input"
                value={askText}
                onChange={(event) => setAskText(event.target.value)}
                maxLength={500}
              />
              <Button variant="text" type="button" onClick={() => void lesson.ask(askText)}>
                أرسل
              </Button>
              {lesson.askReply ? <p>{lesson.askReply}</p> : null}
            </Card>
          </div>
        </div>
      )}
    </main>
  );
}
