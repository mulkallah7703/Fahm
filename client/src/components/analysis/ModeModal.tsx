import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import type { LearningModeCode } from "../../types";

const MODES: { code: LearningModeCode; title: string; description: string }[] = [
  { code: "adaptive", title: "التكيف الذكي", description: "يختار فَهْم أنسب طريقة عرض حسب تفاعلك." },
  { code: "focus", title: "وضع التركيز", description: "تقليل التشتيت وتقسيم المحتوى إلى خطوات قصيرة." },
  { code: "dyslexia", title: "وضع عسر القراءة", description: "نص أوضح وتباعد أكبر ودعم صوتي." },
  { code: "blind", title: "وضع الكفيف", description: "اعتماد أكبر على الصوت والوصف اللفظي." },
];

interface Props {
  open: boolean;
  value: LearningModeCode;
  onClose: () => void;
  onSelect: (mode: LearningModeCode) => void;
}

export function ModeModal({ open, value, onClose, onSelect }: Props) {
  return (
    <Modal title="اختر طريقة الشرح" open={open} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MODES.map((mode) => (
          <button
            key={mode.code}
            type="button"
            className="card mode-option"
            onClick={() => onSelect(mode.code)}
            style={value === mode.code ? { borderColor: "var(--accent)" } : undefined}
          >
            <h3 style={{ margin: "0 0 6px" }}>{mode.title}</h3>
            <p style={{ margin: 0 }}>{mode.description}</p>
          </button>
        ))}
      </div>
      <div className="modal-actions">
        <Button type="button" onClick={onClose}>
          تم
        </Button>
      </div>
    </Modal>
  );
}
