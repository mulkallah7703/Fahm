import { z } from "zod";
import { BLIND_ACTIONS, BLIND_SPEEDS, TTS_MAX_CHARS } from "../config/blind.js";

export const blindActionBodySchema = z.object({
  action: z.enum(BLIND_ACTIONS),
  paragraphIndex: z.number().int().min(1).max(20).optional(),
  speed: z.number().refine((value) => (BLIND_SPEEDS as readonly number[]).includes(value)).optional(),
  segmentId: z.string().uuid().optional(),
});

export const blindAudioBodySchema = z.object({
  segmentId: z.string().uuid("معرف المقطع غير صالح."),
});

export const ttsBodySchema = z.object({
  text: z.string().min(1, "لا يوجد نص للقراءة.").max(TTS_MAX_CHARS, "النص أطول من الحد المسموح للصوت."),
  voice: z.string().max(120).optional(),
  sessionId: z.string().uuid().optional(),
});
