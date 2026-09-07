import { LogLevel, WebClient } from "@slack/web-api";
import type { KnownBlock } from "@slack/types";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { initiatives, users } from "@/db/schema";
import { getUserSlackLink, getWorkspace } from "@/lib/integrations/slack";

export type SubmitterNotifyKind = "feedback" | "advanced";

export type NotifySubmitterInput = {
  initiativeId: number;
  actorUserId: string;
  actorName: string;
  kind: SubmitterNotifyKind;
  remark?: string | null;
  fromStage?: string;
  toStage?: string;
  /** Extra clause after the actor name, e.g. "sent this back with feedback". */
  headline?: string;
};

function appOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  ).replace(/\/$/, "");
}

function homeTeamId(): string | null {
  const teamId = process.env.SLACK_NOTIFICATIONS_TEAM_ID?.trim();
  return teamId || null;
}

function escapeMrkdwn(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function fallbackText(input: {
  ticketId: string;
  title: string;
  actorName: string;
  kind: SubmitterNotifyKind;
  remark?: string | null;
  fromStage?: string;
  toStage?: string;
  headline?: string;
  url: string;
}): string {
  const subject =
    input.kind === "advanced" && input.toStage
      ? `${input.ticketId} advanced to ${input.toStage}`
      : `${input.ticketId} — ${input.title}`;
  const action =
    input.headline ??
    (input.kind === "advanced" && input.fromStage && input.toStage
      ? `advanced this workstream from ${input.fromStage} to ${input.toStage}`
      : "updated this workstream");
  const remark = input.remark?.trim() ? ` Remark: ${input.remark.trim()}` : "";
  return `${subject}. ${input.actorName} ${action}.${remark} ${input.url}`;
}

async function resolveSlackUserId(opts: {
  client: WebClient;
  teamId: string;
  userId: string;
  email: string;
}): Promise<string | null> {
  const linked = await getUserSlackLink(opts.userId, opts.teamId);
  if (linked?.slackUserId) return linked.slackUserId;

  try {
    const result = await opts.client.users.lookupByEmail({ email: opts.email });
    const slackUserId = result.user?.id;
    return slackUserId ?? null;
  } catch (err) {
    const code =
      err && typeof err === "object" && "data" in err
        ? (err as { data?: { error?: string } }).data?.error
        : undefined;
    if (code === "users_not_found") return null;
    throw err;
  }
}

/**
 * DM the initiative submitter on the configured home Slack workspace.
 * Never throws — Slack failures must not block the approval/advance.
 */
export async function notifySubmitter(
  input: NotifySubmitterInput,
): Promise<void> {
  try {
    const teamId = homeTeamId();
    if (!teamId) {
      console.warn(
        "Slack submitter notify skipped: SLACK_NOTIFICATIONS_TEAM_ID is not set.",
      );
      return;
    }

    const [initiative] = await db
      .select({
        id: initiatives.id,
        ticketId: initiatives.ticketId,
        title: initiatives.title,
        submitterId: initiatives.submitterId,
      })
      .from(initiatives)
      .where(eq(initiatives.id, input.initiativeId))
      .limit(1);

    if (!initiative) return;
    if (initiative.submitterId === input.actorUserId) return;

    const [submitter] = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, initiative.submitterId))
      .limit(1);

    if (!submitter?.email) return;

    const workspace = await getWorkspace(teamId);
    if (!workspace) {
      console.warn(
        `Slack submitter notify skipped: home workspace ${teamId} is not connected.`,
      );
      return;
    }

    const origin = appOrigin();
    if (!origin) {
      console.warn(
        "Slack submitter notify skipped: NEXT_PUBLIC_APP_URL is not set.",
      );
      return;
    }

    const client = new WebClient(workspace.botToken, {
      logLevel: LogLevel.ERROR,
    });

    const slackUserId = await resolveSlackUserId({
      client,
      teamId,
      userId: initiative.submitterId,
      email: submitter.email,
    });
    if (!slackUserId) return;

    const opened = await client.conversations.open({ users: slackUserId });
    const dmChannel = opened.channel?.id;
    if (!opened.ok || !dmChannel) return;

    const url = `${origin}/workstreams/${initiative.id}`;
    const action =
      input.headline ??
      (input.kind === "advanced" && input.fromStage && input.toStage
        ? `advanced this workstream from ${input.fromStage} to ${input.toStage}`
        : "updated this workstream");
    const header =
      input.kind === "advanced" && input.toStage
        ? `${initiative.ticketId} advanced to ${input.toStage}`
        : `${initiative.ticketId} — ${initiative.title}`;
    const remark = input.remark?.trim();

    const blocks: KnownBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: header.slice(0, 150),
          emoji: false,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${escapeMrkdwn(initiative.ticketId)}* — ${escapeMrkdwn(initiative.title)}\n${escapeMrkdwn(input.actorName)} ${escapeMrkdwn(action)}.`,
        },
      },
    ];

    if (remark) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `>${escapeMrkdwn(remark)}`,
        },
      });
    }

    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Open workstream" },
          url,
        },
      ],
    });

    await client.chat.postMessage({
      channel: dmChannel,
      text: fallbackText({
        ticketId: initiative.ticketId,
        title: initiative.title,
        actorName: input.actorName,
        kind: input.kind,
        remark,
        fromStage: input.fromStage,
        toStage: input.toStage,
        headline: input.headline,
        url,
      }),
      blocks,
    });
  } catch (err) {
    console.error("Slack submitter notify failed:", err);
  }
}
