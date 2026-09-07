import { z } from "zod";
import { MAX_TEXT_LENGTH } from "../config/limits.js";

export const textMaterialSchema = z.object({
  text: z
    .string()
    .min(1, "أدخل نصاً من الدرس أولاً.")
    .max(MAX_TEXT_LENGTH, `النص أطول من الحد المسموح (${MAX_TEXT_LENGTH} حرفاً).`),
  title: z.string().trim().max(300).optional(),
});

export { historyQuerySchema } from "./historyValidators.js";
