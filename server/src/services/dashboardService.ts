import { userRepository } from "../repositories/userRepository.js";
import { sessionRepository } from "../repositories/sessionRepository.js";
import type { AuthUser, DashboardData } from "../types/index.js";
import { ForbiddenError } from "../utils/errors.js";
import { learningPulseService } from "./learningPulseService.js";
import { recommendationService } from "./recommendationService.js";

export const dashboardService = {
  async getDashboard(user: AuthUser): Promise<DashboardData> {
    if (!user.studentProfileId) {
      throw new ForbiddenError("لا يوجد ملف تعلم مرتبط بهذا الحساب.");
    }

    const student = await userRepository.findStudentByUserId(user.userId);
    if (!student) {
      throw new ForbiddenError("لا يوجد ملف تعلم مرتبط بهذا الحساب.");
    }

    const studentProfileId = student.studentProfileId;

    const [learningPulse, reviewConcepts, continueLearning, recentLessons] =
      await Promise.all([
        learningPulseService.getPulse(studentProfileId),
        learningPulseService.getReviewConcepts(studentProfileId),
        sessionRepository.findIncomplete(studentProfileId),
        sessionRepository.listRecent(studentProfileId),
      ]);

    return {
      student: {
        id: student.studentProfileId,
        firstName: student.firstName,
        lastName: student.lastName,
        displayName: student.displayName,
        gradeLevel: student.gradeLevel,
        preferredLearningMode:
          student.preferredLearningModeCode ?? student.defaultLearningMode,
        preferredLearningModeName: student.preferredLearningModeName,
      },
      learningPulse,
      reviewConcepts,
      continueLearning,
      recentLessons,
      recommendation: recommendationService.build({
        reviewConcepts,
        continueLearning,
      }),
    };
  },
};
