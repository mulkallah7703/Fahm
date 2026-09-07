import { ASK_AI_HISTORY_LIMIT, type AskFahmAction } from "../../config/askFahm.js";
import { INTERACTION_TYPES, MODE_PRESENTATION } from "../../config/learningModes.js";
import { ASK_MAX_LENGTH } from "../../config/teaching.js";
import { env } from "../../config/env.js";
import { chatRepository } from "../../repositories/chatRepository.js";
import { interactionRepository } from "../../repositories/interactionRepository.js";
import { masteryRepository } from "../../repositories/masteryRepository.js";
import { sessionRepository } from "../../repositories/sessionRepository.js";
import type { AuthUser } from "../../types/index.js";
import type { AskFahmExperience, AskFahmMessage } from "../../types/askFahm.js";
import type { LessonState } from "../../types/teaching.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import { auditService } from "../auditService.js";
import { analysisService } from "../analysis/analysisService.js";
import { aiService } from "../ai/aiService.js";
import { buildAskContext } from "./askContextService.js";
import {
  ASK_SYSTEM_PROMPT,
  askAiSchema,
  buildSuggestions,
  detectAskIntent,
  deterministicAsk,
  personalizeAnswer,
  sourceLabel,
  validateAskAi,
  type AskAiPayload,
} from "./askGroundingService.js";
import { normalizeArabic } from "./arabicNormalize.js";

function requireStudent(user: AuthUser): string {
  if (!user.studentProfileId) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
  return user.studentProfileId;
}

async function loadOwned(user: AuthUser, sessionId: string) {
  const ctx = await sessionRepository.findOwnedLesson(sessionId, requireStudent(user));
  if (!ctx) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
  return ctx;
}

async function loadState(sessionId: string): Promise<LessonState | null> {
  const row = await interactionRepository.latestByType(sessionId, INTERACTION_TYPES.lessonState);
  if (!row?.interactionData) return null;
  return row.interactionData as unknown as LessonState;
}

function withSource(answer: string, label: string | null): string {
  if (!label || answer.includes("المصدر:")) return answer;
  return `${answer}\n\n${label}`;
}

function parseStored(text: string): { body: string; sourceLabel: string | null } {
  const match = text.match(/\n\nالمصدر: (.+)$/);
  if (!match) return { body: text, sourceLabel: null };
  return { body: text.slice(0, match.index).trim(), sourceLabel: `المصدر: ${match[1]}` };
}

function toMessages(rows: Awaited<ReturnType<typeof chatRepository.listMessages>>): AskFahmMessage[] {
  return rows.map((row) => {
    const parsed = parseStored(row.messageText);
    return {
      id: row.messageId,
      role: row.senderType,
      text: parsed.body,
      createdAt: new Date(row.createdAt).toISOString(),
      sourceLabel: row.senderType === "fahm" ? parsed.sourceLabel : null,
    };
  });
}

export const askFahmService = {
  async getExperience(user: AuthUser, sessionId: string): Promise<AskFahmExperience> {
    const packed = await loadPack(user, sessionId, null);
    return toExperience(packed, null, null);
  },

  async sendMessage(
    user: AuthUser,
    sessionId: string,
    message: string,
    conceptId?: string,
    force = false,
  ): Promise<AskFahmExperience> {
    const text = message.trim();
    if (!text || text.length > ASK_MAX_LENGTH) {
      throw new ValidationError("السؤال غير صالح.");
    }
    const started = Date.now();
    const packed = await loadPack(user, sessionId, text);
    const lastStudent = [...packed.messages].reverse().find((item) => item.senderType === "student");
    const intent = detectAskIntent(text);
    if (!force && lastStudent && normalizeArabic(lastStudent.messageText) === normalizeArabic(text)) {
      const navigateTo = intent === "test_me" ? `/lesson/${sessionId}` : intent === "map" ? "/map" : null;
      return toExperience(packed, packed.lastAnswer, navigateTo);
    }

    const focused = conceptId
      ? packed.context.concepts.find((item) => item.id === conceptId) ?? null
      : null;
    const question = focused ? `${text} (${focused.name})` : text;
    const fallback = deterministicAsk(question, packed.context);
    let payload = fallback;
    let provider = "deterministic";
    let usedFallback = true;

    const shouldAi =
      aiService.isEnabled() &&
      intent === "question" &&
      fallback.grounding === "unavailable" &&
      (packed.context.pageText.trim().length > 0 || packed.context.concepts.length > 0);

    if (shouldAi) {
      const history = packed.messages
        .slice(-ASK_AI_HISTORY_LIMIT)
        .map((item) => `${item.senderType}: ${parseStored(item.messageText).body}`)
        .join("\n");
      const ai = await aiService.completeStructured({
        schema: askAiSchema,
        model: env.openai.textModel,
        system: ASK_SYSTEM_PROMPT,
        user: `Student question: ${question}\nMode: ${packed.context.teachingState.mode}\nVariant: ${packed.context.teachingState.variant ?? ""}\n\nRecent chat:\n${history}\n\n<LESSON_DATA>\n${JSON.stringify({
          lesson: packed.context.lesson,
          sourceText: packed.context.sourceText,
          concepts: packed.context.concepts.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
          })),
          visual: packed.context.visualContext,
          table: packed.context.tableContext,
          learner: packed.context.learnerContext,
        })}\n</LESSON_DATA>`,
      });
      if (ai) {
        payload = validateAskAi(ai, packed.context, fallback);
        provider = "openai";
        usedFallback = payload === fallback;
      }
    }

    payload = {
      ...payload,
      answer: personalizeAnswer(payload.answer, packed.context.teachingState.mode, packed.context.teachingState.variant),
    };
    const label = sourceLabel(payload.grounding, packed.context.lesson.pageNumber, payload.sourceRefs);
    const stored = withSource(payload.answer, label);

    await chatRepository.addMessage({
      conversationId: packed.conversationId,
      senderType: "student",
      messageText: text,
      aiModel: null,
    });
    await chatRepository.addMessage({
      conversationId: packed.conversationId,
      senderType: "fahm",
      messageText: stored,
      aiModel: provider,
    });
    await interactionRepository.insert({
      sessionId,
      studentProfileId: packed.studentProfileId,
      interactionType: INTERACTION_TYPES.askFahm,
      conceptId: focused?.id ?? payload.sourceRefs.find((item) => item.conceptId)?.conceptId ?? null,
      interactionData: { asked: true, grounding: payload.grounding, provider },
    });
    await auditService.record({
      userId: user.userId,
      actionType: "ASK_FAHM_MESSAGE",
      entityName: "ChatConversations",
      entityId: packed.conversationId,
      description: payload.grounding,
    });
    logger.info("ask_fahm_completed", {
      durationMs: Date.now() - started,
      provider,
      fallback: usedFallback,
      grounding: payload.grounding,
    });

    const refreshed = await loadPack(user, sessionId, null);
    const navigateTo = intent === "test_me" ? `/lesson/${sessionId}` : intent === "map" ? "/map" : null;
    return toExperience(refreshed, payload, navigateTo);
  },

  async performAction(user: AuthUser, sessionId: string, action: AskFahmAction): Promise<AskFahmExperience> {
    if (action === "listen") {
      const packed = await loadPack(user, sessionId, null);
      return toExperience(packed, packed.lastAnswer, null);
    }
    if (action === "test_me") {
      return this.sendMessage(user, sessionId, "اختبرني", undefined, true);
    }
    if (action === "show_map") {
      return this.sendMessage(user, sessionId, "شاهد الخريطة", undefined, true);
    }
    if (action === "simplify") {
      const { lessonService } = await import("./lessonService.js");
      await lessonService.simplify(user, sessionId);
      return this.sendMessage(user, sessionId, "اشرح بطريقة أبسط", undefined, true);
    }
    if (action === "example") {
      const { lessonService } = await import("./lessonService.js");
      await lessonService.example(user, sessionId);
      return this.sendMessage(user, sessionId, "أعطني مثالًا", undefined, true);
    }
    throw new ValidationError("الإجراء غير صالح.");
  },
};

async function loadPack(user: AuthUser, sessionId: string, question: string | null) {
  const ctx = await loadOwned(user, sessionId);
  const analysis = await analysisService.getAnalysis(user, ctx.materialId);
  const state = await loadState(sessionId);
  const mastery = await masteryRepository.listForStudent(ctx.studentProfileId);
  const context = buildAskContext({ analysis, state, mastery, question });
  let conversationId = await chatRepository.latestConversationId(sessionId, ctx.studentProfileId);
  if (!conversationId) {
    conversationId = await chatRepository.createConversation({
      studentProfileId: ctx.studentProfileId,
      sessionId,
      title: context.lesson.title || "اسأل فَهْم",
    });
  }
  const messages = await chatRepository.listMessages(conversationId);
  const chats = await chatRepository.listRecentForStudent(ctx.studentProfileId);
  const recent = await sessionRepository.listRecent(ctx.studentProfileId);
  const conversations = uniqueSessions([
    { sessionId, title: context.lesson.title },
    ...chats,
    ...recent.map((item) => ({ sessionId: item.sessionId, title: item.title })),
  ]).map((item) => ({
    sessionId: item.sessionId,
    title: item.title,
    current: item.sessionId.toLowerCase() === sessionId.toLowerCase(),
  }));
  const lastFahm = [...messages].reverse().find((item) => item.senderType === "fahm");
  const parsed = lastFahm ? parseStored(lastFahm.messageText) : null;
  return {
    ctx,
    studentProfileId: ctx.studentProfileId,
    analysis,
    state,
    context,
    conversationId,
    messages,
    conversations,
    lastAnswer: parsed
      ? ({
          answer: parsed.body,
          grounding: lastFahm?.aiModel?.includes("openai") ? "mixed" : "lesson_context",
          confidence: "medium",
          sourceRefs: [],
          followUp: null,
        } satisfies AskAiPayload)
      : null,
  };
}

function uniqueSessions(items: Array<{ sessionId: string; title: string }>) {
  const seen = new Set<string>();
  const next: Array<{ sessionId: string; title: string }> = [];
  for (const item of items) {
    const key = item.sessionId.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }
  return next.slice(0, 12);
}

function toExperience(
  packed: Awaited<ReturnType<typeof loadPack>>,
  answer: AskAiPayload | null,
  navigateTo: string | null,
): AskFahmExperience {
  const messages = toMessages(packed.messages);
  const last = answer ?? packed.lastAnswer;
  const label = last
    ? sourceLabel(last.grounding, packed.context.lesson.pageNumber, last.sourceRefs)
    : messages.filter((item) => item.role === "fahm").at(-1)?.sourceLabel ?? null;
  const capabilities = {
    listen: true,
    simplify: Boolean(packed.context.teachingState.simplified || packed.context.concepts.length),
    example: Boolean(packed.context.teachingState.example || packed.context.concepts.length),
    testMe: packed.context.concepts.length > 0,
    showMap: packed.context.concepts.length > 0,
  };
  const actions: AskLastAnswerActions = ["listen"];
  if (capabilities.simplify) actions.push("simplify");
  if (capabilities.example) actions.push("example");
  if (capabilities.testMe) actions.push("test_me");
  if (capabilities.showMap) actions.push("show_map");
  return {
    session: {
      id: packed.ctx.sessionId,
      materialId: packed.ctx.materialId,
      title: packed.context.lesson.title,
      pageNumber: packed.context.lesson.pageNumber,
      hasFile: Boolean(packed.ctx.fileUrl || packed.ctx.imageUrl),
      modeCode: packed.context.teachingState.mode,
      modeName: packed.analysis.session.modeName ?? MODE_PRESENTATION[packed.context.teachingState.mode].name,
      variant: packed.context.teachingState.variant,
    },
    conversation: {
      id: packed.conversationId,
      title: packed.context.lesson.title,
      messages,
    },
    conversations: packed.conversations,
    context: {
      title: packed.context.lesson.title,
      pageNumber: packed.context.lesson.pageNumber,
      hasFile: Boolean(packed.ctx.fileUrl || packed.ctx.imageUrl),
      materialId: packed.ctx.materialId,
      concepts: packed.context.concepts.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
      })),
      visualAvailable: packed.context.visualContext.available,
      tableAvailable: packed.context.tableContext.available,
      previousQuestions: messages.filter((item) => item.role === "student").slice(-4).map((item) => item.text),
    },
    suggestions: buildSuggestions(packed.context),
    capabilities,
    lastAnswer: last
      ? {
          grounding: last.grounding,
          confidence: last.confidence,
          sourceLabel: label,
          followUp: last.followUp,
          actions,
        }
      : null,
    reply: last?.answer ?? messages.filter((item) => item.role === "fahm").at(-1)?.text ?? null,
    navigateTo,
  };
}

type AskLastAnswerActions = NonNullable<AskFahmExperience["lastAnswer"]>["actions"];
