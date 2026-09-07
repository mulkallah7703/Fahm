import type { Request, Response } from "express";
import { TEACHER_NOT_FOUND } from "../config/teacher.js";
import { teacherDashboardService } from "../services/teacher/teacherDashboardService.js";
import { teacherInsightService } from "../services/teacher/teacherInsightService.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import {
  pageDefaults,
  parseRange,
  teacherConceptQuery,
  teacherDashboardQuery,
  teacherIdParam,
  teacherStudentListQuery,
} from "../validators/teacherValidators.js";

export const teacherController = {
  async dashboard(req: Request, res: Response): Promise<void> {
    const parsed = teacherDashboardQuery.safeParse(req.query);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "نطاق التاريخ غير صالح.");
    const data = await teacherDashboardService.getDashboard(
      req.authUser!,
      parsed.data.range ?? "week",
      parsed.data.materialId,
    );
    res.json({ success: true, data });
  },

  async students(req: Request, res: Response): Promise<void> {
    const parsed = teacherStudentListQuery.safeParse(req.query);
    if (!parsed.success) throw new ValidationError("معاملات البحث غير صالحة.");
    const page = pageDefaults(parsed.data);
    const data = await teacherDashboardService.listStudents(req.authUser!, page.page, page.pageSize, page.search);
    res.json({ success: true, data });
  },

  async student(req: Request, res: Response): Promise<void> {
    const id = teacherIdParam.safeParse(req.params.studentId);
    if (!id.success) throw new NotFoundError(TEACHER_NOT_FOUND);
    const data = await teacherInsightService.getStudent(req.authUser!, id.data);
    res.json({ success: true, data });
  },

  async concepts(req: Request, res: Response): Promise<void> {
    const parsed = teacherConceptQuery.safeParse(req.query);
    if (!parsed.success) throw new ValidationError("معاملات البحث غير صالحة.");
    const data = await teacherInsightService.listConcepts(
      req.authUser!,
      parsed.data.range ?? "week",
      parsed.data.materialId,
      parsed.data.search?.trim() || null,
    );
    res.json({ success: true, data });
  },

  async review(req: Request, res: Response): Promise<void> {
    const range = parseRange(req.query.range);
    const data = await teacherInsightService.getReview(req.authUser!, range);
    res.json({ success: true, data });
  },

  async lessons(req: Request, res: Response): Promise<void> {
    const data = await teacherDashboardService.listLessons(req.authUser!);
    res.json({ success: true, data });
  },
};
