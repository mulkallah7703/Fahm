import { Card } from "../common/Card";
import { DiagramViewer } from "./DiagramViewer";
import { TableViewer } from "./TableViewer";
import type { PageAnalysis } from "../../types";

interface Props {
  analysis: PageAnalysis;
}

export function VisualAnalysisCard({ analysis }: Props) {
  const diagrams = [
    ...analysis.structure.sections.filter((section) => section.type === "diagram" || section.type === "image"),
    ...analysis.vision?.elements
      .filter((element) => element.type === "diagram" || element.type === "image")
      .map((element) => ({
        type: "diagram" as const,
        description: element.description,
        text: element.location,
      })) ?? [],
  ];
  const tables = analysis.vision?.tables.length
    ? analysis.vision.tables
    : analysis.structure.sections
        .filter((section) => section.type === "table" && section.table)
        .map((section) => section.table!);
  const previewUrl = analysis.material.hasFile
    ? `/api/materials/${analysis.material.id}/file`
    : null;

  return (
    <Card className="structure-card">
      <h2>فهم الصفحة</h2>
      {analysis.vision?.summary ? <p>{analysis.vision.summary}</p> : null}
      <div className="structure-canvas">
        {analysis.structure.sections
          .filter((section) => section.type === "heading" || section.type === "paragraph")
          .map((section, index) => (
            <article key={`${section.type}-${index}`} className="structure-block">
              <span className="block-tag">{section.type === "heading" ? "HEADING" : "PARAGRAPH"}</span>
              <p style={{ margin: 0 }}>{section.text}</p>
              {section.type === "paragraph" ? (
                <div className="wire-lines" aria-hidden="true">
                  <span className="wire-line" />
                  <span className="wire-line" style={{ width: "80%" }} />
                </div>
              ) : null}
            </article>
          ))}

        {diagrams.length === 0 ? (
          <article className="structure-block">
            <span className="block-tag">DIAGRAM</span>
            <p>لم يتم اكتشاف رسم في الصفحة.</p>
          </article>
        ) : (
          diagrams.map((item, index) => (
            <article key={`diagram-${index}`} className="structure-block">
              <span className="block-tag">DIAGRAM</span>
              <DiagramViewer
                title={item.text}
                description={item.description ?? "عنصر بصري مكتشف في الصفحة."}
                previewUrl={index === 0 ? previewUrl : null}
              />
            </article>
          ))
        )}

        {tables.length === 0 ? (
          <article className="structure-block">
            <span className="block-tag">TABLE</span>
            <p>لم يتم اكتشاف جدول في الصفحة.</p>
          </article>
        ) : (
          tables.map((table, index) => (
            <article key={`table-${index}`} className="structure-block">
              <span className="block-tag">TABLE</span>
              <TableViewer table={table} />
            </article>
          ))
        )}
      </div>
    </Card>
  );
}
