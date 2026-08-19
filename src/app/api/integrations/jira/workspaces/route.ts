import { NextResponse } from "next/server";
import { getCurrentUser, canManageSetup } from "@/lib/session";
import { getAvailableInstances } from "@/lib/integrations/jira";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canManageSetup(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const instances = getAvailableInstances();
  return NextResponse.json({ instances });
}
