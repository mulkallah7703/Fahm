import { z } from "zod";
import {
  DYSLEXIA_ACTIONS,
  DYSLEXIA_FONT_SIZES,
  NOTE_MAX_LENGTH,
  WORD_MAX_LENGTH,
} from "../config/dyslexia.js";

export const dyslexiaActionBodySchema = z.object({
  action: z.enum(DYSLEXIA_ACTIONS),
  word: z.string().min(1).max(WORD_MAX_LENGTH).optional(),
  segmentId: z.string().uuid().optional(),
  note: z.string().min(1).max(NOTE_MAX_LENGTH).optional(),
  fontSize: z.enum(DYSLEXIA_FONT_SIZES).optional(),
  lineSpacing: z.union([z.literal(1.6), z.literal(2.1), z.literal(2.6)]).optional(),
  speechRate: z
    .union([z.literal(0.8), z.literal(1), z.literal(1.25), z.literal(1.5), z.literal(1.75), z.literal(2)])
    .optional(),
  highlightCurrent: z.boolean().optional(),
  autoRead: z.boolean().optional(),
  wordClickEnabled: z.boolean().optional(),
});
