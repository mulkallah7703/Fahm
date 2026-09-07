import { Card } from "../common/Card";
import { EmptyState } from "../common/EmptyState";
import type { HistoryFilter } from "../../types";
import { emptyMessage } from "./historyView";

interface Props {
  filter: HistoryFilter;
  search: string;
}

export function HistoryEmptyState({ filter, search }: Props) {
  return (
    <Card>
      <EmptyState title={emptyMessage(filter, search)} description="سيظهر هنا كل درس تبدأه من فَهْم." />
    </Card>
  );
}
