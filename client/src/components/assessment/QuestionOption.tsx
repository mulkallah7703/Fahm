interface Props {
  option: string;
  selected: boolean;
  marked: "correct" | "incorrect" | null;
  disabled: boolean;
  onSelect: (option: string) => void;
}

export function QuestionOption({ option, selected, marked, disabled, onSelect }: Props) {
  const markClass = marked === "correct" ? "correct" : marked === "incorrect" ? "incorrect" : "";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`option-card ${selected ? "selected" : ""} ${markClass}`}
      onClick={() => onSelect(option)}
      disabled={disabled}
    >
      {option}
      {marked ? (
        <span className="option-state">{marked === "correct" ? "إجابتك صحيحة" : "إجابتك"}</span>
      ) : null}
    </button>
  );
}
