import type { VisionPayload } from "./visionSchema.js";
import { imageStats } from "../ocr/preprocess.js";

function splitBlocks(text: string): string[] {
  return text
    .split(/\n{2,}|\r\n{2,}/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter((block) => block.length > 0);
}

function looksLikeTable(line: string): boolean {
  const pipes = (line.match(/\|/g) ?? []).length;
  const tabs = (line.match(/\t/g) ?? []).length;
  const columns = line.trim().split(/\s{2,}/).length;
  const pipeCells = line.split("|").map((cell) => cell.trim()).filter(Boolean).length;
  return (pipes >= 1 && pipeCells >= 2) || tabs >= 2 || columns >= 3;
}

function extractTables(text: string): VisionPayload["tables"] {
  const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const tableLines = lines.filter(looksLikeTable);
  if (tableLines.length < 2) return [];

  const rows = tableLines.map((line) =>
    line
      .split(/\||\t|\s{2,}/)
      .map((cell) => cell.trim())
      .filter(Boolean),
  );
  const width = Math.max(...rows.map((row) => row.length));
  if (width < 2) return [];
  const normalized = rows.map((row) => {
    const copy = [...row];
    while (copy.length < width) copy.push("");
    return copy.slice(0, width);
  });
  return [
    {
      headers: normalized[0] ?? [],
      rows: normalized.slice(1),
    },
  ];
}

function inferTitle(blocks: string[]): string | null {
  const first = blocks[0];
  if (!first) return null;
  if (first.length <= 80 && !first.endsWith(".")) return first;
  return first.slice(0, 60);
}

export async function analyzeLocally(input: {
  text: string;
  image?: Buffer | null;
}): Promise<VisionPayload> {
  const blocks = splitBlocks(input.text);
  const tables = extractTables(input.text);
  const title = inferTitle(blocks);
  const sections: VisionPayload["sections"] = [];

  if (title) {
    sections.push({ type: "heading", text: title });
  }
  for (const block of blocks.slice(title ? 1 : 0, 8)) {
    sections.push({ type: "paragraph", text: block });
  }
  for (const table of tables) {
    sections.push({ type: "table", table });
  }

  const elements: VisionPayload["visualElements"] = [];
  let visualDescription: string | null = null;

  if (input.image) {
    try {
      const stats = await imageStats(input.image);
      const area = Math.max(1, stats.width * stats.height);
      const density = input.text.length / (area / 10_000);
      if (density < 8 && stats.width > 200) {
        elements.push({
          type: "image",
          description:
            "يبدو أن الصفحة تحتوي عنصراً بصرياً بالإضافة إلى النص. لا يتوفر وصف دقيق دون نموذج رؤية.",
          location: "unknown",
        });
        visualDescription =
          "تم رصد كثافة نص منخفضة نسبةً إلى مساحة الصورة، ما قد يشير إلى رسم أو صورة تعليمية.";
        sections.push({
          type: "image",
          description: visualDescription,
        });
      }
    } catch {
      /* keep text-only analysis */
    }
  }

  const summary =
    blocks[0]?.slice(0, 280) ||
    (input.text ? input.text.slice(0, 280) : "لم يتوفر نص كافٍ لبناء ملخص.");

  return {
    pageType: "educational",
    title,
    summary,
    visualDescription,
    visualElements: elements,
    tables,
    charts: [],
    equations: [],
    importantVisualRelationships: [],
    sections,
    confidence: tables.length > 0 || elements.length > 0 ? 0.45 : 0.35,
  };
}
