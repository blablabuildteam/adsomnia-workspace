import { NextResponse } from "next/server";
import { getCurrentUser, canManageSetup } from "@/lib/session";
import { createChannel } from "@/lib/integrations/slack";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canManageSetup(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: {
    teamId?: string;
    name?: string;
    isPrivate?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { teamId, name, isPrivate } = body;
  if (!teamId || !name) {
    return NextResponse.json(
      { error: "Missing required fields: teamId, name" },
      { status: 400 },
    );
  }

  try {
    const result = await createChannel({
      teamId,
      name,
      isPrivate: Boolean(isPrivate),
      adsomniaUserId: user.id,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create Slack channel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
