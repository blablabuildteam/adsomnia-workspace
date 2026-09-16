"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { verifyShareToken } from "@/lib/share";
import type { CommentResult } from "@/app/(workspace)/workstreams/[id]/actions";

const GUEST_NAME_MIN = 2;
const GUEST_NAME_MAX = 80;
const BODY_MAX = 2000;

export async function addShareComment(
  _prev: CommentResult,
  formData: FormData,
): Promise<CommentResult> {
  const token = (formData.get("shareToken") as string)?.trim();
  if (!token) {
    return { error: "This share link is invalid." };
  }

  const initiativeId = verifyShareToken(token);
  if (initiativeId == null) {
    return { error: "This share link is invalid or has expired." };
  }

  const user = await getCurrentUser();
  if (user) {
    return {
      error: "You are signed in — refresh the page to comment with your workspace account.",
    };
  }

  const guestName = (formData.get("guestName") as string)?.trim() ?? "";
  if (guestName.length < GUEST_NAME_MIN) {
    return { error: "Enter your name before posting (at least 2 characters)." };
  }
  if (guestName.length > GUEST_NAME_MAX) {
    return { error: `Name must be ${GUEST_NAME_MAX} characters or fewer.` };
  }

  const body = (formData.get("body") as string)?.trim();
  if (!body) {
    return { error: "Comment cannot be empty." };
  }
  if (body.length > BODY_MAX) {
    return { error: "Comment must be 2000 characters or fewer." };
  }

  await db.insert(comments).values({
    initiativeId,
    userId: null,
    guestAuthorName: guestName,
    body,
  });

  revalidatePath(`/share/${token}`);
  revalidatePath(`/workstreams/${initiativeId}`);
  return { success: true };
}
