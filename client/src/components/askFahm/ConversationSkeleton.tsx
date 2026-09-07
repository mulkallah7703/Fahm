import { Skeleton } from "../common/Skeleton";

export function ConversationSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="sr-only">جاري تجهيز محادثة فَهْم...</p>
      <Skeleton height="36px" width="220px" />
      <div style={{ height: 16 }} />
      <Skeleton height="280px" />
    </div>
  );
}
