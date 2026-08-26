import { NextResponse } from "next/server";
import { getCurrentUser, canManageSetup } from "@/lib/session";
import {
  getSlackAuthorizeUrl,
  isSlackAppConfigured,
} from "@/lib/integrations/slack";
import {
  createSlackOAuthState,
  safeReturnTo,
} from "@/lib/integrations/slack-oauth-state";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canManageSetup(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!isSlackAppConfigured()) {
    return NextResponse.json(
      {
        error:
          "Slack app is not configured. Set SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, and NEXT_PUBLIC_APP_URL.",
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const returnTo = safeReturnTo(searchParams.get("returnTo"));

  const state = await createSlackOAuthState({
    returnTo,
    userId: user.id,
  });

  const url = getSlackAuthorizeUrl(state);
  return NextResponse.redirect(url);
}
