import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { authService } from "../services/authService.js";
import { ValidationError } from "../utils/errors.js";
import { clientIp } from "../utils/sanitize.js";
import { loginSchema, registerSchema } from "../validators/authValidators.js";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.cookie.secure || env.isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function parse<T>(schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } }, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? "بيانات غير صالحة.");
  }
  return result.data;
}

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const body = parse(registerSchema, req.body);
    const { user, token } = await authService.register({
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName ?? null,
      gradeLevel: body.gradeLevel ?? null,
      ipAddress: clientIp(req),
      userAgent: req.header("user-agent") ?? null,
    });
    res.cookie(env.cookie.name, token, cookieOptions());
    res.status(201).json({
      success: true,
      data: { user: authService.toPublic(user) },
    });
  },

  async login(req: Request, res: Response): Promise<void> {
    const body = parse(loginSchema, req.body);
    const { user, token } = await authService.login({
      email: body.email,
      password: body.password,
      ipAddress: clientIp(req),
      userAgent: req.header("user-agent") ?? null,
    });
    res.cookie(env.cookie.name, token, cookieOptions());
    res.json({
      success: true,
      data: { user: authService.toPublic(user) },
    });
  },

  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie(env.cookie.name, { path: "/" });
    res.json({ success: true, data: { loggedOut: true } });
  },

  async me(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: { user: authService.toPublic(req.authUser!) },
    });
  },
};
