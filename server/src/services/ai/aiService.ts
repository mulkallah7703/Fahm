import OpenAI from "openai";
import { z } from "zod";
import { AI_MAX_RETRIES, AI_TIMEOUT_MS, MAX_OCR_CHARS_FOR_AI } from "../../config/analysis.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import { truncateForAi } from "../../utils/words.js";
import {
  conceptPayloadSchema,
  visionPayloadSchema,
  type ConceptPayload,
  type VisionPayload,
} from "../vision/visionSchema.js";

function client(): OpenAI {
  if (!env.openai.apiKey) {
    throw new AppError("AI_NOT_CONFIGURED", "تعذر تحليل المحتوى حاليًا.", 503);
  }
  return new OpenAI({ apiKey: env.openai.apiKey, timeout: AI_TIMEOUT_MS });
}

async function completeJson<S extends z.ZodTypeAny>(input: {
  schema: S;
  system: string;
  user: string;
  image?: { mime: string; base64: string } | null;
  model: string;
}): Promise<z.output<S>> {
  const openai = client();
  let lastError: unknown;
  for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt += 1) {
    try {
      const content: OpenAI.Chat.ChatCompletionContentPart[] = [
        { type: "text", text: input.user },
      ];
      if (input.image) {
        content.push({
          type: "image_url",
          image_url: {
            url: `data:${input.image.mime};base64,${input.image.base64}`,
          },
        });
      }

      const response = await openai.chat.completions.create({
        model: input.model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.system },
          { role: "user", content },
        ],
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) {
        throw new AppError("AI_EMPTY", "تعذر تحليل المحتوى حاليًا.", 502);
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new AppError("AI_MALFORMED", "تعذر تحليل المحتوى حاليًا.", 502);
      }
      const valid = input.schema.safeParse(parsed);
      if (!valid.success) {
        throw new AppError("AI_INVALID", "تعذر تحليل المحتوى حاليًا.", 502);
      }
      return valid.data;
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number }).status;
      const retryable = status === 429 || (status !== undefined && status >= 500);
      if (!retryable || attempt === AI_MAX_RETRIES) break;
    }
  }
  logger.warn("ai_call_failed", { category: "AI" });
  if (lastError instanceof AppError) throw lastError;
  throw new AppError("AI_UNAVAILABLE", "تعذر تحليل المحتوى حاليًا.", 503);
}

export const aiService = {
  isEnabled(): boolean {
    return Boolean(env.openai.apiKey);
  },

  async analyzeVision(input: {
    ocrText: string;
    image?: { mime: string; base64: string } | null;
  }): Promise<VisionPayload> {
    const text = truncateForAi(input.ocrText, MAX_OCR_CHARS_FOR_AI);
    return completeJson({
      schema: visionPayloadSchema,
      model: env.openai.visionModel,
      system:
        "You analyze educational textbook pages for FAHM. Return STRICT JSON only. Do not invent diagrams, tables, or grade levels that are not supported by the page. If unsure, use empty arrays and low confidence. Arabic content should keep Arabic strings.",
      user: `Analyze this educational page. OCR text (may be incomplete):\n${text || "(no OCR text)"}`,
      image: input.image,
    });
  },

  async completeStructured<S extends z.ZodTypeAny>(input: {
    schema: S;
    system: string;
    user: string;
    model?: string;
  }): Promise<z.output<S> | null> {
    if (!env.openai.apiKey) return null;
    try {
      return await completeJson({
        schema: input.schema,
        system: input.system,
        user: input.user,
        model: input.model ?? env.openai.textModel,
      });
    } catch {
      return null;
    }
  },

  async extractConcepts(input: { ocrText: string; visionSummary?: string }): Promise<ConceptPayload> {
    const text = truncateForAi(input.ocrText, MAX_OCR_CHARS_FOR_AI);
    return completeJson({
      schema: conceptPayloadSchema,
      model: env.openai.textModel,
      system:
        "Extract only educational concepts clearly present in the page. Do not hallucinate. Return STRICT JSON. Keep concept names in the page language. Relationships only if the page supports them.",
      user: `OCR:\n${text}\n\nVision summary:\n${input.visionSummary ?? ""}`,
    });
  },
};
