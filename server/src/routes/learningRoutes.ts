import { Router } from "express";
import { learningController } from "../controllers/learningController.js";
import { lessonController } from "../controllers/lessonController.js";
import { blindController } from "../controllers/blindController.js";
import { dyslexiaController } from "../controllers/dyslexiaController.js";
import { adaptiveController } from "../controllers/adaptiveController.js";
import { assessmentController } from "../controllers/assessmentController.js";
import { askFahmController } from "../controllers/askFahmController.js";
import { knowledgeMapController } from "../controllers/knowledgeMapController.js";
import { learningLimiter, lessonLimiter, ttsLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const learningRoutes = Router();

learningRoutes.get("/modes", asyncHandler(learningController.listModes));
learningRoutes.get("/sessions/:sessionId", asyncHandler(lessonController.get));
learningRoutes.get("/sessions/:sessionId/current-step", asyncHandler(lessonController.currentStep));
learningRoutes.get("/sessions/:sessionId/blind", asyncHandler(blindController.get));
learningRoutes.get("/sessions/:sessionId/blind/segments", asyncHandler(blindController.segments));
learningRoutes.post("/sessions/:sessionId/blind/action", lessonLimiter, asyncHandler(blindController.action));
learningRoutes.post("/sessions/:sessionId/blind/audio", ttsLimiter, asyncHandler(blindController.audio));
learningRoutes.get("/sessions/:sessionId/dyslexia", asyncHandler(dyslexiaController.get));
learningRoutes.post("/sessions/:sessionId/dyslexia/action", lessonLimiter, asyncHandler(dyslexiaController.action));
learningRoutes.get("/sessions/:sessionId/adaptive", asyncHandler(adaptiveController.get));
learningRoutes.post("/sessions/:sessionId/adaptive/action", lessonLimiter, asyncHandler(adaptiveController.action));
learningRoutes.get("/sessions/:sessionId/assessment", asyncHandler(assessmentController.get));
learningRoutes.post("/sessions/:sessionId/assessment/action", lessonLimiter, asyncHandler(assessmentController.action));
learningRoutes.post("/sessions/:sessionId/advance", lessonLimiter, asyncHandler(lessonController.advance));
learningRoutes.post("/sessions/:sessionId/answers", lessonLimiter, asyncHandler(lessonController.answer));
learningRoutes.post("/sessions/:sessionId/hint", lessonLimiter, asyncHandler(lessonController.hint));
learningRoutes.post("/sessions/:sessionId/simplify", lessonLimiter, asyncHandler(lessonController.simplify));
learningRoutes.post("/sessions/:sessionId/example", lessonLimiter, asyncHandler(lessonController.example));
learningRoutes.get("/sessions/:sessionId/map", asyncHandler(knowledgeMapController.sessionMap));
learningRoutes.get("/sessions/:sessionId/map/concepts/:conceptId", asyncHandler(knowledgeMapController.concept));
learningRoutes.post("/sessions/:sessionId/map/action", lessonLimiter, asyncHandler(knowledgeMapController.action));
learningRoutes.get("/sessions/:sessionId/ask", asyncHandler(askFahmController.get));
learningRoutes.post("/sessions/:sessionId/ask", lessonLimiter, asyncHandler(askFahmController.send));
learningRoutes.post("/sessions/:sessionId/ask/action", lessonLimiter, asyncHandler(askFahmController.action));
learningRoutes.post("/sessions/:sessionId/complete", lessonLimiter, asyncHandler(lessonController.complete));
learningRoutes.get("/:materialId/setup", asyncHandler(learningController.setup));
learningRoutes.get("/:materialId/recommendation", asyncHandler(learningController.recommendation));
learningRoutes.get("/:materialId/session", asyncHandler(learningController.session));
learningRoutes.post(
  "/:materialId/mode",
  learningLimiter,
  asyncHandler(learningController.selectMode),
);
