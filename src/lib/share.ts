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
