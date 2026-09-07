import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("أدخل بريداً إلكترونياً صالحاً."),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل."),
  firstName: z.string().trim().min(1, "الاسم الأول مطلوب.").max(100),
  lastName: z.string().trim().max(100).optional().nullable(),
  gradeLevel: z.string().trim().max(100).optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("أدخل بريداً إلكترونياً صالحاً."),
  password: z.string().min(1, "أدخل كلمة المرور."),
});
