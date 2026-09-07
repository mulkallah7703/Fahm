import type { AnalysisTable } from "../../types";

export function TableViewer({ table }: { table: AnalysisTable }) {
  if (table.headers.length === 0 && table.rows.length === 0) {
    return <p className="muted">لم يتم اكتشاف جدول في الصفحة.</p>;
  }
  return (
    <div className="table-wrap">
      {table.title ? <p>{table.title}</p> : null}
      <table className="analysis-table">
        {table.headers.length > 0 ? (
          <thead>
            <tr>
              {table.headers.map((cell) => (
                <th key={cell}>{cell}</th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
