import { z } from "zod";
import { ASSESSMENT_ACTIONS } from "../config/assessment.js";

export const assessmentActionBodySchema = z.object({
  action: z.enum(ASSESSMENT_ACTIONS),
});
