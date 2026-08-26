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

export function getGoogleLoginRedirectUri(): string {
  return `${appUrl()}/api/auth/google/callback`;
}

export function isGoogleLoginConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_LOGIN_CLIENT_ID &&
      process.env.GOOGLE_LOGIN_CLIENT_SECRET &&
      appUrl(),
  );
}

/** Comma-separated domains from GOOGLE_ALLOWED_DOMAINS (lowercased, trimmed). */
export function getAllowedGoogleDomains(): string[] {
  const raw = process.env.GOOGLE_ALLOWED_DOMAINS || "";
  return raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailDomainAllowed(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1).toLowerCase();
  const allowed = getAllowedGoogleDomains();
  if (allowed.length === 0) return false;
  return allowed.includes(domain);
}

export function getGoogleAuthorizeUrl(state: string): string {
  const clientId = process.env.GOOGLE_LOGIN_CLIENT_ID;
  if (!clientId || !appUrl()) {
    throw new Error(
      "Google login is not configured. Set GOOGLE_LOGIN_CLIENT_ID, GOOGLE_LOGIN_CLIENT_SECRET, and NEXT_PUBLIC_APP_URL.",
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleLoginRedirectUri(),
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
): Promise<GoogleLoginProfile> {
  const clientId = process.env.GOOGLE_LOGIN_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_LOGIN_CLIENT_SECRET;
  if (!clientId || !clientSecret || !appUrl()) {
    throw new Error("Google login is not configured.");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getGoogleLoginRedirectUri(),
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
