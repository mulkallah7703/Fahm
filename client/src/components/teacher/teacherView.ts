import type { TeacherDashboard } from "../../types";

export const BAND_META: Record<string, { icon: string; label: string }> = {
  "مفهوم": { icon: "●", label: "مفهوم" },
  "فهم جيد": { icon: "●", label: "فهم جيد" },
  "يحتاج مراجعة": { icon: "▲", label: "يحتاج مراجعة" },
  "شرح إضافي": { icon: "■", label: "شرح إضافي" },
  "لم يُقَيَّم بعد": { icon: "○", label: "لم يُقَيَّم بعد" },
};

export function bandMeta(band: string) {
  return BAND_META[band] ?? { icon: "○", label: band };
}

export function cellLabel(student: string, concept: string, band: string): string {
  return `${concept} — ${student} — ${band}`;
}

export function exportCsv(data: TeacherDashboard): string {
  const header = ["الطالب", ...data.conceptColumns.map((item) => item.name), "الوضع", "آخر نشاط"];
  const rows = data.students.map((student) => [
    student.name,
    ...data.conceptColumns.map((column) => student.cells.find((cell) => cell.conceptId === column.conceptId)?.band ?? ""),
    student.modeName ?? "",
    student.lastActivityAt ?? "",
  ]);
  return [header, ...rows].map((line) => line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
}

export function studentNoun(count: number): string {
  if (count === 1) return "طالب واحد";
  if (count === 2) return "طالبان";
  if (count >= 3 && count <= 10) return `${count} طلاب`;
  return `${count} طالبًا`;
}
