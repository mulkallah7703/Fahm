import { useState } from "react";
import { Card } from "../common/Card";
import { EmptyState } from "../common/EmptyState";
import type { AnalysisConcept, PageAnalysis } from "../../types";

interface Props {
  analysis: PageAnalysis;
}

export function ConceptsCard({ analysis }: Props) {
  const [selected, setSelected] = useState<AnalysisConcept | null>(null);
  const related = analysis.relationships.filter(
    (item) => item.source === selected?.name || item.target === selected?.name,
  );

  return (
    <Card className="concepts-card">
      <h2>المفاهيم المكتشفة</h2>
      {analysis.concepts.length === 0 ? (
        <EmptyState
          title="لا توجد مفاهيم بعد"
          description="ستظهر المفاهيم هنا بعد اكتمال الاستخراج من النص الفعلي."
        />
      ) : (
        <div className="concept-chips">
          {analysis.concepts.map((concept) => (
            <button
              key={concept.id}
              type="button"
              className={`chip${selected?.id === concept.id ? " active" : ""}`}
              onClick={() => setSelected(concept)}
            >
              {concept.name}
            </button>
          ))}
        </div>
      )}
      {selected ? (
        <div className="concept-detail card" style={{ marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>{selected.name}</h3>
          <p>{selected.description || "لا يوجد شرح إضافي لهذا المفهوم بعد."}</p>
          <p className="muted">
            الأهمية: {Math.round(selected.importanceScore * 100)}٪ · الثقة:{" "}
            {Math.round(selected.confidenceScore * 100)}٪
            {selected.subject ? ` · ${selected.subject}` : ""}
          </p>
          {related.length > 0 ? (
            <ul>
              {related.map((item) => (
                <li key={`${item.source}-${item.target}`}>
                  {item.source} → {item.type} → {item.target}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">لا توجد علاقة مؤكدة لهذا المفهوم في الصفحة.</p>
          )}
        </div>
      ) : null}
    </Card>
  );
}
