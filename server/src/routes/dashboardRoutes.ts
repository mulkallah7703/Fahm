import { Router } from "express";
import { dashboardController } from "../controllers/dashboardController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const dashboardRoutes = Router();

dashboardRoutes.get("/", asyncHandler(dashboardController.get));
