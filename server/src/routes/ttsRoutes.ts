import { Router } from "express";
import { ttsController } from "../controllers/ttsController.js";
import { ttsLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const ttsRoutes = Router();

ttsRoutes.post("/", ttsLimiter, asyncHandler(ttsController.create));
ttsRoutes.get("/:id", asyncHandler(ttsController.file));
