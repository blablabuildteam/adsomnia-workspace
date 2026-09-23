"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { displayName, getCurrentUser } from "@/lib/session";
import { verifyShareToken } from "@/lib/share";
import { notifyChatMentions } from "@/lib/integrations/slack-notify";
import {
  SHARE_GUEST_NAME_MAX,
  SHARE_GUEST_NAME_MIN,
} from "@/lib/share-guest";
import {
  addWorkstreamFileAttachment,
  addWorkstreamLinkAttachment,
  sanitizeGuestName,
  type WorkstreamAttachmentResult,
} from "@/lib/workstream-attachments";
import type { CommentResult } from "@/app/(workspace)/workstreams/[id]/actions";

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
  if (guestName.length < SHARE_GUEST_NAME_MIN) {
    return { error: "Enter your name before posting (at least 2 characters)." };
  }
  if (guestName.length > SHARE_GUEST_NAME_MAX) {
    return { error: `Name must be ${SHARE_GUEST_NAME_MAX} characters or fewer.` };
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

  await notifyChatMentions({
    initiativeId,
    actorName: guestName,
    body,
  });

  revalidatePath(`/share/${token}`);
  revalidatePath(`/workstreams/${initiativeId}`);
  return { success: true };
}

function revalidateShare(token: string, initiativeId: number) {
  revalidatePath(`/share/${token}`);
  revalidatePath(`/workstreams/${initiativeId}`);
}

async function requireShareAccess(token: string, guestNameRaw: string) {
  const initiativeId = verifyShareToken(token);
  if (initiativeId == null) {
    return { error: "This share link is invalid or has expired." } as const;
  }

  const user = await getCurrentUser();
  if (user) {
    return {
      initiativeId,
      userId: user.id,
      userName: displayName(user),
      guestName: null as string | null,
    };
  }

  const guestName = sanitizeGuestName(guestNameRaw);
  if (!guestName) {
    return { error: "Enter your name before adding an attachment." } as const;
  }

  return { initiativeId, userId: null, userName: null, guestName };
}

export async function addShareAttachment(
  token: string,
  input: {
    guestName: string;
    title?: string;
    url?: string;
    kind?: string;
    pageTitle?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    mimeType?: string | null;
  },
): Promise<WorkstreamAttachmentResult> {
  const access = await requireShareAccess(token, input.guestName);
  if ("error" in access) return access;
  if (!input.url) return { error: "A link is required." };

  const result = await addWorkstreamLinkAttachment(
    access.initiativeId,
    { ...input, url: input.url },
    {
      userId: access.userId,
      userName: access.userName,
      guestName: access.guestName,
    },
  );
  if (result.attachment) revalidateShare(token, access.initiativeId);
  return result;
}

export async function addShareFile(
  token: string,
  formData: FormData,
): Promise<WorkstreamAttachmentResult> {
  const guestName = String(formData.get("guestName") ?? "");
  const access = await requireShareAccess(token, guestName);
  if ("error" in access) return access;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose a file to attach." };
  }

  const result = await addWorkstreamFileAttachment(
    access.initiativeId,
    file,
    {
      userId: access.userId,
      userName: access.userName,
      guestName: access.guestName,
    },
    token,
  );
  if (result.attachment) revalidateShare(token, access.initiativeId);
  return result;
}
