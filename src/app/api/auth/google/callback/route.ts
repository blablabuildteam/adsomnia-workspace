import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { hashSync } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, needsProfileCompletion } from "@/lib/session";
import {
  exchangeGoogleLoginCode,
  isEmailDomainAllowed,
  isGoogleLoginConfigured,
  isLeadershipEmail,
  type GoogleLoginProfile,
} from "@/lib/integrations/google-login";
import { verifyGoogleLoginOAuthState } from "@/lib/integrations/google-login-oauth-state";

function appOrigin(request: Request): string {
  const configured = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  ).replace(/\/$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

function loginErrorRedirect(origin: string, error: string) {
  const dest = new URL("/login", origin);
  dest.searchParams.set("error", error);
  return NextResponse.redirect(dest);
}

function displayNameFromGoogle(profile: GoogleLoginProfile): string {
  const fromParts = [profile.givenName, profile.familyName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromParts) return fromParts;
  if (profile.name?.trim()) return profile.name.trim();
  return profile.email.split("@")[0] || "User";
}

export async function GET(request: Request) {
  const origin = appOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return loginErrorRedirect(
      origin,
      oauthError === "access_denied" ? "google_denied" : "google_failed",
    );
  }

  if (!isGoogleLoginConfigured()) {
    return loginErrorRedirect(origin, "google_not_configured");
  }

  if (!code || !state) {
    return loginErrorRedirect(origin, "google_missing_code");
  }

  try {
    await verifyGoogleLoginOAuthState(state);
    const profile = await exchangeGoogleLoginCode(code);

    if (!profile.emailVerified) {
      return loginErrorRedirect(origin, "google_email_unverified");
    }

    if (!isEmailDomainAllowed(profile.email)) {
      return loginErrorRedirect(origin, "google_domain_not_allowed");
    }

    const leadership = isLeadershipEmail(profile.email);

    const [existing] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, profile.email))
      .limit(1);

    let userId: string;

    if (existing) {
      userId = existing.id;
      // Promote LOGIN_* emails to leadership if they were created as team earlier.
      if (leadership && existing.role !== "leadership") {
        await db
          .update(users)
          .set({ role: "leadership" })
          .where(eq(users.id, userId));
      }
    } else {
      const name = displayNameFromGoogle(profile);
      const passwordHash = hashSync(randomBytes(32).toString("hex"), 10);
      const [created] = await db
        .insert(users)
        .values({
          name,
          firstName: profile.givenName?.trim() || null,
          lastName: profile.familyName?.trim() || null,
          email: profile.email,
          passwordHash,
          role: leadership ? "leadership" : "team",
          profileCompletedAt: null,
        })
        .returning({ id: users.id });

      if (!created) {
        return loginErrorRedirect(origin, "google_failed");
      }
      userId = created.id;
    }

    await createSession(userId);

    const [sessionUser] = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
        email: users.email,
        role: users.role,
        profileCompletedAt: users.profileCompletedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const dest =
      sessionUser && needsProfileCompletion(sessionUser)
        ? "/complete-profile"
        : "/dashboard";
    return NextResponse.redirect(new URL(dest, origin));
  } catch {
    return loginErrorRedirect(origin, "google_failed");
  }
}
