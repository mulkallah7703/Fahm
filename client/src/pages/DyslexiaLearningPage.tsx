import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { ConceptCard } from "../components/dyslexia/ConceptCard";
import { ReadingControls } from "../components/dyslexia/ReadingControls";
import { ReadingSettings } from "../components/dyslexia/ReadingSettings";
import { TeachingStrategyBanner } from "../components/lesson/TeachingStrategyBanner";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { ErrorState } from "../components/common/ErrorState";
import { useAudioPlayback } from "../hooks/useAudioPlayback";
import { useDyslexiaActions } from "../hooks/useDyslexiaLesson";
import { useLesson } from "../hooks/useLesson";
import { useStudentMeta } from "../hooks/useStudentMeta";
import { isTypingTarget } from "../services/audio/audioState";
import type { DyslexiaSegment } from "../types";
import "../components/common/common.css";
import "../components/lesson/lesson.css";
import "../components/dyslexia/dyslexia.css";

interface ShellContext {
  openMenu: () => void;
}

function renderSegmentText(
  segment: DyslexiaSegment,
  vocabulary: { conceptId: string; name: string }[],
  onWord: (word: string) => void,
  enabled: boolean,
) {
  if (!enabled || vocabulary.length === 0) return segment.text;
  const names = vocabulary.map((item) => item.name).filter(Boolean).sort((a, b) => b.length - a.length);
  const parts: Array<{ text: string; concept?: string }> = [{ text: segment.text }];
  for (const name of names) {
    const next: typeof parts = [];
    for (const part of parts) {
      if (part.concept || !part.text.includes(name)) {
        next.push(part);
        continue;
      }
      const bits = part.text.split(name);
      bits.forEach((bit, index) => {
        if (bit) next.push({ text: bit });
        if (index < bits.length - 1) next.push({ text: name, concept: name });
      });
    }
    parts.splice(0, parts.length, ...next);
  }
  return parts.map((part, index) =>
    part.concept ? (
      <button
        key={`${part.concept}-${index}`}
        type="button"
        className="concept-mark"
        onClick={() => onWord(part.concept!)}
      >
        {part.text}
      </button>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  );
}

export function DyslexiaLearningPage({
  sessionId,
  lesson,
}: {
  sessionId: string | undefined;
  lesson: ReturnType<typeof useLesson>;
}) {
  const { openMenu } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const { setMeta } = useStudentMeta();
  const actions = useDyslexiaActions(sessionId, lesson.run);
  const audio = useAudioPlayback();
  const [selected, setSelected] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [explainOpen, setExplainOpen] = useState(true);
  const autoArmed = useRef(false);
  const pendingAutoPlay = useRef(false);
  const handledCompleteId = useRef<string | null>(null);
  const lastReadId = useRef<string | null>(null);
  const currentLineRef = useRef<HTMLParagraphElement | null>(null);
  const questionRef = useRef<HTMLHeadingElement | null>(null);

  const data = lesson.data;
  const dyslexia = data?.dyslexia ?? null;
  const current = dyslexia?.currentSegment ?? null;

  useEffect(() => {
    if (!data || !dyslexia) return;
    setMeta({
      pageReady: {
        title: data.material.title,
        pageNumber: data.material.pageNumber,
        conceptCount: dyslexia.vocabulary.length,
        wordCount: null,
      },
      lessonSteps: dyslexia.segments.map((segment, index) => ({
        title: segment.text.slice(0, 28),
        status:
          index === dyslexia.currentSegmentIndex
            ? "in_progress"
            : index < dyslexia.currentSegmentIndex
              ? "completed"
              : "not_started",
      })),
      lessonStepsLabel: "مقاطع القراءة",
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
  }, [data, dyslexia, setMeta]);

  useEffect(() => {
    if (dyslexia?.lastActionMessage) setAnnounce(dyslexia.lastActionMessage);
  }, [dyslexia?.lastActionMessage]);

  useEffect(() => {
    if (dyslexia?.wordExplain) setExplainOpen(true);
  }, [dyslexia?.wordExplain]);

  useEffect(() => {
    setNoteDraft(dyslexia?.note?.text ?? "");
  }, [dyslexia?.note?.text, current?.id]);

  const readCurrent = () => {
    if (!current) return;
    if (lastReadId.current === current.id) void actions.replay();
    lastReadId.current = current.id;
    handledCompleteId.current = null;
    setAnnounce("بدأت قراءة المقطع.");
    void audio.play({
      text: current.text,
      rate: dyslexia?.speechRate ?? 1,
      voiceURI: audio.voiceURI,
    });
  };

  useEffect(() => {
    if (audio.status !== "completed" || !current) return;
    if (handledCompleteId.current === current.id) return;
    handledCompleteId.current = current.id;
    setAnnounce("انتهت القراءة.");
    if (dyslexia?.autoRead && autoArmed.current) {
      const last = dyslexia.currentSegmentIndex >= Math.max(0, dyslexia.segments.length - 1);
      if (last) {
        autoArmed.current = false;
        return;
      }
      pendingAutoPlay.current = true;
      void actions.next();
    }
  }, [audio.status, current, dyslexia?.autoRead, dyslexia?.currentSegmentIndex, dyslexia?.segments.length, actions]);

  useEffect(() => {
    if (!pendingAutoPlay.current || !current) return;
    pendingAutoPlay.current = false;
    readCurrent();
    // Play only after an auto-read advance, not on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dyslexia?.currentSegmentIndex]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    currentLineRef.current?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [dyslexia?.currentSegmentIndex]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (event.code === "Space") {
        event.preventDefault();
        if (audio.status === "playing") audio.pause();
        else if (audio.status === "paused") audio.resume();
        else {
          autoArmed.current = Boolean(dyslexia?.autoRead);
          readCurrent();
        }
      } else if (event.key === "ArrowLeft" || key === "n") {
        audio.stop();
        void actions.next();
      } else if (event.key === "ArrowRight" || key === "p") {
        audio.stop();
        void actions.previous();
      } else if (key === "r") {
        autoArmed.current = Boolean(dyslexia?.autoRead);
        readCurrent();
      } else if (key === "s" && dyslexia?.currentConcept) void actions.simplifyWord(dyslexia.currentConcept.name);
      else if (key === "q") void actions.testMe();
      else if (event.key === "Escape") {
        setShowNote(false);
        setExplainOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    return () => audio.stop();
    // Stop speech only when leaving the lesson, not on every audio state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const nearby = useMemo(() => {
    if (!dyslexia) return [];
    const index = dyslexia.currentSegmentIndex;
    return dyslexia.segments
      .map((segment, i) => ({ segment, i }))
      .filter((item) => Math.abs(item.i - index) <= 1);
  }, [dyslexia]);

  const showQuestion = Boolean(data?.question) && data?.currentStep.type === "check_question" && !data.session.completed;

  useEffect(() => {
    if (showQuestion) questionRef.current?.focus();
  }, [showQuestion, data?.question?.id]);

  if (!data || !dyslexia) {
    return (
      <ErrorState
        title="لم يتم العثور على جلسة التعلم."
        message={lesson.error ?? "تعذر تحميل الدرس."}
        onRetry={() => void lesson.reload()}
      />
    );
  }

  const atStart = dyslexia.currentSegmentIndex <= 0;
  const atEnd = dyslexia.currentSegmentIndex >= Math.max(0, dyslexia.segments.length - 1);
  const showQuizPrompt = atEnd && dyslexia.quizReady && !showQuestion && !data.session.completed;

  const openVocab = (name: string, conceptId: string) => {
    const hits = dyslexia.segments
      .map((segment, index) => ({ segment, index }))
      .filter((item) => item.segment.conceptIds.includes(conceptId));
    const next = hits.find((item) => item.index > dyslexia.currentSegmentIndex) ?? hits[0];
    setExplainOpen(true);
    void actions.explainWord(name, next?.segment.id ?? current?.id);
  };

  return (
    <main className={`dyslexia-wrap font-${dyslexia.fontSize}`} lang="ar" dir="rtl">
      <header className="dyslexia-header">
        <div>
          <Button className="menu-toggle" variant="ghost" type="button" onClick={openMenu}>
            القائمة
          </Button>
          <div className="mode-chip">{data.mode.englishName}</div>
          <h1>{data.material.title}</h1>
          <p className="lesson-meta">{`${data.mode.englishName} · ${dyslexia.progress.label}`}</p>
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
      {audio.error ? (
        <p className="status-err" role="alert">
          تعذر تشغيل الصوت. استمر بالقراءة.
        </p>
      ) : null}

      {data.session.completed && data.completion ? (
        <Card className="completion-card">
          <h2>{data.completion.message}</h2>
          <Button type="button" onClick={() => navigate(data.completion?.reviewNeeded ? "/review" : "/")}>
            {data.completion.reviewNeeded ? "راجع الآن" : "العودة إلى الرئيسية"}
          </Button>
        </Card>
      ) : (
        <div className="dyslexia-page">
          <article className="reading-column">
            <ReadingControls
              atStart={atStart}
              atEnd={atEnd}
              onPrevious={() => {
                audio.stop();
                void actions.previous();
              }}
              onRead={() => {
                autoArmed.current = Boolean(dyslexia.autoRead);
                readCurrent();
              }}
              onNext={() => {
                audio.stop();
                void actions.next();
              }}
            />

            {dyslexia.emptyMessage ? (
              <p className="mode-hint">{dyslexia.emptyMessage}</p>
            ) : (
              <section
                className="reading-board"
                style={{ lineHeight: dyslexia.lineSpacing }}
                aria-label="نص القراءة"
              >
                {dyslexia.highlightCurrent ? (
                  <p className="reading-kicker" aria-hidden="true">
                    المقطع الحالي
                  </p>
                ) : null}
                {(dyslexia.highlightCurrent ? nearby : dyslexia.segments.map((segment, i) => ({ segment, i }))).map(
                  ({ segment, i }) => {
                    const active = i === dyslexia.currentSegmentIndex;
                    return (
                      <p
                        key={segment.id}
                        ref={active ? currentLineRef : undefined}
                        className={`reading-line ${active && dyslexia.highlightCurrent ? "current" : ""}`}
                        aria-current={active ? "true" : undefined}
                        tabIndex={active ? 0 : -1}
                        onClick={(event) => {
                          if ((event.target as HTMLElement).closest(".concept-mark")) return;
                          if (!active) void actions.focusSegment(segment.id);
                        }}
                      >
                        {renderSegmentText(
                          segment,
                          dyslexia.vocabulary,
                          (word) => {
                            if (dyslexia.wordClickEnabled) {
                              setExplainOpen(true);
                              void actions.explainWord(word, segment.id);
                            }
                          },
                          dyslexia.wordClickEnabled,
                        )}
                      </p>
                    );
                  },
                )}
              </section>
            )}

            {showQuizPrompt ? (
              <p className="mode-hint">
                هل تريد أن أختبر فهمك؟
                <Button variant="ghost" type="button" onClick={() => void actions.testMe()}>
                  اختبرني
                </Button>
              </p>
            ) : null}

            {showQuestion ? (
              <Card className="question-card">
                <p className="step-kicker">اختبر نفسك</p>
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
                  <div className={`feedback ${data.feedback.type}`} role="status" aria-live="polite">
                    <strong>{data.feedback.message}</strong>
                    {data.feedback.explanation ? <p>{data.feedback.explanation}</p> : null}
                  </div>
                ) : null}
              </Card>
            ) : null}

            <p className="reading-footer">
              أكملت {dyslexia.progress.current} من {dyslexia.progress.total}. خذ وقتك.
            </p>
          </article>

          <aside>
            {explainOpen ? (
            <ConceptCard
              concept={dyslexia.currentConcept}
              explain={dyslexia.wordExplain}
              onListen={() =>
                void audio.play({
                  text: dyslexia.wordExplain?.simpleExplanation ?? dyslexia.currentConcept?.definition ?? "",
                  rate: dyslexia.speechRate ?? 1,
                  voiceURI: audio.voiceURI,
                })
              }
              onSimplify={() => {
                const word = dyslexia.wordExplain?.term ?? dyslexia.currentConcept?.name;
                if (word) void actions.simplifyWord(word);
              }}
              onSaveNote={() => setShowNote(true)}
            />
            ) : null}
            <Card>
              <p className="step-kicker">كلمات هذا الدرس</p>
              {dyslexia.vocabulary.length === 0 ? (
                <p className="muted">لا توجد مصطلحات رئيسية محددة لهذه الصفحة.</p>
              ) : (
                <div className="setting-row">
                  {dyslexia.vocabulary.map((item) => (
                    <button
                      key={item.conceptId}
                      type="button"
                      className={`vocab-chip ${dyslexia.currentConcept?.conceptId === item.conceptId ? "selected" : ""}`}
                      onClick={() => openVocab(item.name, item.conceptId)}
                    >
                      {item.name}
                      {item.occurrences > 1 ? ` — ${item.occurrences} مواضع` : ""}
                    </button>
                  ))}
                </div>
              )}
            </Card>
            {showNote ? (
              <Card className="note-box">
                <label htmlFor="dyslexia-note">ملاحظة هذا المقطع</label>
                <textarea
                  id="dyslexia-note"
                  className="ask-input"
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  maxLength={500}
                />
                <div className="reading-controls">
                  <Button type="button" onClick={() => void actions.saveNote(noteDraft, current?.id)}>
                    حفظ
                  </Button>
                  <Button variant="text" type="button" onClick={() => setShowNote(false)}>
                    إلغاء
                  </Button>
                </div>
              </Card>
            ) : null}
            <ReadingSettings
              fontSize={dyslexia.fontSize}
              lineSpacing={dyslexia.lineSpacing}
              speechRate={dyslexia.speechRate}
              highlightCurrent={dyslexia.highlightCurrent}
              autoRead={dyslexia.autoRead}
              wordClickEnabled={dyslexia.wordClickEnabled}
              onFont={(value) => void actions.setFont(value)}
              onSpacing={(value) => void actions.setSpacing(value)}
              onSpeechRate={(value) => void actions.setSpeechRate(value)}
              onHighlight={(value) => void actions.setHighlight(value)}
              onAutoRead={(value) => {
                autoArmed.current = value;
                void actions.setAutoRead(value);
              }}
              onWordClick={(value) => void actions.setWordClick(value)}
              onReset={() => void actions.resetPrefs()}
            />
            <p>
              <Link to={`/lesson/${data.material.id}/mode`}>تغيير الوضع</Link>
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
