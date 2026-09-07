import { Button } from "./Button";

interface Props {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "تعذر تحميل بيانات التعلم.",
  message,
  onRetry,
}: Props) {
  return (
    <div className="error-state" role="alert">
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry ? (
        <Button type="button" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      ) : null}
    </div>
  );
}
