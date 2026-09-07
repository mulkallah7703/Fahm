import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "../config/limits.js";
import { signAuthToken } from "../middleware/auth.js";
import { userRepository } from "../repositories/userRepository.js";
import type { AuthUser } from "../types/index.js";
import { AppError, UnauthorizedError, ValidationError } from "../utils/errors.js";
import { auditService } from "./auditService.js";

export const authService = {
  async register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string | null;
    gradeLevel: string | null;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<{ user: AuthUser; token: string }> {
    const email = input.email.trim().toLowerCase();
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError("EMAIL_TAKEN", "هذا البريد مسجّل مسبقاً.", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const displayName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();

    const user = await userRepository.createStudent({
      email,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName,
      displayName,
      gradeLevel: input.gradeLevel,
    });

    await auditService.record({
      userId: user.userId,
      actionType: "auth.register",
      entityName: "Users",
      entityId: user.userId,
      description: "student_registered",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return { user, token: signAuthToken(user) };
  },

  async login(input: {
    email: string;
    password: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<{ user: AuthUser; token: string }> {
    const email = input.email.trim().toLowerCase();
    const found = await userRepository.findByEmail(email);
    if (!found || !found.isActive || !found.passwordHash) {
      throw new UnauthorizedError("البريد أو كلمة المرور غير صحيحة.");
    }

    const matches = await bcrypt.compare(input.password, found.passwordHash);
    if (!matches) {
      throw new UnauthorizedError("البريد أو كلمة المرور غير صحيحة.");
    }

    const user = await userRepository.findAuthUser(found.userId);
    if (!user) {
      throw new UnauthorizedError("البريد أو كلمة المرور غير صحيحة.");
    }

    await userRepository.markLogin(user.userId);
    await auditService.record({
      userId: user.userId,
      actionType: "auth.login",
      entityName: "Users",
      entityId: user.userId,
      description: "student_login",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return { user, token: signAuthToken(user) };
  },

  toPublic(user: AuthUser) {
    return {
      id: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      role: user.roleName,
      studentProfileId: user.studentProfileId,
    };
  },
};

export function assertPasswordStrength(password: string): void {
  if (password.length < 8) {
    throw new ValidationError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
  }
}
