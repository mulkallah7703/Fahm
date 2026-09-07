export type RoleName = "student" | "teacher" | "admin";

export interface AuthUser {
  userId: string;
  roleId: number;
  roleName: RoleName;
  email: string;
  firstName: string;
  lastName: string | null;
  displayName: string;
  studentProfileId: string | null;
  teacherProfileId: string | null;
}

export interface StudentRecord {
  userId: string;
  studentProfileId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  displayName: string;
  gradeLevel: string | null;
  educationLevel: string | null;
  preferredLearningStyle: string | null;
  defaultLearningMode: string | null;
  preferredLearningModeCode: string | null;
  preferredLearningModeName: string | null;
  aiAdaptationEnabled: boolean;
}

export interface MasteryRow {
  conceptId: string;
  conceptName: string;
  subject: string | null;
  masteryScore: number;
  masteryStatus: string;
  attemptsCount: number;
  correctAnswers: number;
  incorrectAnswers: number;
  explanationCount: number;
  lastInteractionAt: Date | null;
}

export interface LearningPulseResult {
  score: number;
  status: string;
  recommendedAction: string | null;
}

export interface ReviewConcept {
  conceptId: string;
  name: string;
  subject: string | null;
  masteryScore: number;
  status: string;
}

export interface ContinueLearning {
  sessionId: string;
  materialId: string | null;
  title: string;
  pageNumber: number | null;
  stoppedAtConcept: string | null;
  conceptCount: number;
  modeCode: string | null;
  modeName: string | null;
}

export interface RecentLesson {
  sessionId: string;
  materialId: string | null;
  title: string;
  pageNumber: number | null;
  subject: string | null;
  conceptCount: number;
  modeCode: string | null;
  modeName: string | null;
  status: string;
  lastAccessedAt: string;
}

export interface Recommendation {
  text: string;
  action: "review" | "continue" | "upload";
  conceptId?: string;
  sessionId?: string;
  materialId?: string;
}

export interface DashboardData {
  student: {
    id: string;
    firstName: string;
    lastName: string | null;
    displayName: string;
    gradeLevel: string | null;
    preferredLearningMode: string | null;
    preferredLearningModeName: string | null;
  };
  learningPulse: LearningPulseResult | null;
  reviewConcepts: ReviewConcept[];
  continueLearning: ContinueLearning | null;
  recentLessons: RecentLesson[];
  recommendation: Recommendation | null;
}

export interface UploadResult {
  materialId: string;
  sessionId: string;
  pageId: string;
  nextState: "processing";
  title: string;
}

export interface JwtPayload {
  sub: string;
  roleId: number;
  studentProfileId: string | null;
}

export interface AuditInput {
  userId?: string | null;
  actionType: string;
  entityName?: string | null;
  entityId?: string | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}
