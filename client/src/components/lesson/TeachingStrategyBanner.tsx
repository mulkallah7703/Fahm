import type { LessonSession } from "../../types";

interface Props {
  plan: LessonSession["teachingPlan"] | undefined;
}

export function TeachingStrategyBanner({ plan }: Props) {
  if (!plan) return null;
  return (
    <p className="mode-hint" role="status">
      <strong>{plan.label}</strong>
      {" — "}
      {plan.objective}
    </p>
  );
}
