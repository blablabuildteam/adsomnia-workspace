import { NextResponse } from "next/server";
import { getCurrentUser, canManageSetup } from "@/lib/session";
import {
  clampJiraProjectName,
  createProject,
  getProjectUrl,
  isJiraInstance,
  validateJiraProjectName,
} from "@/lib/integrations/jira";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canManageSetup(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { instance, key, name, description, template } = body as {
    instance: string;
    key: string;
    name: string;
    description?: string;
    template: "scrum" | "kanban";
  };

  if (!isJiraInstance(instance) || !key || !name || !template) {
    return NextResponse.json(
      { error: "Missing required fields: instance, key, name, template" },
      { status: 400 },
    );
  }

  const projectName = clampJiraProjectName(name);
  const nameError = validateJiraProjectName(projectName);
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 });
  }

  try {
    const result = await createProject(instance, {
      key,
      name: projectName,
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
