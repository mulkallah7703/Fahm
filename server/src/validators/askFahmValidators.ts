import { z } from "zod";
import { ASK_FAHM_ACTIONS } from "../config/askFahm.js";
import { ASK_MAX_LENGTH } from "../config/teaching.js";

export const askMessageBodySchema = z
  .object({
    message: z.string().max(ASK_MAX_LENGTH).optional(),
    question: z.string().max(ASK_MAX_LENGTH).optional(),
    conceptId: z.string().uuid("معرف المفهوم غير صالح.").optional(),
  })
  .superRefine((value, ctx) => {
    const text = (value.message ?? value.question ?? "").trim();
    if (!text) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "اكتب سؤالك.", path: ["message"] });
    }
  });

export function askMessageText(body: z.infer<typeof askMessageBodySchema>): string {
  return (body.message ?? body.question ?? "").trim();
}

export const askActionBodySchema = z.object({
  action: z.enum(ASK_FAHM_ACTIONS),
});
