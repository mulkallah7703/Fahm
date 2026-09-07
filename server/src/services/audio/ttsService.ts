import { env } from "../../config/env.js";
import { TTS_MAX_CHARS } from "../../config/blind.js";
import {
  audioContentHash,
  audioGenerationRepository,
} from "../../repositories/audioGenerationRepository.js";
import type { TtsResult } from "../../types/blind.js";
import { ValidationError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";

export function validateTtsText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) throw new ValidationError("لا يوجد نص للقراءة.");
  if (trimmed.length > TTS_MAX_CHARS) {
    throw new ValidationError("النص أطول من الحد المسموح للصوت.");
  }
  return trimmed;
}

export const ttsService = {
  isConfigured(): boolean {
    return Boolean(env.elevenLabs.apiKey && env.elevenLabs.voiceId);
  },

  async generate(input: {
    text: string;
    studentProfileId: string;
    sessionId?: string | null;
    voice?: string | null;
  }): Promise<TtsResult> {
    const text = validateTtsText(input.text);
    if (!this.isConfigured()) {
      return {
        provider: "browser",
        fallback: true,
        text,
        audioId: null,
        durationSeconds: null,
        reason: "tts_unavailable",
      };
    }

    const voice = input.voice || env.elevenLabs.voiceId;
    const hash = audioContentHash(text, voice, "elevenlabs");
    const cachedFile = await audioGenerationRepository.readFile(hash);
    if (cachedFile) {
      const existing = await audioGenerationRepository.findByHash(hash);
      return {
        provider: "elevenlabs",
        fallback: false,
        text,
        audioId: existing?.id ?? hash,
        durationSeconds: existing?.durationSeconds ?? null,
        reason: null,
      };
    }

    try {
      const bytes = await synthesizeElevenLabs(text, voice);
      await audioGenerationRepository.saveFile(hash, bytes);
      const id = await audioGenerationRepository.insert({
        studentProfileId: input.studentProfileId,
        sessionId: input.sessionId ?? null,
        provider: "elevenlabs",
        voice,
        contentHash: hash,
        sourceText: text,
        durationSeconds: null,
      });
      return {
        provider: "elevenlabs",
        fallback: false,
        text,
        audioId: id ?? hash,
        durationSeconds: null,
        reason: null,
      };
    } catch (error) {
      logger.warn("tts_provider_failed", {
        reason: error instanceof Error ? error.name : "unknown",
      });
      return {
        provider: "browser",
        fallback: true,
        text,
        audioId: null,
        durationSeconds: null,
        reason: "tts_failed",
      };
    }
  },

  async readOwnedFile(id: string, studentProfileId: string): Promise<{ bytes: Buffer; hash: string } | null> {
    const row = await audioGenerationRepository.findOwned(id, studentProfileId);
    const hash = row?.contentHash ?? id;
    if (row && row.studentProfileId.toLowerCase() !== studentProfileId.toLowerCase()) {
      return null;
    }
    const bytes = await audioGenerationRepository.readFile(hash);
    if (!bytes) return null;
    if (!row) return { bytes, hash };
    return { bytes, hash };
  },
};

async function synthesizeElevenLabs(text: string, voiceId: string): Promise<Buffer> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: "POST",
    headers: {
      "xi-api-key": env.elevenLabs.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: env.elevenLabs.modelId,
      voice_settings: { stability: 0.4, similarity_boost: 0.7 },
    }),
  });
  if (!response.ok) {
    throw new Error("elevenlabs_http");
  }
  return Buffer.from(await response.arrayBuffer());
}
