import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET =
  process.env.SESSION_SECRET || "adsomnia-dev-secret-change-in-production";

function hmacFor(initiativeId: number): string {
  return createHmac("sha256", SECRET)
    .update(`share:${initiativeId}`)
    .digest("base64url");
}

/** Unguessable public path for an initiative detail view. */
export function createSharePath(initiativeId: number): string {
  return `/share/${initiativeId}.${hmacFor(initiativeId)}`;
}

export type FastTrackShareSubject =
  | { jiraKey: string }
  | { initiativeId: number };

function hmacForFastTrack(subjectId: string): string {
  return createHmac("sha256", SECRET)
    .update(`fast-track:${subjectId}`)
    .digest("base64url");
}

function fastTrackSubjectId(subject: FastTrackShareSubject): string {
  if ("jiraKey" in subject) return subject.jiraKey.trim().toUpperCase();
  return `ws-${subject.initiativeId}`;
}

/** Unguessable public path for one Fast-Track item. */
export function createFastTrackSharePath(subject: FastTrackShareSubject): string {
  const id = fastTrackSubjectId(subject);
  return `/share/fast-track/${id}.${hmacForFastTrack(id)}`;
}

const FAST_TRACK_JIRA_SHARE_ID = /^[A-Z][A-Z0-9_]*-\d+$/;

function canonicalFastTrackShareId(raw: string): string | null {
  if (/^ws-\d+$/i.test(raw)) {
    const id = Number.parseInt(raw.slice(3), 10);
    if (!Number.isFinite(id) || id < 1) return null;
    return `ws-${id}`;
  }
  const key = raw.toUpperCase();
  return FAST_TRACK_JIRA_SHARE_ID.test(key) ? key : null;
}

/** Returns the Fast-Track item the share token points at. */
export function verifyFastTrackShareToken(
  token: string,
): FastTrackShareSubject | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const id = canonicalFastTrackShareId(token.slice(0, dot));
  const mac = token.slice(dot + 1);
  if (!id || !mac) return null;

  const expected = hmacForFastTrack(id);
  const given = Buffer.from(mac);
  const want = Buffer.from(expected);
  if (given.length !== want.length) return null;
  if (!timingSafeEqual(given, want)) return null;

  if (id.startsWith("ws-")) {
    return { initiativeId: Number.parseInt(id.slice(3), 10) };
  }
  return { jiraKey: id };
}

/** Returns the initiative id when the share token is valid. */
export function verifyShareToken(token: string): number | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const id = Number.parseInt(token.slice(0, dot), 10);
  const mac = token.slice(dot + 1);
  if (!Number.isFinite(id) || id < 1 || !mac) return null;

  const expected = hmacFor(id);
  const given = Buffer.from(mac);
  const want = Buffer.from(expected);
  if (given.length !== want.length) return null;
  if (!timingSafeEqual(given, want)) return null;
  return id;
}
