import { NextResponse } from "next/server";
import { getCurrentUser, canManageSetup } from "@/lib/session";
import { listChannels } from "@/lib/integrations/slack";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canManageSetup(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId")?.trim();
  const query = searchParams.get("q") ?? "";
  const fresh = searchParams.get("fresh") === "1";
  if (!teamId) {
    return NextResponse.json(
      { error: "Select a Slack workspace." },
      { status: 400 },
    );
  }

  try {
    const result = await listChannels({ teamId, query, fresh });
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load Slack channels.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
