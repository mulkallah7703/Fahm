import type { AskFahmExperience, AskFahmMessage } from "../../types";
import { FahmMessage } from "./FahmMessage";
import { StudentMessage } from "./StudentMessage";

interface Props {
  message: AskFahmMessage;
  lastAssistant: boolean;
  capabilities: AskFahmExperience["capabilities"];
  actions: NonNullable<AskFahmExperience["lastAnswer"]>["actions"] | undefined;
  disabled: boolean;
  onAction: (action: "listen" | "simplify" | "example" | "test_me" | "show_map") => void;
}

export function ChatMessage({ message, lastAssistant, capabilities, actions, disabled, onAction }: Props) {
  if (message.role === "student") return <StudentMessage message={message} />;
  return (
    <FahmMessage
      message={message}
      last={lastAssistant}
      capabilities={capabilities}
      actions={actions}
      disabled={disabled}
      onAction={onAction}
    />
  );
}
