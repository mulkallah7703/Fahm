import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startedAt: number;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id");
  req.requestId = incoming && incoming.length <= 64 ? incoming : randomUUID();
  req.startedAt = Date.now();
  res.setHeader("x-request-id", req.requestId);
  next();
}
