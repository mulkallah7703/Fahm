import { z } from "zod";
import { TEACHER_PAGE_SIZE_DEFAULT, TEACHER_PAGE_SIZE_MAX, TEACHER_RANGES } from "../config/teacher.js";
import { ValidationError } from "../utils/errors.js";

export const teacherRangeSchema = z.enum(TEACHER_RANGES);
export const teacherIdParam = z.string().uuid();

export const teacherDashboardQuery = z.object({
  range: teacherRangeSchema.optional(),
  materialId: z.string().uuid().optional(),
});

export const teacherStudentListQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(TEACHER_PAGE_SIZE_MAX).optional(),
  search: z.string().max(80).optional(),
});

export const teacherConceptQuery = z.object({
  range: teacherRangeSchema.optional(),
  materialId: z.string().uuid().optional(),
  search: z.string().max(80).optional(),
  status: z.enum(["review", "extra", "all"]).optional(),
});

export function parseRange(value: unknown): "week" | "month" {
  const parsed = teacherRangeSchema.safeParse(value ?? "week");
  if (!parsed.success) throw new ValidationError("نطاق التاريخ غير صالح.");
  return parsed.data;
}

export function pageDefaults(query: z.infer<typeof teacherStudentListQuery>) {
  return {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? TEACHER_PAGE_SIZE_DEFAULT,
    search: query.search?.trim() || null,
  };
}
