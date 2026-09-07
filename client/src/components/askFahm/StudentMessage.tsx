import type { AskFahmMessage } from "../../types";

export function StudentMessage({ message }: { message: AskFahmMessage }) {
  return (
    <article className="ask-msg student" aria-label="رسالتك">
      <p>{message.text}</p>
    </article>
  );
}
