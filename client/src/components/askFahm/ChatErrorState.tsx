import { ErrorState } from "../common/ErrorState";

interface Props {
  message: string;
  onRetry: () => void;
}

export function ChatErrorState({ message, onRetry }: Props) {
  return <ErrorState title="تعذر فتح اسأل فَهْم." message={message} onRetry={onRetry} />;
}
