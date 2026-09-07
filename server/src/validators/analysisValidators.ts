import { z } from "zod";

export const materialIdParam = z.string().uuid("معرف المادة غير صالح.");

export const analyzeBodySchema = z.object({
  force: z.boolean().optional(),
});

export const ocrCorrectionSchema = z.object({
  text: z.string().min(1, "أدخل النص المصحح أولاً.").max(50_000),
});

export const startLearningSchema = z.object({
  modeCode: z.enum(["focus", "blind", "dyslexia", "adaptive"]).default("adaptive"),
});
