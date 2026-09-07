import type { AuthUser } from "../../types/index.js";
import type { TeacherRange, TeacherReviewDto, TeacherStudentInsightDto } from "../../types/teacher.js";
import { teacherDashboardService } from "./teacherDashboardService.js";

export const teacherInsightService = {
  getStudent(user: AuthUser, studentId: string): Promise<TeacherStudentInsightDto> {
    return teacherDashboardService.getStudent(user, studentId);
  },
  listConcepts(
    user: AuthUser,
    range: TeacherRange,
    materialId?: string,
    search?: string | null,
  ): Promise<TeacherReviewDto> {
    return teacherDashboardService.listConcepts(user, range, materialId, search);
  },
  getReview(user: AuthUser, range: TeacherRange): Promise<TeacherReviewDto> {
    return teacherDashboardService.getReview(user, range);
  },
};
