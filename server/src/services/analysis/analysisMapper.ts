import { OCR_CONFIDENCE_WARNING, emptyStages } from "../../config/analysis.js";
import type { AnalysisDto, TableDto } from "../../types/analysis.js";
import type { OwnedMaterialContext } from "../../repositories/analysisRepository.js";
import type { OcrRow } from "../../repositories/ocrRepository.js";
import type { VisionRow } from "../../repositories/visionRepository.js";
import type { PageConceptRow, RelationshipRow } from "../../repositories/conceptRepository.js";
import { countWords } from "../../utils/words.js";
import { visionPayloadSchema, type VisionPayload } from "../vision/visionSchema.js";

export function parseStructured(raw: string | null): VisionPayload | null {
  if (!raw) return null;
  try {
    const parsed = visionPayloadSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function baseSnapshot(ctx: OwnedMaterialContext): AnalysisDto {
  return {
    material: {
      id: ctx.materialId,
      title: ctx.title ?? "صفحة كتاب",
      type: ctx.materialType,
      mimeType: ctx.mimeType,
      hasFile: Boolean(ctx.fileUrl),
    },
    page: {
      id: ctx.pageId,
      pageNumber: ctx.pageNumber,
      pageCount: 1,
    },
    session: {
      id: ctx.sessionId,
      modeCode: ctx.modeCode,
      modeName: ctx.modeName,
    },
    status: "pending",
    stages: emptyStages(),
    processingTimeMs: null,
    wordCount: 0,
    ocr: null,
    vision: null,
    structure: { title: ctx.title, sections: [] },
    concepts: [],
    relationships: [],
    gradeEstimate: null,
    error: null,
  };
}

export function applyPersisted(input: {
  ctx: OwnedMaterialContext;
  ocr: OcrRow | null;
  vision: VisionRow | null;
  concepts: PageConceptRow[];
  relationships: RelationshipRow[];
}): AnalysisDto {
  const snapshot = baseSnapshot(input.ctx);
  const structured = parseStructured(input.vision?.structuredContent ?? null);
  const original = input.ocr?.extractedText ?? "";
  const display = input.ctx.originalText ?? original;
  const wordCount = countWords(display);

  if (input.ocr) {
    snapshot.ocr = {
      text: display,
      originalText: original,
      isCorrected: Boolean(display && original && display !== original),
      language: input.ocr.language,
      confidence: input.ocr.confidence,
      processingTimeMs: input.ocr.processingTimeMs,
      engine: input.ocr.engine,
      lowConfidence:
        input.ocr.confidence !== null && input.ocr.confidence < OCR_CONFIDENCE_WARNING,
    };
    snapshot.wordCount = wordCount;
    snapshot.stages = snapshot.stages.map((stage) =>
      stage.key === "ocr"
        ? { key: "ocr", state: "completed", message: "تم استخراج النص" }
        : stage,
    );
    snapshot.status = "ocr_completed";
  }

  if (input.vision) {
    const tables: TableDto[] = structured?.tables ?? [];
    snapshot.vision = {
      summary: input.vision.summary ?? structured?.summary ?? "",
      visualDescription: input.vision.visualDescription,
      elements: structured?.visualElements ?? [],
      tables,
      modelName: input.vision.modelName,
      processingTimeMs: input.vision.processingTimeMs,
    };
    snapshot.structure = {
      title: structured?.title ?? input.ctx.title,
      sections: structured?.sections ?? [],
    };
    snapshot.stages = snapshot.stages.map((stage) => {
      if (stage.key === "vision") {
        return { key: "vision", state: "completed", message: "تم فهم العناصر البصرية" };
      }
      if (stage.key === "grade") {
        return { key: "grade", state: "completed", message: "اكتمل تقدير المستوى" };
      }
      return stage;
    });
    snapshot.status = "vision_completed";
  }

  if (input.concepts.length > 0) {
    snapshot.concepts = input.concepts.map((concept) => ({
      id: concept.conceptId,
      name: concept.name,
      description: concept.description,
      subject: concept.subject,
      importanceScore: concept.importanceScore,
      confidenceScore: concept.confidenceScore,
    }));
    snapshot.relationships = input.relationships;
    snapshot.stages = snapshot.stages.map((stage) =>
      stage.key === "concepts"
        ? { key: "concepts", state: "completed", message: "تم استخراج المفاهيم" }
        : stage,
    );
    snapshot.status = "completed";
  }

  if (structured?.gradeLevel || structured?.subject) {
    const confidence = structured.gradeConfidence ?? 0;
    snapshot.gradeEstimate = {
      gradeLevel: structured.gradeLevel ?? null,
      subject: structured.subject ?? null,
      confidence,
      note:
        confidence < 0.5
          ? "لم نتمكن من تحديد المستوى الدراسي بدقة."
          : null,
    };
  }

  snapshot.processingTimeMs =
    (input.ocr?.processingTimeMs ?? 0) + (input.vision?.processingTimeMs ?? 0);

  return snapshot;
}
