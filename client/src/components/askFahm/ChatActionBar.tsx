import { Button } from "../common/Button";
import type { AskFahmExperience } from "../../types";

interface Props {
  capabilities: AskFahmExperience["capabilities"];
  actions: NonNullable<AskFahmExperience["lastAnswer"]>["actions"] | undefined;
  disabled: boolean;
  onAction: (action: "listen" | "simplify" | "example" | "test_me" | "show_map") => void;
}

const LABELS = {
  listen: "استمع",
  simplify: "اشرح أبسط",
  example: "أعطني مثالًا",
  test_me: "اختبرني",
  show_map: "شاهد الخريطة",
} as const;

export function ChatActionBar({ capabilities, actions, disabled, onAction }: Props) {
  const shown = (actions ?? ["listen", "simplify", "example", "test_me", "show_map"]).filter((action) => {
    if (action === "listen") return capabilities.listen;
    if (action === "simplify") return capabilities.simplify;
    if (action === "example") return capabilities.example;
    if (action === "test_me") return capabilities.testMe;
    return capabilities.showMap;
  });
  if (!shown.length) return null;
  return (
    <div className="ask-actions" aria-label="إجراءات الإجابة">
      {shown.map((action) => (
        <Button key={action} variant="ghost" type="button" disabled={disabled} onClick={() => onAction(action)}>
          {LABELS[action]}
        </Button>
      ))}
    </div>
  );
}
