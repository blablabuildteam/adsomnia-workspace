import { NextResponse } from "next/server";
import { getCurrentUser, canManageSetup } from "@/lib/session";
import {
  listJiraEnvironments,
  resolveSetupJiraInstance,
} from "@/lib/integrations/jira";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canManageSetup(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const leadParty = new URL(request.url).searchParams.get("leadParty");
  const instances = listJiraEnvironments();
  const suggested = resolveSetupJiraInstance(leadParty);

  return NextResponse.json({ instances, suggested });
}
