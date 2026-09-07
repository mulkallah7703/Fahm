import { Button } from "../common/Button";
import { Card } from "../common/Card";
import type { KnowledgeMapConceptDetail, KnowledgeMapDto } from "../../types";
import { canAsk, canExplain, canTest, relationshipLine } from "./mapView";

interface Props {
  data: KnowledgeMapDto;
  detail: KnowledgeMapConceptDetail | null;
  acting: boolean;
  onExplain: () => void;
  onAsk: () => void;
  onTest: () => void;
  onListen: () => void;
  onStartRecommended: () => void;
}

export function ConceptPanel({
  data,
  detail,
  acting,
  onExplain,
  onAsk,
  onTest,
  onListen,
  onStartRecommended,
}: Props) {
  if (!detail) {
    return (
      <aside className="map-panel" aria-label="تفاصيل المفهوم">
        <Card>
          <p className="step-kicker">المفهوم المحدد</p>
          <p>اختر مفهومًا من الخريطة أو القائمة لعرض علاقاته وحالة فهمك.</p>
        </Card>
        <RecommendationCard data={data} onStart={onStartRecommended} />
      </aside>
    );
  }

  return (
    <aside className="map-panel" aria-label="تفاصيل المفهوم">
      <Card>
        <p className="step-kicker">المفهوم المحدد</p>
        <h2>{detail.name}</h2>
        {detail.description ? <p>{detail.description}</p> : <p className="muted">لا يوجد وصف محفوظ لهذا المفهوم.</p>}
        <h3>العلاقات</h3>
        {detail.relationships.length === 0 ? (
          <p className="muted">لا توجد علاقات محفوظة لهذا المفهوم.</p>
        ) : (
          <ul>
            {detail.relationships.map((item) => (
              <li key={`${item.direction}-${item.type}-${item.name}`}>{relationshipLine(item)}</li>
            ))}
          </ul>
        )}
        <h3>حالتك في هذا المفهوم</h3>
        <p>{detail.masteryBand}</p>
        {detail.attempts !== null ? (
          <>
            <h3>محاولاتك</h3>
            <p>
              {detail.correct ?? 0} من {detail.attempts} أسئلة صحيحة
              {detail.incorrect !== null ? ` · ${detail.incorrect} غير صحيحة` : ""}
              {detail.explanationCount ? ` · ${detail.explanationCount} طلبات شرح` : ""}
            </p>
          </>
        ) : (
          <p className="muted">لم نملك أدلة كافية لتحديد مستوى فهمك بعد.</p>
        )}
        {detail.adapted ? <p>تم تكييف الشرح</p> : null}
        {detail.insight ? <p className="map-insight">{detail.insight}</p> : null}
        <div className="map-card-actions">
          {canExplain(data, detail.conceptId) ? (
            <Button type="button" disabled={acting} onClick={onExplain}>
              اشرح هذا المفهوم
            </Button>
          ) : null}
          {detail.description || detail.insight ? (
            <Button type="button" variant="ghost" onClick={onListen}>
              اسمع الشرح
            </Button>
          ) : null}
          {canAsk(data, detail.conceptId) ? (
            <Button type="button" variant="ghost" disabled={acting} onClick={onAsk}>
              اسأل فَهْم عن هذا المفهوم
            </Button>
          ) : null}
          {canTest(data, detail.conceptId) ? (
            <Button type="button" variant="ghost" disabled={acting} onClick={onTest}>
              اختبرني
            </Button>
          ) : null}
        </div>
      </Card>
      <RecommendationCard data={data} onStart={onStartRecommended} />
    </aside>
  );
}

function RecommendationCard({ data, onStart }: { data: KnowledgeMapDto; onStart: () => void }) {
  if (!data.recommendation) return null;
  return (
    <Card>
      <p className="step-kicker">ابدأ بهذا المفهوم</p>
      <strong>{data.recommendation.reason}</strong>
      {data.scope.sessionId || data.nodes.some((item) => item.conceptId === data.recommendation?.conceptId && item.sessionId) ? (
        <div className="map-card-actions">
          <Button type="button" onClick={onStart}>
            ابدأ الشرح
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
