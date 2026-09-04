import { NextResponse } from "next/server";
import { getCurrentUser, canManageSetup } from "@/lib/session";
import { exchangeOAuthCode } from "@/lib/integrations/slack";
import {
  safeReturnTo,
  verifySlackOAuthState,
} from "@/lib/integrations/slack-oauth-state";

function appOrigin(request: Request): string {
  const requestOrigin = new URL(request.url).origin;
  if (process.env.NODE_ENV === "development") {
    return requestOrigin;
  }
  const configured = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  ).replace(/\/$/, "");
  return configured || requestOrigin;
}

export async function GET(request: Request) {
  const origin = appOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    const dest = new URL("/pipeline/setup", origin);
    dest.searchParams.set("slack_error", oauthError);
    return NextResponse.redirect(dest);
  }

  const user = await getCurrentUser();
  if (!user || !canManageSetup(user)) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  if (!code || !state) {
    const dest = new URL("/pipeline/setup", origin);
    dest.searchParams.set("slack_error", "missing_code");
    return NextResponse.redirect(dest);
  }

  try {
    const parsed = await verifySlackOAuthState(state);
    if (parsed.userId !== user.id) {
      throw new Error("OAuth state user mismatch.");
    }

    await exchangeOAuthCode(code, user.id, parsed.redirectUri);

    const dest = new URL(safeReturnTo(parsed.returnTo), origin);
    dest.searchParams.set("slack_connected", "1");
    return NextResponse.redirect(dest);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Slack OAuth failed";
    const dest = new URL("/pipeline/setup", origin);
    dest.searchParams.set("slack_error", message);
    return NextResponse.redirect(dest);
  }
}
