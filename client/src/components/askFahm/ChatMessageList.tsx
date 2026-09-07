import { useEffect, useRef } from "react";
import type { AskFahmExperience } from "../../types";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatMessage } from "./ChatMessage";

interface Props {
  data: AskFahmExperience;
  disabled: boolean;
  onAction: (action: "listen" | "simplify" | "example" | "test_me" | "show_map") => void;
}

export function ChatMessageList({ data, disabled, onAction }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const lastId = data.conversation.messages.at(-1)?.id;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const nearEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    if (nearEnd) endRef.current?.scrollIntoView({ block: "end" });
  }, [lastId]);

  const lastFahm = [...data.conversation.messages].reverse().find((item) => item.role === "fahm")?.id;

  return (
    <div className="ask-thread" ref={boxRef} role="log" aria-live="polite" aria-relevant="additions">
      {data.conversation.messages.length === 0 ? (
        <ChatEmptyState title={data.session.title} />
      ) : (
        data.conversation.messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            lastAssistant={message.id === lastFahm}
            capabilities={data.capabilities}
            actions={data.lastAnswer?.actions}
            disabled={disabled}
            onAction={onAction}
          />
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}
