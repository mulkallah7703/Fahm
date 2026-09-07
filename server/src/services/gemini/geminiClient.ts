import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

export interface GeminiImagePart {
  mime: string;
  base64: string;
}

export interface GeminiJsonRequest<S extends z.ZodTypeAny> {
  model: string;
  system: string;
  user: string;
  schema: S;
  image?: GeminiImagePart | null;
}

export type GeminiJsonFn = <S extends z.ZodTypeAny>(
  input: GeminiJsonRequest<S>,
) => Promise<z.output<S> | null>;

export function isGeminiEnabled(): boolean {
  return Boolean(env.gemini.apiKey);
}

export const generateGeminiJson: GeminiJsonFn = async (input) => {
  if (!env.gemini.apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: input.user },
    ];
    if (input.image?.base64) {
      parts.push({
        inlineData: {
          mimeType: input.image.mime,
          data: input.image.base64,
        },
      });
    }
    const response = await ai.models.generateContent({
      model: input.model,
      contents: [{ role: "user", parts }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        systemInstruction: input.system,
      },
    });
    const raw = extractText(response);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const valid = input.schema.safeParse(parsed);
    return valid.success ? valid.data : null;
  } catch (error) {
    logger.warn("gemini_call_failed", { category: "AI", message: error instanceof Error ? error.message : "unknown" });
    return null;
  }
};

function extractText(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const record = response as { text?: unknown; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  if (typeof record.text === "string" && record.text.trim()) return record.text.trim();
  const text = record.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  return text || null;
}
