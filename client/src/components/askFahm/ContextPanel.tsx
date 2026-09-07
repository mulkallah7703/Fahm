import { Link } from "react-router-dom";
import { Card } from "../common/Card";
import type { AskFahmExperience } from "../../types";

interface Props {
  data: AskFahmExperience;
}

export function ContextPanel({ data }: Props) {
  return (
    <aside>
      <Card>
        <Link className="btn btn-ghost" to={`/lesson/${data.session.id}`}>
          السابق: الصفحة الحالية
        </Link>
        <div className="ask-preview" aria-label="معاينة الصفحة">
          {data.context.hasFile ? (
            <img src={`/api/materials/${data.context.materialId}/file`} alt={`صورة الصفحة ${data.context.pageNumber}`} />
          ) : (
            <p className="muted">{`صفحة ${data.context.pageNumber}`}</p>
          )}
        </div>
        <p className="step-kicker">المفاهيم في السياق</p>
        {data.context.concepts.length ? (
          data.context.concepts.map((item) => (
            <span key={item.id} className="ask-concept">
              {item.name}
            </span>
          ))
        ) : (
          <p className="muted">لا توجد مفاهيم مستخرجة بعد.</p>
        )}
        {data.context.previousQuestions.length ? (
          <>
            <p className="step-kicker">أسئلة سابقة</p>
            {data.context.previousQuestions.map((item) => (
              <p key={item} className="muted">
                {item}
              </p>
            ))}
          </>
        ) : null}
        <Link className="btn btn-text" to="/history">
          تغيير السياق
        </Link>
      </Card>
    </aside>
  );
}
