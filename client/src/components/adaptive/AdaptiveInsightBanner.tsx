interface Props {
  insight: string | null;
  emptyMessage: string | null;
  reasonLabel: string | null;
  actionLabel: string | null;
}

export function AdaptiveInsightBanner({ insight, emptyMessage, reasonLabel, actionLabel }: Props) {
  if (!insight && !emptyMessage) return null;
  return (
    <section className="insight-banner" aria-labelledby="adaptive-insight-title">
      <p className="step-kicker" id="adaptive-insight-title">
        فَهْم لاحظ
      </p>
      <p>{insight ?? emptyMessage}</p>
      {reasonLabel || actionLabel ? (
        <dl className="insight-why">
          {reasonLabel ? (
            <>
              <dt>السبب</dt>
              <dd>{reasonLabel}</dd>
            </>
          ) : null}
          {actionLabel ? (
            <>
              <dt>الإجراء</dt>
              <dd>{actionLabel}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </section>
  );
}
