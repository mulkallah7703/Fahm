import { Button } from "../common/Button";

interface Props {
  busy: boolean;
  canTryAnother: boolean;
  limitReached: boolean;
  onUnderstood: () => void;
  onNotUnderstood: () => void;
  onTryAnother: () => void;
  onTestMe: () => void;
}

export function AdaptiveActions({
  busy,
  canTryAnother,
  limitReached,
  onUnderstood,
  onNotUnderstood,
  onTryAnother,
  onTestMe,
}: Props) {
  return (
    <section className="adaptive-actions" aria-label="هل أصبح الشرح أوضح؟">
      <p>هل أصبح الشرح أوضح؟</p>
      <div className="adaptive-action-row">
        <Button type="button" disabled={busy} onClick={onUnderstood}>
          فهمت الآن
        </Button>
        <Button variant="ghost" type="button" disabled={busy} onClick={onNotUnderstood}>
          لم أفهم بعد
        </Button>
        {canTryAnother && !limitReached ? (
          <Button variant="text" type="button" disabled={busy} onClick={onTryAnother}>
            جرّب طريقة أخرى
          </Button>
        ) : null}
        <Button variant="ghost" type="button" disabled={busy} onClick={onTestMe}>
          اختبرني
        </Button>
      </div>
      <p className="muted">سيتحدث ملف التعلم الشخصي بناءً على تفاعلك، دون اعتبار ذلك إتقانًا.</p>
    </section>
  );
}
