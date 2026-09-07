import type { NextFunction, Request, Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";
import { userRepository } from "../repositories/userRepository.js";
import type { AuthUser, JwtPayload } from "../types/index.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

function readToken(req: Request): string | null {
  const cookie = req.cookies?.[env.cookie.name];
  if (typeof cookie === "string" && cookie.length > 0) return cookie;
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = readToken(req);
    if (!token) throw new UnauthorizedError();

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.jwt.secret) as JwtPayload;
    } catch {
      throw new UnauthorizedError("انتهت الجلسة. سجّل الدخول مرة أخرى.");
    }

    const user = await userRepository.findAuthUser(payload.sub);
    if (!user || !userIsActive(user)) {
      throw new UnauthorizedError();
    }

    req.authUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

function userIsActive(user: AuthUser): boolean {
  return Boolean(user.userId);
}

export function requireTeacher(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const user = req.authUser;
  if (!user) {
    next(new UnauthorizedError());
    return;
  }
  if (user.roleName !== "teacher" || !user.teacherProfileId) {
    next(new ForbiddenError("هذه الصفحة مخصصة للمعلمين."));
    return;
  }
  next();
}

export function requireStudent(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const user = req.authUser;
  if (!user) {
    next(new UnauthorizedError());
    return;
  }
  if (user.roleName !== "student" || !user.studentProfileId) {
    next(new ForbiddenError("هذه الصفحة مخصصة للطلاب."));
    return;
  }
  next();
}

export function signAuthToken(user: AuthUser): string {
  const payload: JwtPayload = {
    sub: user.userId,
    roleId: user.roleId,
    studentProfileId: user.studentProfileId,
  };
  const options: SignOptions = {
    expiresIn: env.jwt.expiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.jwt.secret, options);
}
