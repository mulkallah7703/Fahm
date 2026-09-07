import { createWorker, type Worker } from "tesseract.js";
import { detectScriptLanguage } from "../../utils/words.js";
import { logger } from "../../utils/logger.js";
import { extractPdfFirstPage } from "./pdfTextService.js";
import { preprocessForOcr } from "./preprocess.js";

export interface OcrOutput {
  text: string;
  language: string;
  confidence: number;
  processingTimeMs: number;
  engine: string;
  pageCount: number | null;
}

let worker: Worker | null = null;
let workerReady: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (worker) return worker;
  if (!workerReady) {
    workerReady = createWorker("ara+eng", 1, {
      logger: () => undefined,
    }).then((created) => {
      worker = created;
      return created;
    });
  }
  return workerReady;
}

export async function shutdownOcr(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
    workerReady = null;
  }
}

export const ocrService = {
  async recognizeImage(buffer: Buffer): Promise<OcrOutput> {
    const started = Date.now();
    const prepared = await preprocessForOcr(buffer);
    const tess = await getWorker();
    const result = await tess.recognize(prepared);
    const text = result.data.text.replace(/\r/g, "").trim();
    const language = detectScriptLanguage(text);
    return {
      text,
      language: language === "mixed" ? "ar+en" : language,
      confidence: Number(result.data.confidence ?? 0),
      processingTimeMs: Date.now() - started,
      engine: "tesseract.js",
      pageCount: 1,
    };
  },

  async recognizePdf(buffer: Buffer): Promise<OcrOutput> {
    const started = Date.now();
    const { pageCount, text } = await extractPdfFirstPage(buffer);
    if (!text) {
      logger.info("pdf_text_empty", { pageCount });
    }
    return {
      text,
      language: detectScriptLanguage(text) === "en" ? "en" : "ar",
      confidence: text.length > 40 ? 90 : text.length > 0 ? 55 : 0,
      processingTimeMs: Date.now() - started,
      engine: "pdfjs-embedded-text",
      pageCount,
    };
  },

  fromPastedText(text: string): OcrOutput {
    return {
      text,
      language: detectScriptLanguage(text) === "en" ? "en" : "ar",
      confidence: 100,
      processingTimeMs: 0,
      engine: "pasted-text",
      pageCount: 1,
    };
  },
};
