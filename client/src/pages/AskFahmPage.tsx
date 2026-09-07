import { useEffect } from "react";
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { AskFahmHeader } from "../components/askFahm/AskFahmHeader";
import { ChatComposer } from "../components/askFahm/ChatComposer";
import { ChatErrorState } from "../components/askFahm/ChatErrorState";
import { ChatMessageList } from "../components/askFahm/ChatMessageList";
import { ContextPanel } from "../components/askFahm/ContextPanel";
import { ConversationSkeleton } from "../components/askFahm/ConversationSkeleton";
import { SuggestedQuestions } from "../components/askFahm/SuggestedQuestions";
import { Card } from "../components/common/Card";
import { useAskFahm } from "../hooks/useAskFahm";
import { useAudioPlayback } from "../hooks/useAudioPlayback";
import { useStudentMeta } from "../hooks/useStudentMeta";
import type { AskFahmExperience } from "../types";
import "../components/common/common.css";
import "../components/lesson/lesson.css";
import "../components/askFahm/askFahm.css";

interface ShellContext {
  openMenu: () => void;
}

export function AskFahmPage() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const conceptId = searchParams.get("conceptId") ?? undefined;
  const { openMenu } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const { setMeta } = useStudentMeta();
  const ask = useAskFahm(sessionId);
  const audio = useAudioPlayback();
  const data = ask.data;

  useEffect(() => {
    if (!data) return;
    setMeta({
      pageReady: {
        title: data.session.title,
        pageNumber: data.session.pageNumber,
        conceptCount: data.context.concepts.length,
        wordCount: null,
      },
      lessonModeName: data.session.modeName,
      changeModeHref: `/lesson/${data.session.materialId}/mode`,
    });
    return () =>
      setMeta({
        pageReady: null,
        lessonModeName: null,
        changeModeHref: null,
      });
  }, [data, setMeta]);

  useEffect(() => {
    return () => audio.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleAction = async (action: "listen" | "simplify" | "example" | "test_me" | "show_map") => {
    if (action === "listen") {
      const text = data?.reply ?? data?.conversation.messages.filter((item) => item.role === "fahm").at(-1)?.text;
      if (text) {
        await audio.play({ text, rate: 1, voiceURI: audio.voiceURI, sessionId });
      }
      return;
    }
    const next = await ask.action(action);
    if (next?.navigateTo) navigate(next.navigateTo);
  };

  if (ask.loading) return <ConversationSkeleton />;
  if (!data) {
    return <ChatErrorState message={ask.error ?? "يمكنك العودة إلى الدرس."} onRetry={() => void ask.reload()} />;
  }

  const modeClass = data.session.modeCode === "dyslexia" ? "ask-dyslexia" : "";
  const focusedName = focusedConcept(data, conceptId);

  return (
    <main className={`ask-wrap ${modeClass}`} lang="ar" dir="rtl">
      <AskFahmHeader title={data.session.title} pageNumber={data.session.pageNumber} onOpenMenu={openMenu} />
      {ask.error ? <p className="status-err" role="alert">{ask.error}</p> : null}
      <p className="sr-only" aria-live="polite">
        {ask.sending ? "جاري إعداد إجابة فَهْم..." : ""}
      </p>
      {focusedName ? <p className="mode-hint">تسألين عن: {focusedName}</p> : null}
      <div className="ask-page">
        <ConversationRail conversations={data.conversations} />
        <section className="ask-chat" aria-label="محادثة فَهْم">
          <ChatMessageList data={data} disabled={ask.sending} onAction={(action) => void handleAction(action)} />
          <SuggestedQuestions
            suggestions={data.suggestions}
            disabled={ask.sending}
            onPick={(text) => void sendAndFollow(ask, text, navigate, conceptId)}
          />
          <ChatComposer
            disabled={ask.sending}
            onSend={(text) => void sendAndFollow(ask, text, navigate, conceptId)}
          />
        </section>
        <ContextPanel data={data} />
      </div>
    </main>
  );
}

function ConversationRail({
  conversations,
}: {
  conversations: AskFahmExperience["conversations"];
}) {
  return (
    <aside>
      <Card>
        <p className="step-kicker">المحادثات</p>
        {conversations.map((item) => (
          <Link
            key={item.sessionId}
            className={`ask-convo ${item.current ? "current" : ""}`}
            to={`/lesson/${item.sessionId}/ask`}
            aria-current={item.current ? "page" : undefined}
          >
            {item.title}
          </Link>
        ))}
        <Link className="btn btn-ghost" to="/lesson">
          محادثة جديدة
        </Link>
      </Card>
    </aside>
  );
}

function focusedConcept(data: AskFahmExperience, conceptId?: string): string | null {
  if (!conceptId) return null;
  return data.context.concepts.find((item) => item.id === conceptId)?.name ?? null;
}

async function sendAndFollow(
  ask: ReturnType<typeof useAskFahm>,
  text: string,
  navigate: ReturnType<typeof useNavigate>,
  conceptId?: string,
) {
  const next = await ask.send(text, conceptId);
  if (next?.navigateTo) navigate(next.navigateTo);
}
