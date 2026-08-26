"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createSession,
  destroySession,
  getCurrentUser,
  needsProfileCompletion,
} from "./session";

export type LoginResult = {
  error?: string;
};

export type ProfileFormResult = {
  error?: string;
  success?: boolean;
};

function buildDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export async function login(
  _prev: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user) {
    return { error: "Invalid email or password." };
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);

  if (needsProfileCompletion({
    id: user.id,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    jobTitle: user.jobTitle,
    email: user.email,
    role: user.role,
    profileCompletedAt: user.profileCompletedAt,
  })) {
    redirect("/complete-profile");
  }

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/** First-time signup after Google (or password) for non-leadership users. */
export async function completeProfile(
  _prev: ProfileFormResult,
  formData: FormData,
): Promise<ProfileFormResult> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();

  if (!firstName || !lastName || !jobTitle) {
    return { error: "First name, last name, and job title are required." };
  }

  await db
    .update(users)
    .set({
      firstName,
      lastName,
      jobTitle,
      name: buildDisplayName(firstName, lastName),
      profileCompletedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  redirect("/dashboard");
}

/** Edit profile from the sidebar (any role). */
export async function updateProfile(
  _prev: ProfileFormResult,
  formData: FormData,
): Promise<ProfileFormResult> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();

  if (!firstName || !lastName || !jobTitle) {
    return { error: "First name, last name, and job title are required." };
  }

  await db
    .update(users)
    .set({
      firstName,
      lastName,
      jobTitle,
      name: buildDisplayName(firstName, lastName),
      profileCompletedAt: user.profileCompletedAt ?? new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/", "layout");
  return { success: true };
}
