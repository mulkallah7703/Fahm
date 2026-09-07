import { randomUUID } from "node:crypto";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_TEXT_LENGTH,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
  MIME_EXTENSION,
} from "../config/limits.js";
import { materialRepository } from "../repositories/materialRepository.js";
import { sessionRepository } from "../repositories/sessionRepository.js";
import type { AuthUser, UploadResult } from "../types/index.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/errors.js";
import {
  detectAllowedMime,
  isAllowedDeclaredMime,
} from "../utils/fileSignature.js";
import { normalizeText, titleFromFileName, titleFromText } from "../utils/sanitize.js";
import { auditService } from "./auditService.js";
import { storageService } from "./storage/storageService.js";

export const materialService = {
  async uploadFile(input: {
    user: AuthUser;
    buffer: Buffer;
    originalName: string;
    declaredMime: string | undefined;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<UploadResult> {
    const studentProfileId = requireStudent(input.user);

    if (input.buffer.length === 0) {
      throw new ValidationError("الملف فارغ.", "EMPTY_FILE");
    }
    if (input.buffer.length > MAX_UPLOAD_SIZE_BYTES) {
      throw new ValidationError(
        `حجم الملف أكبر من الحد المسموح (${MAX_UPLOAD_SIZE_MB} ميغابايت).`,
        "FILE_TOO_LARGE",
      );
    }

    const detected = detectAllowedMime(input.buffer);
    if (!detected || !ALLOWED_UPLOAD_MIME_TYPES.includes(detected)) {
      throw new ValidationError("نوع الملف غير مدعوم.", "UNSUPPORTED_TYPE");
    }
    if (!isAllowedDeclaredMime(input.declaredMime, detected)) {
      throw new ValidationError("نوع الملف غير مدعوم.", "MIME_MISMATCH");
    }

    const ext = MIME_EXTENSION[detected];
    const key = `${studentProfileId}/${randomUUID()}.${ext}`;
    const stored = await storageService.upload({
      key,
      buffer: input.buffer,
      mimeType: detected,
    });

    const title = titleFromFileName(input.originalName, "صفحة كتاب");
    const materialType = detected === "application/pdf" ? "pdf" : "image";

    try {
      const created = await materialRepository.createWithPageAndSession({
        studentProfileId,
        title,
        materialType,
        originalFileName: input.originalName.slice(0, 500),
        fileUrl: stored.key,
        fileSizeBytes: stored.size,
        mimeType: detected,
        language: "ar",
        pageImageUrl: detected === "application/pdf" ? null : stored.key,
        originalText: null,
      });

      await auditService.record({
        userId: input.user.userId,
        actionType: "material.upload",
        entityName: "LearningMaterials",
        entityId: created.materialId,
        description: materialType,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });

      return {
        materialId: created.materialId,
        sessionId: created.sessionId,
        pageId: created.pageId,
        nextState: "processing",
        title,
      };
    } catch (error) {
      await storageService.delete(stored.key);
      throw error;
    }
  },

  async createFromText(input: {
    user: AuthUser;
    text: string;
    title?: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<UploadResult> {
    const studentProfileId = requireStudent(input.user);
    const text = normalizeText(input.text);

    if (text.length === 0) {
      throw new ValidationError("أدخل نصاً من الدرس أولاً.", "EMPTY_TEXT");
    }
    if (text.length > MAX_TEXT_LENGTH) {
      throw new ValidationError(
        `النص أطول من الحد المسموح (${MAX_TEXT_LENGTH} حرفاً).`,
        "TEXT_TOO_LONG",
      );
    }

    const title =
      input.title?.trim().slice(0, 300) || titleFromText(text, "نص ملصق");

    const created = await materialRepository.createWithPageAndSession({
      studentProfileId,
      title,
      materialType: "text",
      originalFileName: null,
      fileUrl: null,
      fileSizeBytes: Buffer.byteLength(text, "utf8"),
      mimeType: "text/plain",
      language: "ar",
      pageImageUrl: null,
      originalText: text,
    });

    await auditService.record({
      userId: input.user.userId,
      actionType: "material.text",
      entityName: "LearningMaterials",
      entityId: created.materialId,
      description: "text_material",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      materialId: created.materialId,
      sessionId: created.sessionId,
      pageId: created.pageId,
      nextState: "processing",
      title,
    };
  },

  async readOwnedFile(input: { user: AuthUser; materialId: string }): Promise<{
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  }> {
    const studentProfileId = requireStudent(input.user);
    const material = await materialRepository.findOwned(
      input.materialId,
      studentProfileId,
    );
    if (!material || !material.fileUrl) {
      throw new NotFoundError("الملف غير موجود.");
    }

    const buffer = await storageService.read(material.fileUrl);
    return {
      buffer,
      mimeType: material.mimeType ?? "application/octet-stream",
      fileName: material.originalFileName ?? "material",
    };
  },

  async assertSessionOwner(user: AuthUser, sessionId: string): Promise<void> {
    const studentProfileId = requireStudent(user);
    const owned = await sessionRepository.belongsToStudent(sessionId, studentProfileId);
    if (!owned) {
      throw new ForbiddenError();
    }
  },
};

function requireStudent(user: AuthUser): string {
  if (!user.studentProfileId) {
    throw new ForbiddenError("لا يوجد ملف تعلم مرتبط بهذا الحساب.");
  }
  return user.studentProfileId;
}
