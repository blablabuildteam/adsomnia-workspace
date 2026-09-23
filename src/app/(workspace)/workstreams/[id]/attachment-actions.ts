"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { activityLog, initiatives } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canModifyWorkstream } from "@/lib/permissions";
import { loadInitiativeAccess } from "@/lib/workstream-access";
import { displayName, getCurrentUser } from "@/lib/session";
import {
  addWorkstreamFileAttachment,
  addWorkstreamLinkAttachment,
  deleteWorkstreamAttachment,
  type WorkstreamAttachmentResult,
} from "@/lib/workstream-attachments";

function revalidateWorkstream(initiativeId: number, shareToken?: string) {
  revalidatePath(`/workstreams/${initiativeId}`);
  if (shareToken) revalidatePath(`/share/${shareToken}`);
}

async function loadVisibleInitiative(initiativeId: number) {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." } as const;

  const [initiative] = await db
    .select({
      id: initiatives.id,
      submitterId: initiatives.submitterId,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (
    !initiative ||
    !canModifyWorkstream(
      user,
      await loadInitiativeAccess(user, initiativeId, {
        submitterId: initiative.submitterId,
      }),
    )
  ) {
    return { error: "Workstream not found." } as const;
  }

  return { user, initiative };
}

export async function addWorkstreamAttachment(
  initiativeId: number,
  input: {
    title?: string;
    url?: string;
    kind?: string;
    pageTitle?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    mimeType?: string | null;
  },
): Promise<WorkstreamAttachmentResult> {
  const loaded = await loadVisibleInitiative(initiativeId);
  if ("error" in loaded) return loaded;

  if (!input.url) {
    return { error: "A link is required." };
  }

  const result = await addWorkstreamLinkAttachment(
    initiativeId,
    { ...input, url: input.url },
    {
      userId: loaded.user.id,
      userName: displayName(loaded.user),
    },
  );

  if (result.attachment) {
    await db.insert(activityLog).values({
      initiativeId,
      userId: loaded.user.id,
      action: "attachment_added",
      details: {
        title: result.attachment.title,
        kind: result.attachment.kind,
      },
    });
    revalidateWorkstream(initiativeId);
  }
  return result;
}

export async function addWorkstreamFile(
  initiativeId: number,
  formData: FormData,
): Promise<WorkstreamAttachmentResult> {
  const loaded = await loadVisibleInitiative(initiativeId);
  if ("error" in loaded) return loaded;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose a file to attach." };
  }

  const result = await addWorkstreamFileAttachment(initiativeId, file, {
    userId: loaded.user.id,
    userName: displayName(loaded.user),
  });

  if (result.attachment) {
    await db.insert(activityLog).values({
      initiativeId,
      userId: loaded.user.id,
      action: "attachment_added",
      details: {
        title: result.attachment.title,
        kind: "file",
      },
    });
    revalidateWorkstream(initiativeId);
  }
  return result;
}

export async function removeWorkstreamAttachment(
  initiativeId: number,
  attachmentId: string,
): Promise<{ error?: string; success?: boolean }> {
  const loaded = await loadVisibleInitiative(initiativeId);
  if ("error" in loaded) return loaded;

  const id = Number.parseInt(attachmentId, 10);
  if (!Number.isFinite(id)) {
    return { error: "Attachment not found." };
  }

  const result = await deleteWorkstreamAttachment(initiativeId, id);
  if (result.success) {
    await db.insert(activityLog).values({
      initiativeId,
      userId: loaded.user.id,
      action: "attachment_removed",
      details: { id },
    });
    revalidateWorkstream(initiativeId);
  }
  return result;
}
