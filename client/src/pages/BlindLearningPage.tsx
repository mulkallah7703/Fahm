import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { AccessibleCommands } from "../components/blind/AccessibleCommands";
import { BlindAudioPlayer } from "../components/blind/BlindAudioPlayer";
import { TeachingStrategyBanner } from "../components/lesson/TeachingStrategyBanner";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { ErrorState } from "../components/common/ErrorState";
import { Skeleton } from "../components/common/Skeleton";
import { useAudioPlayback } from "../hooks/useAudioPlayback";
import { useBlindActions } from "../hooks/useBlindLesson";
import { useLesson } from "../hooks/useLesson";
import { useStudentMeta } from "../hooks/useStudentMeta";
import { isTypingTarget, splitSpokenSentences } from "../services/audio/audioState";
import "../components/common/common.css";
import "../components/lesson/lesson.css";
import "../components/blind/blind.css";

interface ShellContext {
  openMenu: () => void;
}

export function BlindLearningPage({
  sessionId,
  lesson,
}: {
  sessionId: string | undefined;
  lesson: ReturnType<typeof useLesson>;
}) {
  const { openMenu } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const { setMeta } = useStudentMeta();
  const actions = useBlindActions(sessionId, lesson.run);
  const audio = useAudioPlayback();
  const [selected, setSelected] = useState("");
  const [askText, setAskText] = useState("");
  const [showPage, setShowPage] = useState(false);
  const [announce, setAnnounce] = useState("");
  const listenedRef = useRef<string | null>(null);

  const data = lesson.data;
  const blind = data?.blind ?? null;
  const current = blind?.currentSegment ?? null;
  const sentences = useMemo(() => splitSpokenSentences(current?.text ?? ""), [current?.text]);

  useEffect(() => {
    if (!data || !blind) return;
    setMeta({
      pageReady: {
        title: data.material.title,
        pageNumber: data.material.pageNumber,
        conceptCount: data.content.terms.length,
        wordCount: null,
      },
      lessonSteps: blind.segments.map((segment, index) => ({
        title: segment.title,
        status:
          index === blind.currentSegmentIndex
            ? "in_progress"
            : index < blind.currentSegmentIndex
              ? "completed"
              : "not_started",
      })),
      lessonStepsLabel: "عناصر الصفحة",
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
  }, [data, blind, setMeta]);

  useEffect(() => {
    if (blind?.lastActionMessage) setAnnounce(blind.lastActionMessage);
  }, [blind?.lastActionMessage, current?.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (event.code === "Space") {
        event.preventDefault();
        if (audio.status === "playing") audio.pause();
        else if (audio.status === "paused") audio.resume();
        else void startPlayback();
      } else if (key === "r") void replayCurrent();
      else if (key === "n") void actions.nextSegment();
      else if (key === "p") void actions.previousSegment();
      else if (key === "e") void actions.describeDiagram();
      else if (key === "q") void actions.testMe();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    return () => audio.stop();
    // Stop speech only when leaving the lesson, not on every audio state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (audio.status === "completed" && current && listenedRef.current !== current.id) {
      listenedRef.current = current.id;
      void actions.markListened(current.id);
    }
  }, [audio.status, current, actions]);

  const startPlayback = async () => {
    if (!current || !data) return;
    setAnnounce("تم تشغيل القراءة.");
    void actions.markStarted();
    await audio.play({
      text: current.text,
      rate: blind?.speechRate ?? 1,
      voiceURI: audio.voiceURI,
      sessionId,
      segmentId: current.id,
      ttsConfigured: blind?.ttsConfigured,
    });
  };

  const replayCurrent = async () => {
    await actions.replay();
    audio.stop();
    await startPlayback();
  };

  if (lesson.loading) {
    return (
      <div>
        <p className="muted">فَهْم يجهز الشرح الصوتي...</p>
        <Skeleton height="40px" width="240px" />
        <div style={{ height: 16 }} />
        <Skeleton height="180px" />
      </div>
    );
  }

  if (!data || !blind) {
    return (
      <ErrorState
        title="لم يتم العثور على جلسة التعلم."
        message={lesson.error ?? "تعذر تجهيز الشرح الصوتي."}
        onRetry={() => void lesson.reload()}
      />
    );
  }

  const showQuestion = Boolean(data.question) && current?.type === "question" && !data.session.completed;
  const pageAlt = data.content.visualDescription || "صورة الصفحة التعليمية.";

  return (
    <div className={blind.fontSize && blind.fontSize >= 20 ? "blind-large" : undefined}>
      <header className="blind-header">
        <div>
          <Button className="menu-toggle" variant="ghost" type="button" onClick={openMenu}>
            القائمة
          </Button>
          <div className="mode-chip">{data.mode.englishName} · قارئ صوتي</div>
          <h1>{data.material.title}</h1>
          <p className="lesson-meta">
            {`صفحة ${data.material.pageNumber} · ${data.mode.englishName} · قارئ صوتي`}
          </p>
        </div>
        <div className="learning-mode-actions">
          <Link className="btn btn-ghost" to={`/lesson/${data.material.id}/mode`}>
            تغيير الوضع
          </Link>
          <div className="progress-wrap" aria-label={blind.progress.label}>
            <p className="progress-label">{blind.progress.label}</p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(blind.progress.current / Math.max(1, blind.progress.total)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>
      <TeachingStrategyBanner plan={data.teachingPlan} />

      <p className="sr-only" aria-live="polite">
        {announce}
        {lesson.busy ? ` ${lesson.busy}` : ""}
      </p>
      {data.adaptationMessage ? (
        <p className="mode-hint" role="status">
          {data.adaptationMessage}
        </p>
      ) : null}
      {lesson.error ? (
        <p className="status-err" role="alert">
          {lesson.error}
        </p>
      ) : null}
      {audio.error ? (
        <p className="status-err" role="alert">
          {audio.error} يمكنك متابعة النص.
        </p>
      ) : null}

      <div className="blind-page">
        <div>
          {data.session.completed && data.completion ? (
            <Card className="completion-card">
              <h2>{data.completion.message}</h2>
              <p>
                {data.completion.pulse.current !== null
                  ? `أداءك يشير إلى فهم بمستوى ${data.completion.pulse.current}%.`
                  : "أكملنا الخطوات المتاحة من هذا الدرس."}
              </p>
              <Button type="button" onClick={() => navigate(data.completion?.reviewNeeded ? "/review" : "/")}>
                {data.completion.reviewNeeded ? "راجع الآن" : "العودة إلى الرئيسية"}
              </Button>
            </Card>
          ) : (
            <>
              <BlindAudioPlayer
                status={audio.status}
                speechRate={blind.speechRate}
                recommendedSpeed={blind.recommendedSpeed}
                knownDuration={audio.knownDuration}
                elapsed={audio.elapsed}
                voices={audio.voices}
                voiceURI={audio.voiceURI}
                arabicAvailable={audio.arabicAvailable}
                genderSupported={audio.genderSupported}
                ttsConfigured={blind.ttsConfigured}
                progressCurrent={blind.progress.current}
                progressTotal={blind.progress.total}
                onPlay={() => void startPlayback()}
                onPause={() => {
                  audio.pause();
                  setAnnounce("تم إيقاف القراءة مؤقتًا.");
                  void actions.markPaused();
                }}
                onResume={() => {
                  audio.resume();
                  setAnnounce("تم تشغيل القراءة.");
                }}
                onStop={() => {
                  audio.stop();
                  setAnnounce("تم إيقاف القراءة.");
                }}
                onReplay={() => void replayCurrent()}
                onSpeed={(value) => void actions.setSpeed(value)}
                onVoice={audio.setVoiceURI}
              />

              <Card className="narration-card">
                <p className="now-reading">يقرأ الآن — {current?.title ?? "الشرح"}</p>
                <p className="narration-text">
                  {sentences.map((sentence, index) => (
                    <span key={`${sentence}-${index}`}>
                      {index === audio.sentenceIndex ? <mark>{sentence}</mark> : sentence}{" "}
                    </span>
                  ))}
                </p>
                {blind.detailOpen && current?.detailedAvailable ? (
                  <p className="narration-detail">{current.text}</p>
                ) : null}
              </Card>

              {showQuestion ? (
                <Card className="question-card">
                  <p className="step-kicker">اختبر نفسك</p>
                  <h2>{data.question?.text}</h2>
                  {data.question?.options?.map((option, index) => (
                    <button
                      key={option}
                      type="button"
                      className={`option-card ${selected === option ? "selected" : ""}`}
                      onClick={() => setSelected(option)}
                    >
                      الخيار {index + 1}: {option}
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
                  {data.feedback ? (
                    <div className={`feedback ${data.feedback.type}`} role="status" aria-live="polite">
                      <strong>{data.feedback.message}</strong>
                      {data.feedback.explanation ? <p>{data.feedback.explanation}</p> : null}
                    </div>
                  ) : null}
                </Card>
              ) : null}

              <div className="blind-actions learning-mode-footer">
                <Button variant="ghost" type="button" onClick={() => void actions.whereAmI()}>
                  أين أنا؟
                </Button>
                <Button variant="ghost" type="button" onClick={() => void actions.whatNow()}>
                  ماذا أتعلم الآن؟
                </Button>
                <Button variant="ghost" type="button" onClick={() => void actions.keyPoint()}>
                  ما أهم نقطة؟
                </Button>
                <Button variant="ghost" type="button" onClick={() => void replayCurrent()}>
                  أعد القراءة
                </Button>
                <Button variant="ghost" type="button" onClick={() => void actions.moreDetail()}>
                  وصف أكثر تفصيلًا
                </Button>
                <Button type="button" onClick={() => void actions.nextSegment()}>
                  التسلسل التالي
                </Button>
                <Button type="button" onClick={() => void actions.testMe()}>
                  اختبرني
                </Button>
              </div>

              <div className="ask-box">
                <label htmlFor="ask-fahm-blind">اسأل فَهْم عن هذه الصفحة</label>
                <input
                  id="ask-fahm-blind"
                  className="ask-input"
                  value={askText}
                  onChange={(event) => setAskText(event.target.value)}
                />
                <Button variant="ghost" type="button" disabled={!askText.trim()} onClick={() => void lesson.ask(askText)}>
                  اسأل
                </Button>
                {lesson.askReply ? (
                  <div>
                    <p role="status">{lesson.askReply}</p>
                    <Button
                      variant="text"
                      type="button"
                      onClick={() =>
                        void audio.play({
                          text: lesson.askReply ?? "",
                          rate: blind.speechRate,
                          voiceURI: audio.voiceURI,
                          sessionId,
                          ttsConfigured: false,
                        })
                      }
                    >
                      تشغيل الإجابة
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        <aside>
          <AccessibleCommands
            hasDiagram={blind.hasDiagram}
            hasTable={blind.hasTable}
            paragraphCount={blind.paragraphCount}
            onReadPage={() => void actions.readPage()}
            onDescribeDiagram={() => void actions.describeDiagram()}
            onDescribeTable={() => void actions.describeTable()}
            onReadSecondParagraph={() => void actions.readParagraph(2)}
            onTestMe={() => void actions.testMe()}
          />
          <Card className="shortcuts">
            <p className="step-kicker">اختصارات لوحة المفاتيح</p>
            <dl>
              <dt>مسافة</dt>
              <dd>تشغيل / إيقاف مؤقت</dd>
              <dt>R</dt>
              <dd>إعادة القراءة</dd>
              <dt>N</dt>
              <dd>التالي</dd>
              <dt>P</dt>
              <dd>السابق</dd>
              <dt>E</dt>
              <dd>اشرح الرسم</dd>
              <dt>Q</dt>
              <dd>اختبرني</dd>
            </dl>
          </Card>
          {data.material.hasFile ? (
            <Card className="blind-preview">
              <Button variant="ghost" type="button" onClick={() => setShowPage((value) => !value)}>
                {showPage ? "إخفاء الصفحة" : "عرض الصفحة"}
              </Button>
              {showPage ? (
                <div className="preview-frame">
                  <img src={`/api/materials/${data.material.id}/file`} alt={pageAlt} />
                </div>
              ) : null}
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
