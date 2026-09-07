import { Skeleton } from "../common/Skeleton";

export function LearningModeSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="muted">فَهْم يحدد الطريقة الأنسب لك...</p>
      <div style={{ height: 16 }} />
      <Skeleton height="40px" width="280px" />
      <div style={{ height: 18 }} />
      <Skeleton height="180px" />
      <div style={{ height: 16 }} />
      <div className="mode-grid">
        <Skeleton height="220px" />
        <Skeleton height="220px" />
        <Skeleton height="220px" />
      </div>
    </div>
  );
}
