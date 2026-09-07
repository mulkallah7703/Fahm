export const KNOWLEDGE_MAP_ACTIONS = ["select", "explain", "ask", "test", "review"] as const;

export type KnowledgeMapAction = (typeof KNOWLEDGE_MAP_ACTIONS)[number];

export const FOCUS_VISIBLE_MAX = 5;

export const MAP_NOT_FOUND = "لم يتم العثور على الخريطة.";
