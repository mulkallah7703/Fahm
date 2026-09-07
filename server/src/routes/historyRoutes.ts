import { Router } from "express";
import { historyController } from "../controllers/historyController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const historyRoutes = Router();

historyRoutes.get("/", asyncHandler(historyController.list));
historyRoutes.get("/:sessionId", asyncHandler(historyController.get));
