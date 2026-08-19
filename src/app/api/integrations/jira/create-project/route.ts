import { NextResponse } from "next/server";
import { getCurrentUser, canManageSetup } from "@/lib/session";
import {
  createProject,
  getProjectUrl,
  type JiraInstance,
} from "@/lib/integrations/jira";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canManageSetup(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { instance, key, name, description, template } = body as {
    instance: JiraInstance;
    key: string;
    name: string;
    description?: string;
    template: "scrum" | "kanban";
  };

  if (!instance || !key || !name || !template) {
    return NextResponse.json(
      { error: "Missing required fields: instance, key, name, template" },
      { status: 400 },
    );
  }

  try {
    const result = await createProject(instance, {
      key,
      name,
      description,
      template,
    });

    const projectUrl = getProjectUrl(instance, result.key);

    return NextResponse.json({
      success: true,
      projectId: result.id,
      projectKey: result.key,
      projectUrl,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create Jira project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
