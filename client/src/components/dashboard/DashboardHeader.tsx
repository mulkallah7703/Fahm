import { Header } from "../layout/Header";

interface Props {
  greeting: string;
  onOpenMenu: () => void;
}

export function DashboardHeader({ greeting, onOpenMenu }: Props) {
  return <Header greeting={greeting} title="ماذا نتعلم اليوم؟" onOpenMenu={onOpenMenu} />;
}
