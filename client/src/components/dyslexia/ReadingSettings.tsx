import { Button } from "../common/Button";
import { Card } from "../common/Card";
import type { DyslexiaFontSize, DyslexiaLineSpacing } from "../../types";

const SPEECH_RATES = [0.8, 1, 1.25, 1.5] as const;

interface Props {
  fontSize: DyslexiaFontSize;
  lineSpacing: number;
  speechRate: number | null;
  highlightCurrent: boolean;
  autoRead: boolean;
  wordClickEnabled: boolean;
  onFont: (value: DyslexiaFontSize) => void;
  onSpacing: (value: DyslexiaLineSpacing) => void;
  onSpeechRate: (value: number) => void;
  onHighlight: (value: boolean) => void;
  onAutoRead: (value: boolean) => void;
  onWordClick: (value: boolean) => void;
  onReset: () => void;
}

export function ReadingSettings({
  fontSize,
  lineSpacing,
  speechRate,
  highlightCurrent,
  autoRead,
  wordClickEnabled,
  onFont,
  onSpacing,
  onSpeechRate,
  onHighlight,
  onAutoRead,
  onWordClick,
  onReset,
}: Props) {
  const rate = speechRate ?? 1;
  return (
    <Card>
      <p className="step-kicker">إعدادات القراءة</p>
      <section className="settings-group" aria-labelledby="dyslexia-read-settings">
        <h3 id="dyslexia-read-settings">القراءة</h3>
        <p>حجم الخط</p>
        <div className="setting-row">
          {([
            ["small", "ص"],
            ["medium", "م"],
            ["large", "ك"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`setting-chip ${fontSize === value ? "selected" : ""}`}
              aria-pressed={fontSize === value}
              onClick={() => onFont(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <p>تباعد الأسطر</p>
        <div className="setting-row">
          {([1.6, 2.1, 2.6] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`setting-chip ${lineSpacing === value ? "selected" : ""}`}
              aria-pressed={lineSpacing === value}
              onClick={() => onSpacing(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <label className="switch-row">
          <span>تظليل السطر الحالي</span>
          <input type="checkbox" checked={highlightCurrent} onChange={(event) => onHighlight(event.target.checked)} />
        </label>
      </section>
      <section className="settings-group" aria-labelledby="dyslexia-audio-settings">
        <h3 id="dyslexia-audio-settings">الصوت</h3>
        <p>سرعة القراءة</p>
        <div className="setting-row">
          {SPEECH_RATES.map((value) => (
            <button
              key={value}
              type="button"
              className={`setting-chip ${Math.abs(rate - value) < 0.01 ? "selected" : ""}`}
              aria-pressed={Math.abs(rate - value) < 0.01}
              onClick={() => onSpeechRate(value)}
            >
              {value}×
            </button>
          ))}
        </div>
        <label className="switch-row">
          <span>قراءة تلقائية متصلة</span>
          <input type="checkbox" checked={autoRead} onChange={(event) => onAutoRead(event.target.checked)} />
        </label>
      </section>
      <section className="settings-group" aria-labelledby="dyslexia-help-settings">
        <h3 id="dyslexia-help-settings">المساعدة</h3>
        <label className="switch-row">
          <span>شرح الكلمة بالنقر</span>
          <input type="checkbox" checked={wordClickEnabled} onChange={(event) => onWordClick(event.target.checked)} />
        </label>
      </section>
      <Button variant="text" type="button" onClick={onReset}>
        إعادة الإعدادات
      </Button>
    </Card>
  );
}
