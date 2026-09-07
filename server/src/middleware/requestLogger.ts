import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  res.on("finish", () => {
    logger.info("http_request", {
      requestId: req.requestId,
      method: req.method,
      endpoint: req.originalUrl.split("?")[0] ?? req.path,
      status: res.statusCode,
      duration: Date.now() - req.startedAt,
    });
  });
  next();
}
