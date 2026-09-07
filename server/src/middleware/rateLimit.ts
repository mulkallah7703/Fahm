import rateLimit from "express-rate-limit";

function arabicMessage(message: string) {
  return {
    success: false,
    error: { code: "RATE_LIMITED", message },
  };
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: arabicMessage("محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى."),
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: arabicMessage("تجاوزت حد الرفع المسموح. حاول بعد قليل."),
});

export const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: arabicMessage("تجاوزت حد طلبات التحليل. حاول بعد قليل."),
});

export const lessonLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: arabicMessage("تجاوزت حد طلبات الدرس. حاول بعد قليل."),
});

export const learningLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: arabicMessage("تجاوزت حد طلبات اختيار طريقة الشرح. حاول بعد قليل."),
});

export const ttsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: arabicMessage("تجاوزت حد توليد الصوت. حاول بعد قليل."),
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: arabicMessage("طلبات كثيرة. حاول مرة أخرى بعد لحظات."),
});
