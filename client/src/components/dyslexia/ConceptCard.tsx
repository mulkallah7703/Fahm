import { Button } from "../common/Button";
import { Card } from "../common/Card";
import type { DyslexiaVocab, DyslexiaWordExplain } from "../../types";

interface Props {
  concept: DyslexiaVocab | null;
  explain: DyslexiaWordExplain | null;
  onListen: () => void;
  onSimplify: () => void;
  onSaveNote: () => void;
}

export function ConceptCard({ concept, explain, onListen, onSimplify, onSaveNote }: Props) {
  if (!concept && !explain) return null;
  const title = explain?.term ?? concept?.name ?? "";
  const meaning = explain?.simpleExplanation ?? concept?.simplified ?? concept?.definition ?? "";
  return (
    <Card>
      <p className="step-kicker">شرح الكلمة</p>
      <h2>{title}</h2>
      {concept?.english ? <p className="muted">{concept.english}</p> : null}
      <Button variant="ghost" type="button" onClick={onListen} aria-label="استمع">
        استمع
      </Button>
      {concept?.simplified ? (
        <>
          <p>الأصل: {concept.definition}</p>
          <p>المعنى المبسط: {concept.simplified}</p>
        </>
      ) : (
        <p>{meaning}</p>
      )}
      {explain?.contextualMeaning ? <p className="muted">{explain.contextualMeaning}</p> : null}
      {explain?.example || concept?.example ? <p>مثال: {explain?.example ?? concept?.example}</p> : null}
      <div className="reading-controls">
        <Button variant="ghost" type="button" onClick={onSimplify}>
          مرادف أبسط
        </Button>
        <Button variant="ghost" type="button" onClick={onSaveNote}>
          أضف ملاحظات
        </Button>
      </div>
    </Card>
  );
}
