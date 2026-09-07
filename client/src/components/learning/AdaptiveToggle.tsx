interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function AdaptiveToggle({ enabled, onChange }: Props) {
  return (
    <button
      type="button"
      className={`adaptive-toggle ${enabled ? "on" : ""}`}
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
    >
      <span className="toggle-dot" aria-hidden="true" />
      التكيف تلقائي
    </button>
  );
}
