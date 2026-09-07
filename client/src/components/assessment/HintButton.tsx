import { Button } from "../common/Button";

interface Props {
  onHint: () => void;
  disabled?: boolean;
}

export function HintButton({ onHint, disabled }: Props) {
  return (
    <Button variant="ghost" type="button" disabled={disabled} onClick={onHint}>
      تلميح
    </Button>
  );
}
