import type {
  TeacherDashboard,
  TeacherLessonList,
  TeacherRange,
  TeacherReview,
  TeacherStudentInsight,
  TeacherStudentList,
} from "../types";
import { apiClient } from "./apiClient";

export const teacherApi = {
  dashboard(range: TeacherRange, materialId?: string) {
    const params = new URLSearchParams({ range });
    if (materialId) params.set("materialId", materialId);
    return apiClient.get<TeacherDashboard>(`/api/teacher/dashboard?${params}`);
  },
  students(page = 1, pageSize = 12, search?: string) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set("search", search);
    return apiClient.get<TeacherStudentList>(`/api/teacher/students?${params}`);
  },
  student(studentId: string) {
    return apiClient.get<TeacherStudentInsight>(`/api/teacher/students/${studentId}`);
  },
  concepts(range: TeacherRange = "week") {
    return apiClient.get<TeacherReview>(`/api/teacher/concepts?range=${range}`);
  },
  review(range: TeacherRange = "week") {
    return apiClient.get<TeacherReview>(`/api/teacher/review?range=${range}`);
  },
  lessons() {
    return apiClient.get<TeacherLessonList>("/api/teacher/lessons");
  },
};
