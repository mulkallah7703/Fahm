import { INTERACTION_TYPES } from "../../config/learningModes.js";
import { MAP_NOT_FOUND, type KnowledgeMapAction } from "../../config/knowledgeMap.js";
import { accessibilityRepository } from "../../repositories/accessibilityRepository.js";
import { adaptationRepository } from "../../repositories/adaptationRepository.js";
import { conceptRepository } from "../../repositories/conceptRepository.js";
import { interactionRepository } from "../../repositories/interactionRepository.js";
import { masteryRepository } from "../../repositories/masteryRepository.js";
import { sessionRepository } from "../../repositories/sessionRepository.js";
import type { AuthUser } from "../../types/index.js";
import type { KnowledgeMapConceptDetail, KnowledgeMapDto } from "../../types/knowledgeMap.js";
import type { LessonState } from "../../types/teaching.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { auditService } from "../auditService.js";
import { assessmentSessionService } from "../teaching/assessmentSessionService.js";
import { lessonService } from "../teaching/lessonService.js";
import { mapActionNavigation } from "./mapActions.js";
import { buildKnowledgeMap } from "./mapGraph.js";

function requireStudent(user: AuthUser): string {
  if (!user.studentProfileId) throw new NotFoundError(MAP_NOT_FOUND);
  return user.studentProfileId;
}

async function loadOwned(user: AuthUser, sessionId: string) {
  const ctx = await sessionRepository.findOwnedLesson(sessionId, requireStudent(user));
  if (!ctx) throw new NotFoundError(MAP_NOT_FOUND);
  return ctx;
}

async function loadState(sessionId: string): Promise<LessonState | null> {
  const row = await interactionRepository.latestByType(sessionId, INTERACTION_TYPES.lessonState);
  if (!row?.interactionData) return null;
  return row.interactionData as unknown as LessonState;
}

function currentConceptId(state: LessonState | null): string | null {
  return state?.steps[state.currentStepIndex]?.conceptId ?? null;
}

async function presentationFor(
  studentProfileId: string,
  modeCode: string | null,
): Promise<KnowledgeMapDto["presentation"]> {
  const prefs = await accessibilityRepository.findForStudent(studentProfileId);
  return {
    blind: modeCode === "blind" || Boolean(prefs?.blindSupport),
    dyslexia: modeCode === "dyslexia" || Boolean(prefs?.dyslexiaSupport),
    focus: modeCode === "focus" || Boolean(prefs?.focusSupport),
    simplified: false,
    fontSize: prefs?.fontSize ?? null,
    lineSpacing: prefs?.lineSpacing ?? null,
  };
}

async function buildSessionMap(
  user: AuthUser,
  sessionId: string,
  selectedConceptId?: string | null,
): Promise<KnowledgeMapDto> {
  const ctx = await loadOwned(user, sessionId);
  const [concepts, mastery, state, adaptedIds] = await Promise.all([
    conceptRepository.listForPage(ctx.pageId),
    masteryRepository.listForStudent(ctx.studentProfileId),
    loadState(sessionId),
    adaptationRepository.listAdaptedConceptIds(sessionId, ctx.studentProfileId),
  ]);
  const relationships = await conceptRepository.listRelationshipDetails(concepts.map((item) => item.conceptId));
  return buildKnowledgeMap({
    scope: {
      type: "session",
      sessionId: ctx.sessionId,
      materialId: ctx.materialId,
      title: ctx.title?.trim() || "درس",
      pageNumber: ctx.pageNumber,
      modeCode: ctx.modeCode,
    },
    presentation: await presentationFor(ctx.studentProfileId, ctx.modeCode),
    concepts: concepts.map((item) => ({
      conceptId: item.conceptId,
      name: item.name,
      description: item.description,
      importance: item.importanceScore,
      sessionId: ctx.sessionId,
      group: ctx.title?.trim() || "درس",
    })),
    relationships,
    mastery,
    adaptedIds: new Set(adaptedIds),
    currentConceptId: currentConceptId(state),
    selectedConceptId: selectedConceptId ?? null,
  });
}

function requireOnMap(map: KnowledgeMapDto, conceptId: string): void {
  if (!map.details.some((item) => item.conceptId === conceptId)) {
    throw new NotFoundError(MAP_NOT_FOUND);
  }
}

export const knowledgeMapService = {
  async getSessionMap(user: AuthUser, sessionId: string, selectedConceptId?: string | null): Promise<KnowledgeMapDto> {
    const map = await buildSessionMap(user, sessionId, selectedConceptId);
    await auditService.record({
      userId: user.userId,
      actionType: "KNOWLEDGE_MAP_VIEWED",
      entityName: "LearningSessions",
      entityId: sessionId,
      description: String(map.stats.conceptCount),
    });
    return map;
  },

  async getStudentMap(user: AuthUser, selectedConceptId?: string | null): Promise<KnowledgeMapDto> {
    const studentProfileId = requireStudent(user);
    const [concepts, mastery] = await Promise.all([
      conceptRepository.listForStudent(studentProfileId),
      masteryRepository.listForStudent(studentProfileId),
    ]);
    const relationships = await conceptRepository.listRelationshipDetails(concepts.map((item) => item.conceptId));
    const titles = [...new Set(concepts.map((item) => item.title.trim()).filter(Boolean))];
    const map = buildKnowledgeMap({
      scope: {
        type: "student",
        sessionId: concepts.find((item) => item.sessionId)?.sessionId ?? null,
        materialId: concepts[0]?.materialId ?? null,
        title: titles.length === 1 ? titles[0] ?? "خريطة المعرفة" : titles.length > 1 ? "موادك التعليمية" : "خريطة المعرفة",
        pageNumber: null,
        modeCode: null,
      },
      presentation: await presentationFor(studentProfileId, null),
      concepts: concepts.map((item) => ({
        conceptId: item.conceptId,
        name: item.name,
        description: item.description,
        importance: item.importanceScore,
        sessionId: item.sessionId,
        group: item.title,
      })),
      relationships,
      mastery,
      adaptedIds: new Set(),
      currentConceptId: null,
      selectedConceptId: selectedConceptId ?? null,
    });
    await auditService.record({
      userId: user.userId,
      actionType: "KNOWLEDGE_MAP_VIEWED",
      entityName: "StudentProfiles",
      entityId: studentProfileId,
      description: String(map.stats.conceptCount),
    });
    return map;
  },

  async getConcept(user: AuthUser, sessionId: string, conceptId: string): Promise<KnowledgeMapConceptDetail> {
    const map = await buildSessionMap(user, sessionId, conceptId);
    const detail = map.details.find((item) => item.conceptId === conceptId);
    if (!detail) throw new NotFoundError(MAP_NOT_FOUND);
    return detail;
  },

  async performAction(
    user: AuthUser,
    sessionId: string,
    action: KnowledgeMapAction,
    conceptId?: string,
  ): Promise<KnowledgeMapDto> {
    const needsConcept = action === "select" || action === "explain" || action === "ask" || action === "test";
    if (needsConcept && !conceptId) throw new ValidationError("معرف المفهوم غير صالح.");

    const map = await buildSessionMap(user, sessionId, conceptId ?? null);
    if (conceptId) requireOnMap(map, conceptId);

    if (action === "select" && conceptId) {
      await auditService.record({
        userId: user.userId,
        actionType: "CONCEPT_SELECTED",
        entityName: "KnowledgeConcepts",
        entityId: conceptId,
        description: sessionId,
      });
      return { ...map, selectedConceptId: conceptId, navigateTo: null };
    }

    if (action === "review") {
      await auditService.record({
        userId: user.userId,
        actionType: "MAP_REVIEW_STARTED",
        entityName: "LearningSessions",
        entityId: sessionId,
        description: String(map.stats.reviewCount + map.stats.extraCount),
      });
      return { ...map, ...mapActionNavigation(action, sessionId, conceptId) };
    }

    if (action === "explain" && conceptId) {
      await lessonService.focusConcept(user, sessionId, conceptId);
      await auditService.record({
        userId: user.userId,
        actionType: "CONCEPT_EXPLANATION_OPENED",
        entityName: "LearningSessions",
        entityId: sessionId,
        description: conceptId,
      });
      return { ...map, selectedConceptId: conceptId, ...mapActionNavigation(action, sessionId, conceptId) };
    }

    if (action === "ask" && conceptId) {
      return { ...map, selectedConceptId: conceptId, ...mapActionNavigation(action, sessionId, conceptId) };
    }

    if (action === "test") {
      await assessmentSessionService.performAction(user, sessionId, "start");
      return {
        ...map,
        selectedConceptId: conceptId ?? map.selectedConceptId,
        ...mapActionNavigation(action, sessionId, conceptId),
      };
    }

    throw new ValidationError("الإجراء غير صالح.");
  },
};
