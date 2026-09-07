import { Button } from "../common/Button";
import type { AskFahmExperience } from "../../types";

interface Props {
  suggestions: AskFahmExperience["suggestions"];
  disabled: boolean;
  onPick: (text: string) => void;
}

export function SuggestedQuestions({ suggestions, disabled, onPick }: Props) {
  if (!suggestions.length) return null;
  return (
    <div className="ask-chips" aria-label="أسئلة مقترحة">
      {suggestions.map((item) => (
        <Button key={item.id} variant="ghost" type="button" disabled={disabled} onClick={() => onPick(item.text)}>
          {item.text}
        </Button>
      ))}
    </div>
  );
}
