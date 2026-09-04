import { SignJWT, jwtVerify } from "jose";

const STATE_TTL_SECONDS = 60 * 10;

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }
  return new TextEncoder().encode(secret);
}

export type SlackOAuthState = {
  returnTo: string;
  userId: string;
  redirectUri: string;
};

function isSlackCallbackUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    return parsed.pathname === "/api/integrations/slack/oauth/callback";
  } catch {
    return false;
  }
}

export async function createSlackOAuthState(
  payload: SlackOAuthState,
): Promise<string> {
  if (!isSlackCallbackUri(payload.redirectUri)) {
    throw new Error("Invalid Slack OAuth redirect URI.");
  }
  return new SignJWT({
    returnTo: payload.returnTo,
    userId: payload.userId,
    redirectUri: payload.redirectUri,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${STATE_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySlackOAuthState(
  state: string,
): Promise<SlackOAuthState> {
  const { payload } = await jwtVerify(state, getSecret());
  const returnTo =
    typeof payload.returnTo === "string" ? payload.returnTo : "";
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  const redirectUri =
    typeof payload.redirectUri === "string" ? payload.redirectUri : "";
  if (!returnTo || !userId || !isSlackCallbackUri(redirectUri)) {
    throw new Error("Invalid Slack OAuth state.");
  }
  return { returnTo, userId, redirectUri };
}

/** Only allow relative app paths (prevent open redirects). */
export function safeReturnTo(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/pipeline/setup";
  }
  return raw;
}
