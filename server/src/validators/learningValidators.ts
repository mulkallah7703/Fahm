import { z } from "zod";
import { LEARNING_MODE_CODES } from "../config/learningModes.js";

export const learningMaterialParam = z.string().uuid("معرف المادة غير صالح.");

export const selectModeSchema = z.object({
  modeCode: z.enum(LEARNING_MODE_CODES, {
    errorMap: () => ({ message: "طريقة الشرح غير صالحة." }),
  }),
  adaptiveEnabled: z.boolean(),
  startLesson: z.boolean().optional(),
});
