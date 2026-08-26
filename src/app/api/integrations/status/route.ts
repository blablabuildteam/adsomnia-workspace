import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getIntegrationStatus } from "@/lib/integrations/jira";
import { getSlackIntegrationStatus } from "@/lib/integrations/slack";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const jira = getIntegrationStatus();
  const slack = await getSlackIntegrationStatus();
  return NextResponse.json({
    ...jira,
    slack,
  });
}
