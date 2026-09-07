import { z } from "zod";
import { ADAPTIVE_ACTIONS } from "../config/adaptive.js";

export const adaptiveActionBodySchema = z.object({
  action: z.enum(ADAPTIVE_ACTIONS),
});
