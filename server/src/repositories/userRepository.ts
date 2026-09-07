import sql from "mssql";
import { getPool, withTransaction } from "../config/database.js";
import { ROLE_STUDENT } from "../config/learningPulse.js";
import type { AuthUser, RoleName, StudentRecord } from "../types/index.js";

function roleName(roleId: number): RoleName {
  if (roleId === 2) return "teacher";
  if (roleId === 3) return "admin";
  return "student";
}

function displayName(first: string, last: string | null, stored: string | null): string {
  if (stored && stored.trim().length > 0) return stored.trim();
  return [first, last].filter(Boolean).join(" ").trim();
}

export const userRepository = {
  async findAuthUser(userId: string): Promise<AuthUser | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("userId", sql.UniqueIdentifier, userId)
      .query<{
        UserId: string;
        RoleId: number;
        Email: string;
        FirstName: string;
        LastName: string | null;
        DisplayName: string | null;
        IsActive: boolean;
        StudentProfileId: string | null;
        TeacherProfileId: string | null;
      }>(`
        SELECT TOP 1
          u.UserId,
          u.RoleId,
          u.Email,
          u.FirstName,
          u.LastName,
          u.DisplayName,
          u.IsActive,
          sp.StudentProfileId,
          tp.TeacherProfileId
        FROM fahm.Users u
        LEFT JOIN fahm.StudentProfiles sp ON sp.UserId = u.UserId
        LEFT JOIN fahm.TeacherProfiles tp ON tp.UserId = u.UserId
        WHERE u.UserId = @userId
      `);

    const row = result.recordset[0];
    if (!row || !row.IsActive) return null;
    return {
      userId: String(row.UserId),
      roleId: row.RoleId,
      roleName: roleName(row.RoleId),
      email: row.Email,
      firstName: row.FirstName,
      lastName: row.LastName,
      displayName: displayName(row.FirstName, row.LastName, row.DisplayName),
      studentProfileId: row.StudentProfileId ? String(row.StudentProfileId) : null,
      teacherProfileId: row.TeacherProfileId ? String(row.TeacherProfileId) : null,
    };
  },

  async findByEmail(email: string): Promise<{
    userId: string;
    passwordHash: string | null;
    isActive: boolean;
  } | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("email", sql.NVarChar(320), email)
      .query<{ UserId: string; PasswordHash: string | null; IsActive: boolean }>(`
        SELECT TOP 1 UserId, PasswordHash, IsActive
        FROM fahm.Users
        WHERE Email = @email
      `);
    const row = result.recordset[0];
    if (!row) return null;
    return {
      userId: String(row.UserId),
      passwordHash: row.PasswordHash,
      isActive: row.IsActive,
    };
  },

  async createStudent(input: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string | null;
    displayName: string;
    gradeLevel: string | null;
  }): Promise<AuthUser> {
    return withTransaction(async (_tx, request) => {
      const userResult = await request()
        .input("roleId", sql.Int, ROLE_STUDENT)
        .input("email", sql.NVarChar(320), input.email)
        .input("passwordHash", sql.NVarChar(500), input.passwordHash)
        .input("firstName", sql.NVarChar(100), input.firstName)
        .input("lastName", sql.NVarChar(100), input.lastName)
        .input("displayName", sql.NVarChar(200), input.displayName)
        .query<{ UserId: string }>(`
          INSERT INTO fahm.Users
            (RoleId, Email, PasswordHash, FirstName, LastName, DisplayName, PreferredLanguage)
          OUTPUT INSERTED.UserId
          VALUES (@roleId, @email, @passwordHash, @firstName, @lastName, @displayName, N'ar')
        `);

      const userId = String(userResult.recordset[0].UserId);

      const profileResult = await request()
        .input("userId", sql.UniqueIdentifier, userId)
        .input("gradeLevel", sql.NVarChar(100), input.gradeLevel)
        .query<{ StudentProfileId: string }>(`
          INSERT INTO fahm.StudentProfiles
            (UserId, GradeLevel, DefaultLearningMode, AIAdaptationEnabled)
          OUTPUT INSERTED.StudentProfileId
          VALUES (@userId, @gradeLevel, N'adaptive', 1)
        `);

      const studentProfileId = String(profileResult.recordset[0].StudentProfileId);

      await request()
        .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
        .query(`
          INSERT INTO fahm.AccessibilityPreferences (StudentProfileId)
          VALUES (@studentProfileId)
        `);

      return {
        userId,
        roleId: ROLE_STUDENT,
        roleName: "student",
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        displayName: input.displayName,
        studentProfileId,
        teacherProfileId: null,
      };
    });
  },

  async markLogin(userId: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("userId", sql.UniqueIdentifier, userId)
      .query(`
        UPDATE fahm.Users
        SET LastLoginAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
        WHERE UserId = @userId
      `);
  },

  async findStudentByUserId(userId: string): Promise<StudentRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("userId", sql.UniqueIdentifier, userId)
      .query<{
        UserId: string;
        StudentProfileId: string;
        Email: string;
        FirstName: string;
        LastName: string | null;
        DisplayName: string | null;
        GradeLevel: string | null;
        EducationLevel: string | null;
        PreferredLearningStyle: string | null;
        DefaultLearningMode: string | null;
        AIAdaptationEnabled: boolean;
        ModeCode: string | null;
        ModeName: string | null;
      }>(`
        SELECT TOP 1
          u.UserId,
          sp.StudentProfileId,
          u.Email,
          u.FirstName,
          u.LastName,
          u.DisplayName,
          sp.GradeLevel,
          sp.EducationLevel,
          sp.PreferredLearningStyle,
          sp.DefaultLearningMode,
          sp.AIAdaptationEnabled,
          lm.ModeCode,
          lm.ModeName
        FROM fahm.Users u
        INNER JOIN fahm.StudentProfiles sp ON sp.UserId = u.UserId
        LEFT JOIN fahm.LearningModes lm
          ON lm.ModeCode = sp.DefaultLearningMode AND lm.IsActive = 1
        WHERE u.UserId = @userId
      `);

    const row = result.recordset[0];
    if (!row) return null;
    return {
      userId: String(row.UserId),
      studentProfileId: String(row.StudentProfileId),
      email: row.Email,
      firstName: row.FirstName,
      lastName: row.LastName,
      displayName: displayName(row.FirstName, row.LastName, row.DisplayName),
      gradeLevel: row.GradeLevel,
      educationLevel: row.EducationLevel,
      preferredLearningStyle: row.PreferredLearningStyle,
      defaultLearningMode: row.DefaultLearningMode,
      preferredLearningModeCode: row.ModeCode,
      preferredLearningModeName: row.ModeName,
      aiAdaptationEnabled: Boolean(row.AIAdaptationEnabled),
    };
  },
};
