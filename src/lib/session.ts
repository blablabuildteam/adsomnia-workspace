import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ThemePreference } from "./theme";
import {
  parseThemePreference,
  THEME_COOKIE,
  themeCookieMaxAge,
} from "./theme";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "adsomnia-dev-secret-change-in-production",
);
const COOKIE_NAME = "adsomnia-session";
const EXPIRY = "7d";

const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(EXPIRY)
    .setIssuedAt()
    .sign(SECRET);
}

/** Set the session cookie on a Route Handler redirect response. */
export async function writeSessionCookie(
  response: NextResponse,
  userId: string,
): Promise<void> {
  response.cookies.set(
    COOKIE_NAME,
    await signSessionToken(userId),
    sessionCookieOptions,
  );
}

export type SessionUser = {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  email: string;
  role: "leadership" | "production" | "team";
  profileCompletedAt: Date | null;
  themePreference: ThemePreference;
};

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    COOKIE_NAME,
    await signSessionToken(userId),
    sessionCookieOptions,
  );
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as string;
    if (!userId) return null;

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
        email: users.email,
        role: users.role,
        profileCompletedAt: users.profileCompletedAt,
        themePreference: users.themePreference,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return null;
    return {
      ...user,
      themePreference: parseThemePreference(user.themePreference),
    };
  } catch {
    return null;
  }
}

export async function setThemeCookie(theme: ThemePreference): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, theme, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: themeCookieMaxAge(),
  });
}

/** Everyone must confirm first name, last name, and job title once. */
export function needsProfileCompletion(user: {
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
}): boolean {
  return (
    !user.firstName?.trim() ||
    !user.lastName?.trim() ||
    !user.jobTitle?.trim()
  );
}

export function displayName(user: {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const first = user.firstName?.trim() ?? "";
  const last = user.lastName?.trim() ?? "";
  const combined = `${first} ${last}`.trim();
  return combined || user.name;
}

export {
  canAddFastTrack,
  canAddProductionProject,
  canAdjustProductionPriority,
  canApprove,
  canManageOnboarding,
  canManageSetup,
  canSubmitProductFeedback,
  canViewFeedbackInbox,
  canViewUserDirectory,
  canViewInitiative,
  canViewLeadershipReport,
  isBlablabuildAccount,
  canUseFormPrefill,
} from "./permissions";
