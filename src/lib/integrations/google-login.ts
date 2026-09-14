import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

const LOGIN_SCOPES = ["openid", "email", "profile"].join(" ");

export type GoogleLoginProfile = {
  email: string;
  emailVerified: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  sub: string;
};

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").replace(
    /\/$/,
    "",
  );
}

export function getGoogleLoginRedirectUri(origin?: string): string {
  const base = (origin || appUrl()).replace(/\/$/, "");
  if (!base) {
    throw new Error(
      "Google login redirect origin is not configured. Set NEXT_PUBLIC_APP_URL.",
    );
  }
  return `${base}/api/auth/google/callback`;
}

/** Prefer the live request origin in dev so OAuth works when Next.js picks another port. */
export function getGoogleLoginRedirectOrigin(request: Request): string {
  const requestOrigin = new URL(request.url).origin;
  if (process.env.NODE_ENV === "development") {
    return requestOrigin;
  }
  const configured = appUrl();
  return configured || requestOrigin;
}

export function isGoogleLoginConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_LOGIN_CLIENT_ID &&
      process.env.GOOGLE_LOGIN_CLIENT_SECRET &&
      appUrl(),
  );
}

const DEFAULT_ALLOWED_GOOGLE_DOMAINS = [
  "adsomnia.com",
  "blablabuild.com",
  "godai.nl",
] as const;

/**
 * Known leadership emails, including Godai aliases of Adsomnia admins.
 * LOGIN_*_EMAIL env values are unioned in (comma-separated lists allowed).
 */
const DEFAULT_LEADERSHIP_EMAILS = [
  "sietse@adsomnia.com",
  "sietse@godai.nl",
  "oleg@adsomnia.com",
  "jasper@adsomnia.com",
  "jesper@godai.nl",
  "coen@adsomnia.com",
  "xennith@blablabuild.com",
  "kevin@blablabuild.com",
] as const;

const LOGIN_EMAIL_KEYS = [
  "LOGIN_SIETSE_EMAIL",
  "LOGIN_OLEG_EMAIL",
  "LOGIN_JASPER_EMAIL",
  "LOGIN_COEN_EMAIL",
  "LOGIN_XENNITH_EMAIL",
  "LOGIN_KEVIN_EMAIL",
] as const;

function parseCommaSeparated(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

/** Allowed Google login domains: built-in entities plus GOOGLE_ALLOWED_DOMAINS. */
export function getAllowedGoogleDomains(): string[] {
  const fromEnv = parseCommaSeparated(process.env.GOOGLE_ALLOWED_DOMAINS || "");
  return [...new Set([...DEFAULT_ALLOWED_GOOGLE_DOMAINS, ...fromEnv])];
}

export function isEmailDomainAllowed(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return getAllowedGoogleDomains().includes(domain);
}

/**
 * Leadership admin emails (Adsomnia + Godai aliases + blablabuild).
 * Matched Google accounts get the `leadership` role.
 */
export function getLeadershipEmails(): string[] {
  const emails = new Set<string>(DEFAULT_LEADERSHIP_EMAILS);
  for (const key of LOGIN_EMAIL_KEYS) {
    const value = process.env[key];
    if (!value) continue;
    for (const email of parseCommaSeparated(value)) {
      emails.add(email);
    }
  }
  return [...emails];
}

export function isLeadershipEmail(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  if (!normalized) return false;
  return getLeadershipEmails().includes(normalized);
}

export function getGoogleAuthorizeUrl(
  state: string,
  redirectOrigin: string,
): string {
  const clientId = process.env.GOOGLE_LOGIN_CLIENT_ID;
  if (!clientId || !redirectOrigin) {
    throw new Error(
      "Google login is not configured. Set GOOGLE_LOGIN_CLIENT_ID, GOOGLE_LOGIN_CLIENT_SECRET, and NEXT_PUBLIC_APP_URL.",
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleLoginRedirectUri(redirectOrigin),
    response_type: "code",
    scope: LOGIN_SCOPES,
    state,
    access_type: "online",
    prompt: "select_account",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type GoogleTokenResponse = {
  id_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
};

export async function exchangeGoogleLoginCode(
  code: string,
  redirectOrigin: string,
): Promise<GoogleLoginProfile> {
  const clientId = process.env.GOOGLE_LOGIN_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_LOGIN_CLIENT_SECRET;
  if (!clientId || !clientSecret || !redirectOrigin) {
    throw new Error("Google login is not configured.");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getGoogleLoginRedirectUri(redirectOrigin),
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await res.json()) as GoogleTokenResponse;
  if (!res.ok || !data.id_token) {
    throw new Error(
      data.error_description || data.error || "Google token exchange failed.",
    );
  }

  const { payload } = await jwtVerify(data.id_token, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });

  const email =
    typeof payload.email === "string" ? payload.email.toLowerCase().trim() : "";
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!email || !sub) {
    throw new Error("Google ID token missing email or subject.");
  }

  return {
    email,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : undefined,
    givenName:
      typeof payload.given_name === "string" ? payload.given_name : undefined,
    familyName:
      typeof payload.family_name === "string" ? payload.family_name : undefined,
    sub,
  };
}
