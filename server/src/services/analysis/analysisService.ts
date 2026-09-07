import { LEARNING_MODE_BY_CODE, OCR_CONFIDENCE_WARNING } from "../../config/analysis.js";
import { analysisRepository } from "../../repositories/analysisRepository.js";
import { conceptRepository } from "../../repositories/conceptRepository.js";
import { ocrRepository } from "../../repositories/ocrRepository.js";
import { visionRepository } from "../../repositories/visionRepository.js";
import { sessionRepository } from "../../repositories/sessionRepository.js";
import type { AuthUser } from "../../types/index.js";
import type { AnalysisDto } from "../../types/analysis.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import { countWords } from "../../utils/words.js";
import { normalizeConceptName } from "../../utils/conceptName.js";
import { auditService } from "../auditService.js";
import { ocrService } from "../ocr/ocrService.js";
import { storageService } from "../storage/storageService.js";
import { visionService } from "../vision/visionService.js";
import { conceptService } from "../concepts/conceptService.js";
import { inferGrade, inferSubject } from "../concepts/localConcepts.js";
import type { VisionPayload } from "../vision/visionSchema.js";
import { analysisJobStore, setStage } from "./analysisJobStore.js";
import { applyPersisted, baseSnapshot } from "./analysisMapper.js";

function requireStudent(user: AuthUser): string {
  if (!user.studentProfileId) {
    throw new NotFoundError("لم يتم العثور على الصفحة.");
  }
  return user.studentProfileId;
}

async function loadOwned(user: AuthUser, materialId: string) {
  const ctx = await analysisRepository.findOwnedContext(
    materialId,
    requireStudent(user),
  );
  if (!ctx) {
    throw new NotFoundError("لم يتم العثور على الصفحة.");
  }
  return ctx;
}

async function persistedSnapshot(user: AuthUser, materialId: string): Promise<AnalysisDto> {
  const ctx = await loadOwned(user, materialId);
  const [ocr, vision, concepts] = await Promise.all([
    ocrRepository.latestForPage(ctx.pageId),
    visionRepository.latestForPage(ctx.pageId),
    conceptRepository.listForPage(ctx.pageId),
  ]);
  const relationships = await conceptRepository.listRelationships(
    concepts.map((item) => item.conceptId),
  );
  return applyPersisted({ ctx, ocr, vision, concepts, relationships });
}

export const analysisService = {
  async getAnalysis(user: AuthUser, materialId: string): Promise<AnalysisDto> {
    const live = analysisJobStore.get(materialId);
    if (live && analysisJobStore.isRunning(materialId)) {
      return live;
    }
    const persisted = await persistedSnapshot(user, materialId);
    if (live && live.status === "failed" && persisted.status === "pending") {
      return live;
    }
    return persisted;
  },

  async startAnalysis(
    user: AuthUser,
    materialId: string,
    options: { force?: boolean; ipAddress?: string | null; userAgent?: string | null },
  ): Promise<AnalysisDto> {
    await loadOwned(user, materialId);

    if (analysisJobStore.isRunning(materialId)) {
      return analysisJobStore.get(materialId) ?? persistedSnapshot(user, materialId);
    }

    const current = await persistedSnapshot(user, materialId);
    if (current.status === "completed" && !options.force) {
      return current;
    }

    if (options.force) {
      await resetGenerated(current.page.id);
    }

    const fresh = await persistedSnapshot(user, materialId);
    const started = Date.now();
    let snapshot = setStage(fresh, "ocr", "processing", "جاري استخراج النص...", "ocr_processing");
    analysisJobStore.start(snapshot);

    await auditService.record({
      userId: user.userId,
      actionType: options.force ? "analysis.reanalyze" : "analysis.start",
      entityName: "LearningMaterials",
      entityId: materialId,
      description: "page_analysis",
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null,
    });

    void runPipeline(user, materialId, started).catch((error: unknown) => {
      logger.error("analysis_failed", {
        category: "ANALYSIS",
        endpoint: "analyze",
      });
      const message =
        error instanceof Error && error.message.startsWith("تعذر")
          ? error.message
          : "تعذر فهم محتوى الصفحة حاليًا.";
      const failed = analysisJobStore.get(materialId) ?? snapshot;
      analysisJobStore.finish(materialId, {
        ...failed,
        status: "failed",
        error: { code: "ANALYSIS_FAILED", message, stage: failed.status },
      });
      void auditService.record({
        userId: user.userId,
        actionType: "analysis.failed",
        entityName: "LearningMaterials",
        entityId: materialId,
        description: "analysis_failed",
      });
    });

    return analysisJobStore.get(materialId) ?? snapshot;
  },

  async saveOcrCorrection(user: AuthUser, materialId: string, text: string): Promise<AnalysisDto> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new ValidationError("أدخل النص المصحح أولاً.");
    }
    const ctx = await loadOwned(user, materialId);
    await analysisRepository.updatePageText(ctx.pageId, trimmed, null, null);
    analysisJobStore.clear(materialId);
    return persistedSnapshot(user, materialId);
  },

  async startLearning(
    user: AuthUser,
    materialId: string,
    modeCode: string,
  ): Promise<{ sessionId: string; modeCode: string }> {
    const normalized = modeCode in LEARNING_MODE_BY_CODE ? modeCode : "adaptive";
    const modeId = LEARNING_MODE_BY_CODE[normalized];
    const ctx = await loadOwned(user, materialId);
    await sessionRepository.updateMode(ctx.sessionId, modeId);
    return { sessionId: ctx.sessionId, modeCode: normalized };
  },
};

async function resetGenerated(pageId: string): Promise<void> {
  await ocrRepository.deleteForPage(pageId);
  await visionRepository.deleteForPage(pageId);
  await conceptRepository.unlinkPage(pageId);
}

async function runPipeline(user: AuthUser, materialId: string, started: number): Promise<void> {
  const ctx = await loadOwned(user, materialId);
  let snapshot = analysisJobStore.get(materialId) ?? baseSnapshot(ctx);

  const source = await loadSource(ctx);
  snapshot = setStage(snapshot, "ocr", "processing", "جاري استخراج النص...", "ocr_processing");
  analysisJobStore.update(materialId, snapshot);

  let ocrText = "";
  try {
    const ocr = source.ocr;
    ocrText = ocr.text;
    if (!ocrText.trim()) {
      throw new ValidationError("تعذر استخراج النص من الصورة.", "OCR_EMPTY");
    }
    await ocrRepository.insert({
      pageId: ctx.pageId,
      engine: ocr.engine,
      language: ocr.language,
      text: ocr.text,
      confidence: ocr.confidence,
      processingTimeMs: ocr.processingTimeMs,
    });
    if (!ctx.originalText || ctx.originalText === ocr.text) {
      await analysisRepository.updatePageText(
        ctx.pageId,
        ocr.text,
        ocr.language,
        ocr.confidence,
      );
    }
    snapshot = {
      ...setStage(snapshot, "ocr", "completed", "تم استخراج النص", "ocr_completed"),
      page: { ...snapshot.page, pageCount: ocr.pageCount },
      wordCount: countWords(ocr.text),
      ocr: {
        text: ctx.originalText && ctx.originalText !== ocr.text ? ctx.originalText : ocr.text,
        originalText: ocr.text,
        isCorrected: Boolean(ctx.originalText && ctx.originalText !== ocr.text),
        language: ocr.language,
        confidence: ocr.confidence,
        processingTimeMs: ocr.processingTimeMs,
        engine: ocr.engine,
        lowConfidence: ocr.confidence < OCR_CONFIDENCE_WARNING,
      },
    };
    analysisJobStore.update(materialId, snapshot);
    logger.info("analysis_stage", {
      endpoint: "ocr",
      duration: ocr.processingTimeMs,
      status: 200,
    });
    if (!ocr.text) {
      throw new ValidationError("تعذر استخراج النص من الصورة.", "OCR_EMPTY");
    }
  } catch (error) {
    const message = error instanceof ValidationError
      ? error.message
      : "تعذر استخراج النص من الصورة.";
    snapshot = setStage(snapshot, "ocr", "failed", message, "failed");
    snapshot.error = { code: "OCR_FAILED", message, stage: "ocr" };
    analysisJobStore.finish(materialId, snapshot);
    return;
  }

  snapshot = setStage(snapshot, "vision", "processing", "جاري فهم الصور والرسومات...", "vision_processing");
  analysisJobStore.update(materialId, snapshot);

  let visionPayload: VisionPayload | null = null;
  try {
    const vision = await visionService.analyze({
      ocrText,
      image: source.image,
    });
    visionPayload = vision.payload;
    await visionRepository.insert({
      pageId: ctx.pageId,
      modelName: vision.modelName,
      summary: vision.payload.summary,
      visualDescription: vision.payload.visualDescription ?? null,
      structuredContent: JSON.stringify(vision.payload),
      rawResponse: null,
      processingTimeMs: vision.processingTimeMs,
    });
    if (vision.payload.title) {
      await analysisRepository.updateMaterialTitle(ctx.materialId, vision.payload.title);
    }
    const gradeFromText = inferGrade(ocrText);
    const subjectFromText = inferSubject(ocrText);
    const gradeLevel = vision.payload.gradeLevel ?? gradeFromText;
    const subject = vision.payload.subject ?? subjectFromText;
    const gradeConfidence = vision.payload.gradeConfidence ?? (gradeLevel ? 0.6 : 0);
    snapshot = {
      ...setStage(snapshot, "vision", "completed", "تم فهم العناصر البصرية", "vision_completed"),
      vision: {
        summary: vision.payload.summary,
        visualDescription: vision.payload.visualDescription ?? null,
        elements: vision.payload.visualElements,
        tables: vision.payload.tables,
        modelName: vision.modelName,
        processingTimeMs: vision.processingTimeMs,
      },
      structure: {
        title: vision.payload.title ?? ctx.title,
        sections: vision.payload.sections,
      },
      gradeEstimate: {
        gradeLevel,
        subject,
        confidence: gradeConfidence,
        note: gradeConfidence < 0.5 ? "لم نتمكن من تحديد المستوى الدراسي بدقة." : null,
      },
    };
    snapshot = setStage(snapshot, "grade", "completed", "اكتمل تقدير المستوى", snapshot.status);
    analysisJobStore.update(materialId, snapshot);
    logger.info("analysis_stage", {
      endpoint: "vision",
      duration: vision.processingTimeMs,
      status: 200,
    });
  } catch {
    snapshot = setStage(snapshot, "vision", "failed", "تعذر تحليل العناصر البصرية.", snapshot.status);
    snapshot = setStage(snapshot, "grade", "failed", "لم يتم تقدير المستوى.", snapshot.status);
    analysisJobStore.update(materialId, snapshot);
  }

  snapshot = setStage(
    snapshot,
    "concepts",
    "processing",
    "جاري استخراج المفاهيم...",
    "concept_extraction",
  );
  analysisJobStore.update(materialId, snapshot);

  try {
    const extracted = await conceptService.extract({
      ocrText,
      visionSummary: visionPayload?.summary,
    });
    const mapped = new Map<string, string>();
    for (const concept of extracted.concepts) {
      const existing = await conceptRepository.findByName(concept.name);
      const conceptId = existing?.conceptId ?? await conceptRepository.create({
        name: concept.name,
        description: concept.description ?? null,
        subject: concept.subject ?? extracted.subject ?? null,
      });
      mapped.set(normalizeConceptName(concept.name), conceptId);
      await conceptRepository.linkPage({
        pageId: ctx.pageId,
        conceptId,
        importance: concept.importanceScore,
        confidence: concept.confidenceScore,
      });
    }
    for (const relation of extracted.relationships) {
      const sourceId = mapped.get(normalizeConceptName(relation.source));
      const targetId = mapped.get(normalizeConceptName(relation.target));
      if (sourceId && targetId) {
        await conceptRepository.relate({
          sourceId,
          targetId,
          type: relation.type,
          confidence: relation.confidenceScore ?? null,
        });
      }
    }
    const stored = await conceptRepository.listForPage(ctx.pageId);
    const relationships = await conceptRepository.listRelationships(
      stored.map((item) => item.conceptId),
    );
    if (!snapshot.gradeEstimate?.gradeLevel && extracted.gradeLevel) {
      snapshot.gradeEstimate = {
        gradeLevel: extracted.gradeLevel,
        subject: extracted.subject ?? snapshot.gradeEstimate?.subject ?? null,
        confidence: extracted.gradeConfidence ?? 0.5,
        note:
          (extracted.gradeConfidence ?? 0) < 0.5
            ? "لم نتمكن من تحديد المستوى الدراسي بدقة."
            : null,
      };
    }
    snapshot = {
      ...setStage(snapshot, "concepts", "completed", "تم استخراج المفاهيم", "completed"),
      concepts: stored.map((concept) => ({
        id: concept.conceptId,
        name: concept.name,
        description: concept.description,
        subject: concept.subject,
        importanceScore: concept.importanceScore,
        confidenceScore: concept.confidenceScore,
      })),
      relationships,
      processingTimeMs: Date.now() - started,
      error: snapshot.stages.some((stage) => stage.state === "failed")
        ? snapshot.error
        : null,
    };
    if (snapshot.vision?.summary === undefined && snapshot.stages.find((s) => s.key === "vision")?.state === "failed") {
      snapshot.status = "completed";
    }
    analysisJobStore.finish(materialId, snapshot);
    await auditService.record({
      userId: user.userId,
      actionType: "analysis.completed",
      entityName: "LearningMaterials",
      entityId: materialId,
      description: "page_analysis_completed",
    });
    logger.info("analysis_stage", {
      endpoint: "concepts",
      duration: Date.now() - started,
      status: 200,
    });
  } catch {
    snapshot = setStage(snapshot, "concepts", "failed", "تعذر استخراج المفاهيم.", "failed");
    snapshot.error = {
      code: "CONCEPTS_FAILED",
      message: "تعذر استخراج المفاهيم.",
      stage: "concepts",
    };
    analysisJobStore.finish(materialId, snapshot);
  }
}

async function loadSource(ctx: Awaited<ReturnType<typeof loadOwned>>): Promise<{
  ocr: Awaited<ReturnType<typeof ocrService.recognizeImage>>;
  image: Buffer | null;
}> {
  if (ctx.materialType === "text" || (!ctx.fileUrl && ctx.originalText)) {
    return { ocr: ocrService.fromPastedText(ctx.originalText ?? ""), image: null };
  }
  if (!ctx.fileUrl) {
    throw new ValidationError("تعذر استخراج النص من الصورة.", "SOURCE_MISSING");
  }
  const buffer = await storageService.read(ctx.fileUrl);
  if (ctx.materialType === "pdf" || ctx.mimeType === "application/pdf") {
    const ocr = await ocrService.recognizePdf(buffer);
    return { ocr, image: null };
  }
  const ocr = await ocrService.recognizeImage(buffer);
  return { ocr, image: buffer };
}
