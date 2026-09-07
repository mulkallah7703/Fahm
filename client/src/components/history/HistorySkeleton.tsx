import { Skeleton } from "../common/Skeleton";

export function HistorySkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <Skeleton height="36px" width="220px" />
      <div style={{ height: 14 }} />
      <Skeleton height="44px" />
      <div style={{ height: 14 }} />
      <Skeleton height="72px" />
      <Skeleton height="72px" />
      <Skeleton height="72px" />
    </div>
  );
}
