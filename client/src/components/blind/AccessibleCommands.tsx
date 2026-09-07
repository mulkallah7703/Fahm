import { Button } from "../common/Button";
import { Card } from "../common/Card";

interface Props {
  hasDiagram: boolean;
  hasTable: boolean;
  paragraphCount: number;
  onReadPage: () => void;
  onDescribeDiagram: () => void;
  onDescribeTable: () => void;
  onReadSecondParagraph: () => void;
  onTestMe: () => void;
}

export function AccessibleCommands({
  hasDiagram,
  hasTable,
  paragraphCount,
  onReadPage,
  onDescribeDiagram,
  onDescribeTable,
  onReadSecondParagraph,
  onTestMe,
}: Props) {
  return (
    <Card>
      <p className="step-kicker">أوامر التعلم</p>
      <p className="muted">أزرار للتنقل داخل الشرح. لا يتم تسجيل الصوت من الميكروفون.</p>
      <div className="command-list">
        <Button className="command-btn" variant="ghost" type="button" onClick={onReadPage}>
          اقرأ الصفحة
        </Button>
        <Button
          className="command-btn"
          variant="ghost"
          type="button"
          onClick={onDescribeDiagram}
          aria-describedby={hasDiagram ? undefined : "no-diagram-hint"}
        >
          اشرح الرسم
        </Button>
        <Button
          className="command-btn"
          variant="ghost"
          type="button"
          onClick={onDescribeTable}
          aria-describedby={hasTable ? undefined : "no-table-hint"}
        >
          اشرح الجدول
        </Button>
        <p id="no-diagram-hint" className="sr-only">
          {hasDiagram ? "الرسم متاح للوصف." : "إن لم يوجد رسم سيُذكر ذلك بوضوح."}
        </p>
        <p id="no-table-hint" className="sr-only">
          {hasTable ? "الجدول متاح للوصف." : "إن لم يوجد جدول سيُذكر ذلك بوضوح."}
        </p>
        <Button
          className="command-btn"
          variant="ghost"
          type="button"
          onClick={onReadSecondParagraph}
          disabled={paragraphCount < 2}
        >
          اقرأ الفقرة الثانية
        </Button>
        <Button className="command-btn" variant="ghost" type="button" onClick={onTestMe}>
          اختبرني
        </Button>
      </div>
    </Card>
  );
}
