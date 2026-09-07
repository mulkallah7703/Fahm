import {
  TEACHER_CONCEPT_COLUMNS,
  TEACHER_DASHBOARD_STUDENT_LIMIT,
  TEACHER_NOT_FOUND,
} from "../../config/teacher.js";
import { teacherRepository, type TeacherMasteryRow } from "../../repositories/teacherRepository.js";
import type { AuthUser } from "../../types/index.js";
import type {
  TeacherDashboardDto,
  TeacherLessonListDto,
  TeacherRange,
  TeacherReviewConcept,
  TeacherReviewDto,
  TeacherStudentInsightDto,
  TeacherStudentListDto,
} from "../../types/teacher.js";
import { ForbiddenError, NotFoundError } from "../../utils/errors.js";
import { auditService } from "../auditService.js";
import { computeOverallPulse } from "../masteryCalculationService.js";
import { masteryLabel } from "../teaching/assessmentPlanner.js";
import {
  bandOf,
  classAverage,
  percentParts,
  rangeStart,
  recommendTeacher,
  reviewAction,
  studentNeedsExtra,
} from "./teacherMetrics.js";

function requireTeacher(user: AuthUser): string {
  if (user.roleName !== "teacher" || !user.teacherProfileId) {
    throw new ForbiddenError("هذه الصفحة مخصصة للمعلمين.");
  }
  return user.teacherProfileId;
}

function isCompleted(status: string, completedAt: Date | null): boolean {
  return Boolean(completedAt) || status === "completed";
}

async function loadRoster(teacherProfileId: string, search?: string | null) {
  const students = await teacherRepository.listAssignedStudents(teacherProfileId, search);
  const ids = students.map((item) => item.studentProfileId);
  const [mastery, sessions, activity] = await Promise.all([
    teacherRepository.listMastery(ids),
    teacherRepository.listSessions(ids),
    teacherRepository.latestActivity(ids),
  ]);
  return { students, ids, mastery, sessions, activity };
}

function masteryByStudent(rows: TeacherMasteryRow[]) {
  const map = new Map<string, TeacherMasteryRow[]>();
  for (const row of rows) {
    const list = map.get(row.studentProfileId) ?? [];
    list.push(row);
    map.set(row.studentProfileId, list);
  }
  return map;
}

function latestSessionByStudent(sessions: Awaited<ReturnType<typeof teacherRepository.listSessions>>) {
  const map = new Map<string, (typeof sessions)[number]>();
  const sorted = [...sessions].sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime());
  for (const row of sorted) {
    if (!map.has(row.studentProfileId)) map.set(row.studentProfileId, row);
  }
  return map;
}

function buildReview(
  mastery: TeacherMasteryRow[],
  concepts: Awaited<ReturnType<typeof teacherRepository.listConceptsForMaterials>>,
  explanations: Map<string, number>,
  adaptations: Map<string, number>,
  search?: string | null,
): TeacherReviewConcept[] {
  const conceptMeta = new Map<string, { name: string; title: string }>();
  for (const item of concepts) {
    if (!conceptMeta.has(item.conceptId)) conceptMeta.set(item.conceptId, { name: item.name, title: item.title });
  }
  const grouped = new Map<string, TeacherMasteryRow[]>();
  for (const row of mastery) {
    const list = grouped.get(row.conceptId) ?? [];
    list.push(row);
    grouped.set(row.conceptId, list);
  }
  const items: TeacherReviewConcept[] = [];
  for (const [conceptId, rows] of grouped) {
    const weak = rows.filter((row) => {
      if ((row.attemptsCount ?? 0) === 0) return false;
      const label = masteryLabel(row.masteryScore, row.masteryStatus);
      return label === "يحتاج مراجعة" || label === "شرح إضافي";
    });
    if (weak.length === 0) continue;
    const avg = classAverage(weak);
    const band = avg !== null && avg <= 39 ? "شرح إضافي" as const : "يحتاج مراجعة" as const;
    const meta = conceptMeta.get(conceptId);
    const name = meta?.name ?? weak[0]?.conceptName ?? "";
    if (search && !name.includes(search)) continue;
    items.push({
      conceptId,
      name,
      affectedStudents: new Set(weak.map((row) => row.studentProfileId)).size,
      averageMastery: avg,
      incorrectAnswers: weak.reduce((sum, row) => sum + (row.incorrectAnswers ?? 0), 0),
      explanationRequests: explanations.get(conceptId) ?? 0,
      adaptations: adaptations.get(conceptId) ?? 0,
      materialTitle: meta?.title ?? null,
      recommendedAction: reviewAction(band, weak.length),
      band,
    });
  }
  items.sort((left, right) => right.affectedStudents - left.affectedStudents || (left.averageMastery ?? 0) - (right.averageMastery ?? 0));
  return items;
}

export const teacherDashboardService = {
  async getDashboard(user: AuthUser, range: TeacherRange, materialId?: string): Promise<TeacherDashboardDto> {
    const teacherProfileId = requireTeacher(user);
    const profile = await teacherRepository.findProfile(user.userId);
    if (!profile) throw new ForbiddenError("هذه الصفحة مخصصة للمعلمين.");
    const from = rangeStart(range);
    const roster = await loadRoster(teacherProfileId);
    const scopedSessions = materialId
      ? roster.sessions.filter((item) => item.materialId === materialId)
      : roster.sessions;
    if (materialId && !roster.sessions.some((item) => item.materialId === materialId)) {
      materialId = undefined;
    }
    const materialIds = [...new Set(scopedSessions.map((item) => item.materialId).filter((id): id is string => Boolean(id)))];
    const [concepts, explanationCount, explanations, adaptations] = await Promise.all([
      teacherRepository.listConceptsForMaterials(materialIds),
      teacherRepository.countExplanationRequests(roster.ids, from),
      teacherRepository.explanationByConcept(roster.ids, from),
      teacherRepository.adaptationsByConcept(roster.ids, from),
    ]);

    const uniqueConcepts = new Map<string, { conceptId: string; name: string; importance: number }>();
    for (const item of concepts) {
      const current = uniqueConcepts.get(item.conceptId);
      if (!current || item.importance > current.importance) {
        uniqueConcepts.set(item.conceptId, { conceptId: item.conceptId, name: item.name, importance: item.importance });
      }
    }
    const conceptColumns = [...uniqueConcepts.values()]
      .sort((left, right) => right.importance - left.importance || left.name.localeCompare(right.name, "ar"))
      .slice(0, TEACHER_CONCEPT_COLUMNS)
      .map((item) => ({ conceptId: item.conceptId, name: item.name }));

    const byStudent = masteryByStudent(roster.mastery);
    const latest = latestSessionByStudent(roster.sessions);
    const completedIds = new Set(
      roster.sessions
        .filter((item) => isCompleted(item.sessionStatus, item.completedAt) && (item.completedAt ?? item.startedAt) >= from)
        .map((item) => item.studentProfileId),
    );
    const extraIds = roster.students.filter((student) => studentNeedsExtra(byStudent.get(student.studentProfileId) ?? [])).map((item) => item.studentProfileId);
    const average = classAverage(roster.mastery);
    const reviewPriority = buildReview(roster.mastery, concepts, explanations, adaptations).slice(0, 5);

    const modeCounts = new Map<string, { name: string; count: number }>();
    for (const student of roster.students) {
      const session = latest.get(student.studentProfileId);
      const code = session?.modeCode ?? student.defaultMode ?? "unknown";
      const name = session?.modeName ?? student.defaultModeName ?? code;
      const current = modeCounts.get(code) ?? { name, count: 0 };
      current.count += 1;
      modeCounts.set(code, current);
    }
    const modeEntries = [...modeCounts.entries()].filter(([code]) => code !== "unknown" || modeCounts.size === 1);
    const percents = percentParts(modeEntries.map(([, value]) => value.count));
    const modeDistribution = modeEntries.map(([code, value], index) => ({
      code,
      name: value.name,
      count: value.count,
      percent: percents[index] ?? 0,
    }));

    const students = roster.students.slice(0, TEACHER_DASHBOARD_STUDENT_LIMIT).map((student) => {
      const rows = byStudent.get(student.studentProfileId) ?? [];
      const session = latest.get(student.studentProfileId);
      return {
        studentId: student.studentProfileId,
        name: student.name,
        modeCode: session?.modeCode ?? student.defaultMode,
        modeName: session?.modeName ?? student.defaultModeName,
        lastActivityAt: roster.activity.get(student.studentProfileId)?.toISOString() ?? null,
        cells: conceptColumns.map((column) => {
          const row = rows.find((item) => item.conceptId === column.conceptId);
          const band = bandOf(row);
          return { conceptId: column.conceptId, band: band.band, status: band.status };
        }),
      };
    });

    const latestActivity = [...roster.activity.values()].sort((left, right) => right.getTime() - left.getTime())[0] ?? new Date();
    const scopedMaterial = materialId
      ? scopedSessions.find((item) => item.materialId === materialId)
      : scopedSessions.sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime())[0];
    const topReview = reviewPriority[0] ?? null;
    const dominant = [...modeDistribution].sort((left, right) => right.percent - left.percent)[0] ?? null;

    const dto: TeacherDashboardDto = {
      teacher: { id: teacherProfileId, name: user.displayName },
      classInfo: {
        schoolName: profile.schoolName,
        subject: profile.subject,
        assignedCount: roster.students.length,
      },
      scope: {
        range,
        material: scopedMaterial?.materialId
          ? { id: scopedMaterial.materialId, title: scopedMaterial.title?.trim() || "درس" }
          : null,
      },
      updatedAt: latestActivity.toISOString(),
      overview: {
        assignedStudents: roster.students.length,
        completedStudents: completedIds.size,
        completionLabel: roster.students.length === 0 ? "لا يوجد طلاب مرتبطون بك بعد." : `${completedIds.size} / ${roster.students.length}`,
        averageUnderstanding: average,
        averageUnderstandingLabel: average === null ? "لا توجد بيانات كافية" : `${average}%`,
        needsAdditionalExplanation: extraIds.length,
        explanationRequests: explanationCount,
      },
      conceptColumns,
      students,
      studentTotal: roster.students.length,
      reviewPriority,
      modeDistribution,
      recommendations: recommendTeacher({
        topReview: topReview ? { name: topReview.name, affectedStudents: topReview.affectedStudents } : null,
        explanationRequests: explanationCount,
        assignedStudents: roster.students.length,
        dominantMode: dominant,
      }),
      actions: { review: reviewPriority.length > 0, parentNote: false, parentNoteStatus: "unavailable" },
      empty: {
        students: roster.students.length === 0 ? "لا يوجد طلاب مرتبطون بك بعد." : null,
        lessons: roster.sessions.length === 0 ? "لم يبدأ الطلاب التعلم بعد." : null,
        mastery: average === null ? "لا توجد بيانات فهم كافية بعد." : null,
        review: reviewPriority.length === 0 ? "لا توجد مفاهيم تحتاج مراجعة حاليًا." : null,
      },
    };
    await auditService.record({
      userId: user.userId,
      actionType: "TEACHER_DASHBOARD_VIEWED",
      entityName: "TeacherProfiles",
      entityId: teacherProfileId,
      description: range,
    });
    return dto;
  },

  async listStudents(user: AuthUser, page: number, pageSize: number, search: string | null): Promise<TeacherStudentListDto> {
    const teacherProfileId = requireTeacher(user);
    const roster = await loadRoster(teacherProfileId, search);
    const latest = latestSessionByStudent(roster.sessions);
    const start = (page - 1) * pageSize;
    const slice = roster.students.slice(start, start + pageSize);
    return {
      page,
      pageSize,
      total: roster.students.length,
      students: slice.map((student) => {
        const session = latest.get(student.studentProfileId);
        return {
          studentId: student.studentProfileId,
          name: student.name,
          gradeLevel: student.gradeLevel,
          modeCode: session?.modeCode ?? student.defaultMode,
          modeName: session?.modeName ?? student.defaultModeName,
          lastActivityAt: roster.activity.get(student.studentProfileId)?.toISOString() ?? null,
        };
      }),
    };
  },

  async getStudent(user: AuthUser, studentId: string): Promise<TeacherStudentInsightDto> {
    const teacherProfileId = requireTeacher(user);
    if (!(await teacherRepository.isAssigned(teacherProfileId, studentId))) {
      throw new NotFoundError(TEACHER_NOT_FOUND);
    }
    const roster = await loadRoster(teacherProfileId);
    const student = roster.students.find((item) => item.studentProfileId === studentId);
    if (!student) throw new NotFoundError(TEACHER_NOT_FOUND);
    const mastery = roster.mastery.filter((row) => row.studentProfileId === studentId);
    const sessions = roster.sessions.filter((row) => row.studentProfileId === studentId);
    const latest = latestSessionByStudent(sessions).get(studentId);
    const [answers, interactions, adaptations] = await Promise.all([
      teacherRepository.listRecentAnswers(studentId),
      teacherRepository.listRecentInteractions(studentId),
      teacherRepository.listAdaptations(studentId),
    ]);
    const pulse = computeOverallPulse(mastery.filter((row) => row.attemptsCount > 0));
    const mapped = mastery.map((row) => {
      const band = bandOf(row);
      return {
        conceptId: row.conceptId,
        name: row.conceptName,
        band: band.band,
        score: row.attemptsCount > 0 ? row.masteryScore : null,
        attempts: row.attemptsCount,
        correct: row.correctAnswers,
        incorrect: row.incorrectAnswers,
        explanationCount: row.explanationCount,
      };
    });
    await auditService.record({
      userId: user.userId,
      actionType: "TEACHER_STUDENT_VIEWED",
      entityName: "StudentProfiles",
      entityId: studentId,
      description: teacherProfileId,
    });
    return {
      student: {
        studentId,
        name: student.name,
        gradeLevel: student.gradeLevel,
        modeCode: latest?.modeCode ?? student.defaultMode,
        modeName: latest?.modeName ?? student.defaultModeName,
      },
      pulse: pulse ? { score: pulse.score, status: pulse.status } : null,
      progress: {
        sessionCount: sessions.length,
        completedSessions: sessions.filter((item) => isCompleted(item.sessionStatus, item.completedAt)).length,
        lastActivityAt: roster.activity.get(studentId)?.toISOString() ?? null,
      },
      mastery: mapped,
      weakConcepts: mapped.filter((item) => item.band === "يحتاج مراجعة" || item.band === "شرح إضافي").map((item) => ({
        conceptId: item.conceptId,
        name: item.name,
        band: item.band,
      })),
      strongConcepts: mapped.filter((item) => item.band === "مفهوم" || item.band === "فهم جيد").map((item) => ({
        conceptId: item.conceptId,
        name: item.name,
        band: item.band,
      })),
      recentAnswers: answers.map((item) => ({
        answeredAt: item.answeredAt.toISOString(),
        isCorrect: item.isCorrect,
        conceptName: item.conceptName,
      })),
      recentInteractions: interactions.map((item) => ({
        type: item.type,
        createdAt: item.createdAt.toISOString(),
        conceptName: item.conceptName,
      })),
      adaptations: adaptations.map((item) => ({
        reason: item.reason,
        createdAt: item.createdAt.toISOString(),
        conceptName: item.conceptName,
      })),
    };
  },

  async listConcepts(user: AuthUser, range: TeacherRange, materialId?: string, search?: string | null): Promise<TeacherReviewDto> {
    const teacherProfileId = requireTeacher(user);
    const from = rangeStart(range);
    const roster = await loadRoster(teacherProfileId);
    const sessions = materialId ? roster.sessions.filter((item) => item.materialId === materialId) : roster.sessions;
    const materialIds = [...new Set(sessions.map((item) => item.materialId).filter((id): id is string => Boolean(id)))];
    const [concepts, explanations, adaptations] = await Promise.all([
      teacherRepository.listConceptsForMaterials(materialIds),
      teacherRepository.explanationByConcept(roster.ids, from),
      teacherRepository.adaptationsByConcept(roster.ids, from),
    ]);
    const items = buildReview(roster.mastery, concepts, explanations, adaptations, search);
    await auditService.record({
      userId: user.userId,
      actionType: "TEACHER_CONCEPT_VIEWED",
      entityName: "TeacherProfiles",
      entityId: teacherProfileId,
      description: String(items.length),
    });
    return { concepts: items, emptyMessage: items.length === 0 ? "لا توجد مفاهيم تحتاج مراجعة حاليًا." : null };
  },

  async getReview(user: AuthUser, range: TeacherRange): Promise<TeacherReviewDto> {
    const data = await this.listConcepts(user, range);
    await auditService.record({
      userId: user.userId,
      actionType: "TEACHER_REVIEW_OPENED",
      entityName: "TeacherProfiles",
      entityId: user.teacherProfileId,
      description: range,
    });
    return data;
  },

  async listLessons(user: AuthUser): Promise<TeacherLessonListDto> {
    const teacherProfileId = requireTeacher(user);
    const roster = await loadRoster(teacherProfileId);
    const byMaterial = new Map<string, { title: string; students: Set<string>; last: Date | null }>();
    for (const session of roster.sessions) {
      if (!session.materialId) continue;
      const current = byMaterial.get(session.materialId) ?? {
        title: session.title?.trim() || "درس",
        students: new Set<string>(),
        last: null,
      };
      current.students.add(session.studentProfileId);
      if (!current.last || session.startedAt > current.last) current.last = session.startedAt;
      byMaterial.set(session.materialId, current);
    }
    return {
      lessons: [...byMaterial.entries()].map(([materialId, item]) => ({
        materialId,
        title: item.title,
        studentCount: item.students.size,
        lastActivityAt: item.last?.toISOString() ?? null,
      })),
    };
  },
};
