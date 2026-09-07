import type { AskFahmExperience, AskFahmMessage } from "../../types";
import { ChatActionBar } from "./ChatActionBar";
import { MessageSources } from "./MessageSources";

interface Props {
  message: AskFahmMessage;
  last: boolean;
  capabilities: AskFahmExperience["capabilities"];
  actions: NonNullable<AskFahmExperience["lastAnswer"]>["actions"] | undefined;
  disabled: boolean;
  onAction: (action: "listen" | "simplify" | "example" | "test_me" | "show_map") => void;
}

export function FahmMessage({ message, last, capabilities, actions, disabled, onAction }: Props) {
  return (
    <article className="ask-msg fahm" aria-label="رد فَهْم">
      <p style={{ whiteSpace: "pre-wrap" }}>{message.text}</p>
      <MessageSources label={message.sourceLabel} />
      {last ? (
        <ChatActionBar capabilities={capabilities} actions={actions} disabled={disabled} onAction={onAction} />
      ) : null}
    </article>
  );
}
