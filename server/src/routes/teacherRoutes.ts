import { Router } from "express";
import { teacherController } from "../controllers/teacherController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const teacherRoutes = Router();

teacherRoutes.get("/dashboard", asyncHandler(teacherController.dashboard));
teacherRoutes.get("/students", asyncHandler(teacherController.students));
teacherRoutes.get("/students/:studentId", asyncHandler(teacherController.student));
teacherRoutes.get("/concepts", asyncHandler(teacherController.concepts));
teacherRoutes.get("/review", asyncHandler(teacherController.review));
teacherRoutes.get("/lessons", asyncHandler(teacherController.lessons));
