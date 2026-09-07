import { logger } from "../../utils/logger.js";
import { aiService } from "../ai/aiService.js";
import { prepareVisionImage } from "../ocr/preprocess.js";
import { analyzeLocally } from "./localVision.js";
import type { VisionPayload } from "./visionSchema.js";

export interface VisionResult {
  payload: VisionPayload;
  modelName: string;
  processingTimeMs: number;
  raw: string | null;
}

export const visionService = {
  async analyze(input: {
    ocrText: string;
    image?: Buffer | null;
  }): Promise<VisionResult> {
    const started = Date.now();
    if (aiService.isEnabled()) {
      try {
        const image = input.image ? await prepareVisionImage(input.image) : null;
        const payload = await aiService.analyzeVision({
          ocrText: input.ocrText,
          image,
        });
        return {
          payload,
          modelName: "openai-vision",
          processingTimeMs: Date.now() - started,
          raw: null,
        };
      } catch (error) {
        logger.warn("vision_ai_fallback", { category: "VISION" });
        if (!input.ocrText && !input.image) throw error;
      }
    }

    const payload = await analyzeLocally({
      text: input.ocrText,
      image: input.image,
    });
    return {
      payload,
      modelName: "fahm-local-vision",
      processingTimeMs: Date.now() - started,
      raw: null,
    };
  },
};
