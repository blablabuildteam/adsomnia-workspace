import { NextResponse } from "next/server";
import {
  getGoogleAuthorizeUrl,
  getGoogleLoginRedirectOrigin,
  isGoogleLoginConfigured,
} from "@/lib/integrations/google-login";
import { createGoogleLoginOAuthState } from "@/lib/integrations/google-login-oauth-state";

function appOrigin(request: Request): string {
  const configured = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  ).replace(/\/$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const origin = appOrigin(request);

  if (!isGoogleLoginConfigured()) {
    const dest = new URL("/login", origin);
    dest.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(dest);
  }

  try {
    const redirectOrigin = getGoogleLoginRedirectOrigin(request);
    const state = await createGoogleLoginOAuthState(redirectOrigin);
    return NextResponse.redirect(getGoogleAuthorizeUrl(state, redirectOrigin));
  } catch {
    const dest = new URL("/login", origin);
    dest.searchParams.set("error", "google_start_failed");
    return NextResponse.redirect(dest);
  }
}
