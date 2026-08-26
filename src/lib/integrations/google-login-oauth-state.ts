import { SignJWT, jwtVerify } from "jose";

const STATE_TTL_SECONDS = 60 * 10;
const STATE_PURPOSE = "google-login";

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }
  return new TextEncoder().encode(secret);
}

export async function createGoogleLoginOAuthState(): Promise<string> {
  return new SignJWT({ purpose: STATE_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${STATE_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyGoogleLoginOAuthState(state: string): Promise<void> {
  const { payload } = await jwtVerify(state, getSecret());
  if (payload.purpose !== STATE_PURPOSE) {
    throw new Error("Invalid Google OAuth state.");
  }
}
