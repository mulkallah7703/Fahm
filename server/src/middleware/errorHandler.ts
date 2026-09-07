import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import { MAX_UPLOAD_SIZE_MB } from "../config/limits.js";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    res.status(400).json({
      success: false,
      error: {
        code: tooLarge ? "FILE_TOO_LARGE" : "UPLOAD_ERROR",
        message: tooLarge
          ? `حجم الملف أكبر من الحد المسموح (${MAX_UPLOAD_SIZE_MB} ميغابايت).`
          : "تعذر رفع الملف.",
      },
    });
    return;
  }

  if (err instanceof AppError) {
    if (!err.expose) {
      logger.error("app_error", {
        requestId: req.requestId,
        endpoint: req.originalUrl.split("?")[0],
        status: err.statusCode,
        category: err.code,
      });
    }
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const detail = err instanceof Error ? err.message : "unknown";
  logger.error("unhandled_error", {
    requestId: req.requestId,
    endpoint: req.originalUrl.split("?")[0],
    status: 500,
    category: "INTERNAL",
    ...(!env.isProduction ? { detail } : {}),
  });

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL",
      message: "حدث خطأ غير متوقع. حاول مرة أخرى.",
    },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "المسار غير موجود.",
    },
  });
}
