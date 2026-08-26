import { NextResponse } from "next/server";
import { getCurrentUser, canManageSetup } from "@/lib/session";
import {
  getInstalledWorkspaces,
  isSlackAppConfigured,
} from "@/lib/integrations/slack";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canManageSetup(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const workspaces = await getInstalledWorkspaces();
  return NextResponse.json({
    appConfigured: isSlackAppConfigured(),
    workspaces,
  });
}
