export const ASK_FAHM_ACTIONS = ["simplify", "example", "listen", "test_me", "show_map"] as const;
export type AskFahmAction = (typeof ASK_FAHM_ACTIONS)[number];

export const ASK_HISTORY_LIMIT = 40;
export const ASK_AI_HISTORY_LIMIT = 8;
export const ASK_CONVERSATION_LIMIT = 12;
