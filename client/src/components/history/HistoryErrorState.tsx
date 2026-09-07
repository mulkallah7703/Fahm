import { ErrorState } from "../common/ErrorState";
import { historyErrorMessage } from "./historyView";

interface Props {
  message?: string | null;
  onRetry: () => void;
}

export function HistoryErrorState({ message, onRetry }: Props) {
  return <ErrorState title="تعذر تحميل سجل التعلم." message={historyErrorMessage(message)} onRetry={onRetry} />;
}
