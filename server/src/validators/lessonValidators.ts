import { z } from "zod";
import { ANSWER_MAX_LENGTH, ASK_MAX_LENGTH } from "../config/teaching.js";

export const sessionIdParam = z.string().uuid("معرف الجلسة غير صالح.");

export const answerBodySchema = z.object({
  questionId: z.string().uuid("معرف السؤال غير صالح."),
  answer: z.string().min(1, "أدخل إجابتك.").max(ANSWER_MAX_LENGTH),
  responseTimeSeconds: z.number().int().min(0).max(3600).optional().nullable(),
});

export const askBodySchema = z.object({
  question: z.string().min(1, "اكتب سؤالك.").max(ASK_MAX_LENGTH),
});
