import type { KnowledgeMapAction } from "../../config/knowledgeMap.js";

export function mapActionNavigation(
  action: KnowledgeMapAction,
  sessionId: string,
  conceptId?: string,
): { navigateTo: string | null; preferredView: "review" | null } {
  if (action === "explain") return { navigateTo: `/lesson/${sessionId}`, preferredView: null };
  if (action === "ask" && conceptId) {
    return {
      navigateTo: `/lesson/${sessionId}/ask?conceptId=${encodeURIComponent(conceptId)}`,
      preferredView: null,
    };
  }
  if (action === "test") return { navigateTo: `/lesson/${sessionId}`, preferredView: null };
  if (action === "review") return { navigateTo: null, preferredView: "review" };
  return { navigateTo: null, preferredView: null };
}
