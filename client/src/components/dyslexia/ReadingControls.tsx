import { Button } from "../common/Button";

interface Props {
  atStart: boolean;
  atEnd: boolean;
  onPrevious: () => void;
  onRead: () => void;
  onNext: () => void;
}

export function ReadingControls({ atStart, atEnd, onPrevious, onRead, onNext }: Props) {
  return (
    <div className="reading-controls" role="toolbar" aria-label="التنقل بين المقاطع">
      <Button variant="ghost" type="button" onClick={onPrevious} disabled={atStart} aria-label="السطر السابق">
        سطر سابق
      </Button>
      <Button type="button" onClick={onRead} aria-label="اقرأ هذا السطر">
        اقرأ هذا السطر
      </Button>
      <Button variant="ghost" type="button" onClick={onNext} disabled={atEnd} aria-label="السطر التالي">
        سطر التالي
      </Button>
    </div>
  );
}
