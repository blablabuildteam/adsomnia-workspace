import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getIntegrationStatus } from "@/lib/integrations/jira";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const status = getIntegrationStatus();
  return NextResponse.json(status);
}
