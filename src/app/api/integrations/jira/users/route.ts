import { NextResponse } from "next/server";
import { getCurrentUser, canManageSetup } from "@/lib/session";
import { searchUsers, type JiraInstance } from "@/lib/integrations/jira";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canManageSetup(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const instance = searchParams.get("instance") as JiraInstance | null;
  const query = searchParams.get("query") ?? "";

  if (!instance) {
    return NextResponse.json(
      { error: "Missing required parameter: instance" },
      { status: 400 },
    );
  }

  try {
    const users = await searchUsers(instance, query);
    return NextResponse.json({ users });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to search Jira users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
