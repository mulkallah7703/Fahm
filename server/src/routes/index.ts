import { Router } from "express";
import { authenticate, requireStudent, requireTeacher } from "../middleware/auth.js";
import { apiLimiter } from "../middleware/rateLimit.js";
import { authRoutes } from "./authRoutes.js";
import { dashboardRoutes } from "./dashboardRoutes.js";
import { historyRoutes } from "./historyRoutes.js";
import { knowledgeMapController } from "../controllers/knowledgeMapController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { learningRoutes } from "./learningRoutes.js";
import { materialRoutes } from "./materialRoutes.js";
import { teacherRoutes } from "./teacherRoutes.js";
import { ttsRoutes } from "./ttsRoutes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);

apiRouter.use(apiLimiter);
apiRouter.use("/dashboard", authenticate, requireStudent, dashboardRoutes);
apiRouter.use("/materials", authenticate, requireStudent, materialRoutes);
apiRouter.use("/history", authenticate, requireStudent, historyRoutes);
apiRouter.use("/learning", authenticate, requireStudent, learningRoutes);
apiRouter.get("/knowledge-map", authenticate, requireStudent, asyncHandler(knowledgeMapController.studentMap));
apiRouter.use("/teacher", authenticate, requireTeacher, teacherRoutes);
apiRouter.use("/tts", authenticate, requireStudent, ttsRoutes);

apiRouter.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});
