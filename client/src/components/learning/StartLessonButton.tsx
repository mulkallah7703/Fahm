import { Button } from "../common/Button";

interface Props {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}

export function StartLessonButton({ disabled, loading, onClick }: Props) {
  return (
    <Button type="button" disabled={disabled || loading} onClick={onClick}>
      {loading ? "جاري بدء الدرس..." : "ابدأ الدرس"}
    </Button>
  );
}
