import type { MapMasteryBand } from "./knowledgeMap.js";

export type TeacherRange = "week" | "month";

export interface TeacherClassMeta {
  schoolName: string | null;
  subject: string | null;
  assignedCount: number;
}

export interface TeacherDashboardDto {
  teacher: { id: string; name: string };
  classInfo: TeacherClassMeta;
  scope: {
    range: TeacherRange;
    material: { id: string; title: string } | null;
  };
  updatedAt: string;
  overview: {
    assignedStudents: number;
    completedStudents: number;
    completionLabel: string;
    averageUnderstanding: number | null;
    averageUnderstandingLabel: string;
    needsAdditionalExplanation: number;
    explanationRequests: number;
  };
  conceptColumns: { conceptId: string; name: string }[];
  students: TeacherStudentRow[];
  studentTotal: number;
  reviewPriority: TeacherReviewConcept[];
  modeDistribution: { code: string; name: string; count: number; percent: number }[];
  recommendations: { id: string; text: string }[];
  actions: { review: boolean; parentNote: boolean; parentNoteStatus: "unavailable" };
  empty: {
    students: string | null;
    lessons: string | null;
    mastery: string | null;
    review: string | null;
  };
}

export interface TeacherStudentRow {
  studentId: string;
  name: string;
  modeCode: string | null;
  modeName: string | null;
  lastActivityAt: string | null;
  cells: { conceptId: string; band: MapMasteryBand; status: string }[];
}

export interface TeacherReviewConcept {
  conceptId: string;
  name: string;
  affectedStudents: number;
  averageMastery: number | null;
  incorrectAnswers: number;
  explanationRequests: number;
  adaptations: number;
  materialTitle: string | null;
  recommendedAction: string;
  band: MapMasteryBand;
}

export interface TeacherStudentListDto {
  page: number;
  pageSize: number;
  total: number;
  students: {
    studentId: string;
    name: string;
    gradeLevel: string | null;
    modeCode: string | null;
    modeName: string | null;
    lastActivityAt: string | null;
  }[];
}

export interface TeacherStudentInsightDto {
  student: {
    studentId: string;
    name: string;
    gradeLevel: string | null;
    modeCode: string | null;
    modeName: string | null;
  };
  pulse: { score: number; status: string } | null;
  progress: {
    sessionCount: number;
    completedSessions: number;
    lastActivityAt: string | null;
  };
  mastery: {
    conceptId: string;
    name: string;
    band: MapMasteryBand;
    score: number | null;
    attempts: number;
    correct: number;
    incorrect: number;
    explanationCount: number;
  }[];
  weakConcepts: { conceptId: string; name: string; band: MapMasteryBand }[];
  strongConcepts: { conceptId: string; name: string; band: MapMasteryBand }[];
  recentAnswers: {
    answeredAt: string;
    isCorrect: boolean | null;
    conceptName: string | null;
  }[];
  recentInteractions: { type: string; createdAt: string; conceptName: string | null }[];
  adaptations: { reason: string; createdAt: string; conceptName: string | null }[];
}

export interface TeacherConceptListDto {
  concepts: TeacherReviewConcept[];
}

export interface TeacherLessonListDto {
  lessons: {
    materialId: string;
    title: string;
    studentCount: number;
    lastActivityAt: string | null;
  }[];
}

export interface TeacherReviewDto {
  concepts: TeacherReviewConcept[];
  emptyMessage: string | null;
}
