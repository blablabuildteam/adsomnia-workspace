import { db } from "@/db";
import { users, workstreamAttachments } from "@/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";
import { displayName } from "@/lib/session";
import {
  SHARE_GUEST_NAME_MAX,
  SHARE_GUEST_NAME_MIN,
} from "@/lib/share-guest";
import { fetchPageTitle } from "@/lib/link-preview";
import {
  attachmentKindLabel,
  detectAttachmentKind,
  hostFromUrl,
  normalizeUrl,
  type Attachment,
  type AttachmentKind,
} from "@/lib/validation-data";

export const WORKSTREAM_ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;
export const WORKSTREAM_ATTACHMENT_MAX_COUNT = 40;

const ATTACHMENT_KINDS = new Set<AttachmentKind>([
  "google-doc",
  "google-sheet",
  "google-slides",
  "google-form",
  "google-drive",
  "link",
  "file",
]);

export type WorkstreamAttachmentResult = {
  error?: string;
  attachment?: Attachment;
};

export type WorkstreamAttachmentAuth = {
  userId?: string | null;
  userName?: string | null;
  guestName?: string | null;
};

function isAttachmentKind(value: string): value is AttachmentKind {
  return ATTACHMENT_KINDS.has(value as AttachmentKind);
}

export function attachmentDownloadPath(
  initiativeId: number,
  attachmentId: number,
  shareToken?: string,
): string {
  if (shareToken) {
    return `/api/share/${shareToken}/attachments/${attachmentId}`;
  }
  return `/api/workstreams/${initiativeId}/attachments/${attachmentId}`;
}

export function sanitizeGuestName(raw: string | null | undefined): string | null {
  const name = raw?.trim() ?? "";
  if (name.length < SHARE_GUEST_NAME_MIN) return null;
  if (name.length > SHARE_GUEST_NAME_MAX) return null;
  return name;
}

function toClientAttachment(
  row: {
    id: number;
    initiativeId: number;
    kind: string;
    title: string;
    url: string | null;
    pageTitle: string | null;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
    hasStoredFile: boolean;
    guestAuthorName: string | null;
    createdAt: Date;
    addedByName: string | null;
  },
  shareToken?: string,
): Attachment {
  const kind = isAttachmentKind(row.kind) ? row.kind : "link";
  return {
    id: String(row.id),
    kind,
    title: row.title,
    url: row.hasStoredFile
      ? attachmentDownloadPath(row.initiativeId, row.id, shareToken)
      : row.url ?? undefined,
    pageTitle: row.pageTitle ?? undefined,
    fileName: row.fileName ?? undefined,
    fileSize: row.fileSize ?? undefined,
    mimeType: row.mimeType ?? undefined,
    addedBy: row.addedByName ?? row.guestAuthorName ?? undefined,
    addedAt: row.createdAt.toISOString(),
  };
}

export async function listWorkstreamAttachments(
  initiativeId: number,
  shareToken?: string,
): Promise<Attachment[]> {
  const rows = await db
    .select({
      id: workstreamAttachments.id,
      initiativeId: workstreamAttachments.initiativeId,
      kind: workstreamAttachments.kind,
      title: workstreamAttachments.title,
      url: workstreamAttachments.url,
      pageTitle: workstreamAttachments.pageTitle,
      fileName: workstreamAttachments.fileName,
      fileSize: workstreamAttachments.fileSize,
      mimeType: workstreamAttachments.mimeType,
      hasStoredFile: sql<boolean>`(${workstreamAttachments.fileData} is not null)`,
      guestAuthorName: workstreamAttachments.guestAuthorName,
      createdAt: workstreamAttachments.createdAt,
      addedByName: users.name,
    })
    .from(workstreamAttachments)
    .leftJoin(users, eq(users.id, workstreamAttachments.addedByUserId))
    .where(eq(workstreamAttachments.initiativeId, initiativeId))
    .orderBy(desc(workstreamAttachments.createdAt));

  return rows.map((row) =>
    toClientAttachment(
      {
        ...row,
        addedByName: row.addedByName ? displayName({ name: row.addedByName }) : null,
      },
      shareToken,
    ),
  );
}

async function assertCapacity(initiativeId: number): Promise<string | null> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(workstreamAttachments)
    .where(eq(workstreamAttachments.initiativeId, initiativeId));
  if (Number(total) >= WORKSTREAM_ATTACHMENT_MAX_COUNT) {
    return `This workstream already has ${WORKSTREAM_ATTACHMENT_MAX_COUNT} attachments.`;
  }
  return null;
}

export async function addWorkstreamLinkAttachment(
  initiativeId: number,
  input: {
    title?: string;
    url: string;
    kind?: string;
    pageTitle?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    mimeType?: string | null;
  },
  auth: WorkstreamAttachmentAuth,
): Promise<WorkstreamAttachmentResult> {
  const url = normalizeUrl(input.url);
  if (!url) {
    return { error: "Enter a valid link." };
  }

  const kind = isAttachmentKind(input.kind ?? "")
    ? input.kind!
    : detectAttachmentKind(url);
  const fetchedTitle = await fetchPageTitle(url);
  const fallbackTitle =
    kind === "link" ? hostFromUrl(url) : attachmentKindLabel(kind);
  const title =
    fetchedTitle ||
    input.pageTitle?.trim() ||
    input.title?.trim() ||
    input.fileName?.trim() ||
    fallbackTitle;

  const capacityError = await assertCapacity(initiativeId);
  if (capacityError) return { error: capacityError };

  const guestName = sanitizeGuestName(auth.guestName);
  if (!auth.userId && !guestName) {
    return { error: "Enter your name before adding an attachment." };
  }

  const [row] = await db
    .insert(workstreamAttachments)
    .values({
      initiativeId,
      kind,
      title: title.slice(0, 500),
      url: url.slice(0, 2000),
      pageTitle: (fetchedTitle || input.pageTitle)?.trim().slice(0, 500) || null,
      fileName: input.fileName?.trim().slice(0, 255) || null,
      fileSize: input.fileSize ?? null,
      mimeType: input.mimeType?.trim().slice(0, 120) || null,
      addedByUserId: auth.userId ?? null,
      guestAuthorName: auth.userId ? null : guestName,
    })
    .returning({
      id: workstreamAttachments.id,
      initiativeId: workstreamAttachments.initiativeId,
      kind: workstreamAttachments.kind,
      title: workstreamAttachments.title,
      url: workstreamAttachments.url,
      pageTitle: workstreamAttachments.pageTitle,
      fileName: workstreamAttachments.fileName,
      fileSize: workstreamAttachments.fileSize,
      mimeType: workstreamAttachments.mimeType,
      guestAuthorName: workstreamAttachments.guestAuthorName,
      createdAt: workstreamAttachments.createdAt,
    });

  return {
    attachment: toClientAttachment({
      ...row,
      hasStoredFile: false,
      addedByName: auth.userName ?? guestName,
    }),
  };
}

export async function addWorkstreamFileAttachment(
  initiativeId: number,
  file: File,
  auth: WorkstreamAttachmentAuth,
  shareToken?: string,
): Promise<WorkstreamAttachmentResult> {
  if (!(file instanceof File) || file.size <= 0) {
    return { error: "Choose a file to attach." };
  }
  if (file.size > WORKSTREAM_ATTACHMENT_MAX_BYTES) {
    return { error: "Files must be 4 MB or smaller." };
  }

  const capacityError = await assertCapacity(initiativeId);
  if (capacityError) return { error: capacityError };

  const guestName = sanitizeGuestName(auth.guestName);
  if (!auth.userId && !guestName) {
    return { error: "Enter your name before adding an attachment." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const [row] = await db
    .insert(workstreamAttachments)
    .values({
      initiativeId,
      kind: "file",
      title: file.name.slice(0, 500) || "Untitled file",
      fileName: file.name.slice(0, 255) || "file",
      fileSize: file.size,
      mimeType: file.type.slice(0, 120) || "application/octet-stream",
      fileData: buffer.toString("base64"),
      addedByUserId: auth.userId ?? null,
      guestAuthorName: auth.userId ? null : guestName,
    })
    .returning({
      id: workstreamAttachments.id,
      initiativeId: workstreamAttachments.initiativeId,
      kind: workstreamAttachments.kind,
      title: workstreamAttachments.title,
      url: workstreamAttachments.url,
      pageTitle: workstreamAttachments.pageTitle,
      fileName: workstreamAttachments.fileName,
      fileSize: workstreamAttachments.fileSize,
      mimeType: workstreamAttachments.mimeType,
      guestAuthorName: workstreamAttachments.guestAuthorName,
      createdAt: workstreamAttachments.createdAt,
    });

  return {
    attachment: toClientAttachment(
      {
        ...row,
        hasStoredFile: true,
        addedByName: auth.userName ?? guestName,
      },
      shareToken,
    ),
  };
}

export async function getWorkstreamAttachmentFile(
  initiativeId: number,
  attachmentId: number,
): Promise<{
  fileName: string;
  mimeType: string;
  data: Buffer;
} | null> {
  const [row] = await db
    .select({
      initiativeId: workstreamAttachments.initiativeId,
      fileName: workstreamAttachments.fileName,
      mimeType: workstreamAttachments.mimeType,
      fileData: workstreamAttachments.fileData,
    })
    .from(workstreamAttachments)
    .where(eq(workstreamAttachments.id, attachmentId))
    .limit(1);

  if (!row?.fileData || row.initiativeId !== initiativeId) return null;

  return {
    fileName: row.fileName || "attachment",
    mimeType: row.mimeType || "application/octet-stream",
    data: Buffer.from(row.fileData, "base64"),
  };
}

export async function deleteWorkstreamAttachment(
  initiativeId: number,
  attachmentId: number,
): Promise<{ error?: string; success?: boolean }> {
  const [row] = await db
    .select({
      id: workstreamAttachments.id,
      initiativeId: workstreamAttachments.initiativeId,
    })
    .from(workstreamAttachments)
    .where(eq(workstreamAttachments.id, attachmentId))
    .limit(1);

  if (!row || row.initiativeId !== initiativeId) {
    return { error: "Attachment not found." };
  }

  await db
    .delete(workstreamAttachments)
    .where(eq(workstreamAttachments.id, attachmentId));
  return { success: true };
}
