import { LogLevel, WebClient } from "@slack/web-api";
import type { KnownBlock } from "@slack/types";
import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { initiatives, users } from "@/db/schema";
import { STAGES } from "@/data/workflow";
import { getUserSlackLink, getWorkspace } from "@/lib/integrations/slack";
import { uniqueMentionedPeople } from "@/lib/mentions";
import { getMentionablePeople } from "@/lib/queries";

export type OwnerNotifyKind = "feedback" | "status" | "advanced";

/** @deprecated Use OwnerNotifyKind */
export type SubmitterNotifyKind = OwnerNotifyKind;

export type NotifyOwnerInput = {
  initiativeId: number;
  actorUserId: string;
  actorName: string;
  kind: OwnerNotifyKind;
  remark?: string | null;
  fromStage?: string;
  toStage?: string;
  /** New workstream status value (`draft` / `submitted` / `approved` / …). */
  status?: string;
  /** Extra clause after the actor name, e.g. "sent this back with feedback". */
  headline?: string;
};

export type NotifySubmitterInput = NotifyOwnerInput;

export type NotifyReviewersInput = {
  initiativeId: number;
  actorUserId: string;
  actorName: string;
  /** Stage the workstream is in while it waits for review. */
  stage: string;
};

type ReviewerKey = "coen" | "sietse" | "oleg";

const REVIEWER_SPECS: Record<
  ReviewerKey,
  { envKey: string; defaults: string[]; firstName: string }
> = {
  coen: {
    envKey: "LOGIN_COEN_EMAIL",
    defaults: ["coen@adsomnia.com"],
    firstName: "Coen",
  },
  sietse: {
    envKey: "LOGIN_SIETSE_EMAIL",
    defaults: ["sietse@adsomnia.com", "sietse@godai.nl"],
    firstName: "Sietse",
  },
  oleg: {
    envKey: "LOGIN_OLEG_EMAIL",
    defaults: ["oleg@adsomnia.com"],
    firstName: "Oleg",
  },
};

/** Who is pinged when a workstream is submitted for review in that stage. */
const REVIEWERS_BY_STAGE: Record<string, ReviewerKey[]> = {
  idea: ["coen"],
  validation: ["coen", "sietse", "oleg"],
  scoping: ["coen", "sietse", "oleg"],
  "go-nogo": ["sietse"],
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  "on-hold": "On Hold",
  draft: "Draft",
};

type HomeSlack = {
  client: WebClient;
  teamId: string;
  origin: string;
};

type InitiativeSummary = {
  id: number;
  ticketId: string;
  title: string;
  submitterId: string;
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

function parseCommaSeparated(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

function stageName(stageId: string): string {
  return STAGES.find((stage) => stage.id === stageId)?.name ?? stageId;
}

function workstreamUrl(origin: string, initiativeId: number): string {
  return `${origin}/workstreams/${initiativeId}`;
}

function emailsForReviewer(key: ReviewerKey): string[] {
  const spec = REVIEWER_SPECS[key];
  const fromEnv = process.env[spec.envKey]?.trim();
  if (fromEnv) return parseCommaSeparated(fromEnv);
  return spec.defaults.map((email) => email.toLowerCase());
}

async function loadHomeSlack(logLabel: string): Promise<HomeSlack | null> {
  const teamId = homeTeamId();
  if (!teamId) {
    console.warn(`Slack ${logLabel} skipped: SLACK_NOTIFICATIONS_TEAM_ID is not set.`);
    return null;
  }

  const origin = appOrigin();
  if (!origin) {
    console.warn(`Slack ${logLabel} skipped: NEXT_PUBLIC_APP_URL is not set.`);
    return null;
  }

  const workspace = await getWorkspace(teamId);
  if (!workspace) {
    console.warn(
      `Slack ${logLabel} skipped: home workspace ${teamId} is not connected.`,
    );
    return null;
  }

  return {
    client: new WebClient(workspace.botToken, { logLevel: LogLevel.ERROR }),
    teamId,
    origin,
  };
}

async function loadInitiative(
  initiativeId: number,
): Promise<InitiativeSummary | null> {
  const [initiative] = await db
    .select({
      id: initiatives.id,
      ticketId: initiatives.ticketId,
      title: initiatives.title,
      submitterId: initiatives.submitterId,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  return initiative ?? null;
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

async function emailForUser(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.email ?? null;
}

async function postDm(opts: {
  client: WebClient;
  slackUserId: string;
  text: string;
  blocks: KnownBlock[];
}): Promise<void> {
  const opened = await opts.client.conversations.open({
    users: opts.slackUserId,
  });
  const dmChannel = opened.channel?.id;
  if (!opened.ok || !dmChannel) return;

  await opts.client.chat.postMessage({
    channel: dmChannel,
    text: opts.text,
    blocks: opts.blocks,
  });
}

function openButton(url: string): KnownBlock {
  return {
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "Open workstream" },
        url,
      },
    ],
  };
}

function ownerAction(input: NotifyOwnerInput): string {
  if (input.headline) return input.headline;
  if (input.kind === "advanced" && input.fromStage && input.toStage) {
    return `advanced this workstream from ${input.fromStage} to ${input.toStage}`;
  }
  if (input.kind === "status" && input.status) {
    return `changed the status of this workstream to ${statusLabel(input.status)}`;
  }
  if (input.kind === "feedback") {
    return "sent this back with feedback";
  }
  return "updated this workstream";
}

function ownerHeader(initiative: InitiativeSummary, input: NotifyOwnerInput): string {
  if (input.kind === "advanced" && input.toStage) {
    return `${initiative.ticketId} advanced to ${input.toStage}`;
  }
  if (input.kind === "status" && input.status) {
    return `${initiative.ticketId} status is now ${statusLabel(input.status)}`;
  }
  if (input.kind === "feedback") {
    return `${initiative.ticketId} — Feedback on ${initiative.title}`;
  }
  return `${initiative.ticketId} — ${initiative.title}`;
}

function ownerFallback(opts: {
  initiative: InitiativeSummary;
  input: NotifyOwnerInput;
  url: string;
}): string {
  const action = ownerAction(opts.input);
  const remark = opts.input.remark?.trim()
    ? ` Remark: ${opts.input.remark.trim()}`
    : "";
  return `${ownerHeader(opts.initiative, opts.input)}. ${opts.input.actorName} ${action}.${remark} ${opts.url}`;
}

async function resolveReviewerUsers(
  keys: ReviewerKey[],
): Promise<{ id: string; email: string }[]> {
  const found: { id: string; email: string }[] = [];
  const seen = new Set<string>();

  for (const key of keys) {
    const spec = REVIEWER_SPECS[key];
    const emails = emailsForReviewer(key);

    const emailMatches =
      emails.length > 0
        ? await db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(
              sql`lower(${users.email}) in (${sql.join(
                emails.map((email) => sql`${email}`),
                sql`, `,
              )})`,
            )
        : [];

    let matches = emailMatches;
    if (matches.length === 0) {
      matches = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(
          or(eq(users.firstName, spec.firstName), eq(users.name, spec.firstName)),
        );
    }

    if (matches.length === 0) {
      console.warn(
        `Slack review notify: no workspace user found for ${spec.firstName}.`,
      );
      continue;
    }

    const preferredEmail = emails[0];
    const match =
      matches.find(
        (row) =>
          preferredEmail && row.email.toLowerCase() === preferredEmail,
      ) ?? matches[0];

    if (seen.has(match.id) || !match.email) continue;
    seen.add(match.id);
    found.push(match);
  }

  return found;
}

/**
 * DM the workstream owner on the configured home Slack workspace.
 * Never throws — Slack failures must not block the approval/advance.
 */
export async function notifyOwner(input: NotifyOwnerInput): Promise<void> {
  try {
    const home = await loadHomeSlack("owner notify");
    if (!home) return;

    const initiative = await loadInitiative(input.initiativeId);
    if (!initiative) return;
    if (initiative.submitterId === input.actorUserId) return;

    const email = await emailForUser(initiative.submitterId);
    if (!email) return;

    const slackUserId = await resolveSlackUserId({
      client: home.client,
      teamId: home.teamId,
      userId: initiative.submitterId,
      email,
    });
    if (!slackUserId) return;

    const url = workstreamUrl(home.origin, initiative.id);
    const action = ownerAction(input);
    const header = ownerHeader(initiative, input);
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

    blocks.push(openButton(url));

    await postDm({
      client: home.client,
      slackUserId,
      text: ownerFallback({ initiative, input, url }),
      blocks,
    });
  } catch (err) {
    console.error("Slack owner notify failed:", err);
  }
}

/** @deprecated Use notifyOwner */
export const notifySubmitter = notifyOwner;

/**
 * DM the configured leadership reviewers when a workstream is submitted
 * for review. Recipients by stage:
 * - Initiative → Coen
 * - Validation / Scoping → Coen, Sietse, Oleg
 * - Go/No-Go → Sietse
 *
 * Never throws — Slack failures must not block submit.
 */
export async function notifyReviewers(
  input: NotifyReviewersInput,
): Promise<void> {
  try {
    const reviewerKeys = REVIEWERS_BY_STAGE[input.stage];
    if (!reviewerKeys?.length) return;

    const home = await loadHomeSlack("review notify");
    if (!home) return;

    const initiative = await loadInitiative(input.initiativeId);
    if (!initiative) return;

    const reviewers = (await resolveReviewerUsers(reviewerKeys)).filter(
      (person) => person.id !== input.actorUserId,
    );
    if (reviewers.length === 0) return;

    const url = workstreamUrl(home.origin, initiative.id);
    const stage = stageName(input.stage);
    const header = `${initiative.ticketId} is ready for ${stage} review`;
    const sentSlackIds = new Set<string>();

    for (const reviewer of reviewers) {
      const slackUserId = await resolveSlackUserId({
        client: home.client,
        teamId: home.teamId,
        userId: reviewer.id,
        email: reviewer.email,
      });
      if (!slackUserId || sentSlackIds.has(slackUserId)) continue;
      sentSlackIds.add(slackUserId);

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
            text: `*${escapeMrkdwn(initiative.ticketId)}* — ${escapeMrkdwn(initiative.title)}\n${escapeMrkdwn(input.actorName)} submitted this workstream for *${escapeMrkdwn(stage)}* review.`,
          },
        },
        openButton(url),
      ];

      const fallback = `${initiative.ticketId} is ready for ${stage} review. ${input.actorName} submitted ${initiative.title}. ${url}`;

      await postDm({
        client: home.client,
        slackUserId,
        text: fallback,
        blocks,
      });
    }
  } catch (err) {
    console.error("Slack review notify failed:", err);
  }
}

/**
 * Owner status DM (skipped when the actor is the owner) plus leadership
 * review DMs for the stage the workstream is waiting in.
 */
export async function notifySubmittedForReview(
  input: NotifyReviewersInput,
): Promise<void> {
  await notifyOwner({
    initiativeId: input.initiativeId,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    kind: "status",
    status: "submitted",
    headline: "submitted this workstream for review",
  });
  await notifyReviewers(input);
}

export type NotifyChatMentionsInput = {
  initiativeId: number;
  actorUserId: string;
  actorName: string;
  body: string;
};

/**
 * DM each @mentioned workspace user on the home Slack workspace.
 * Never throws — Slack failures must not block saving the chat remark.
 */
export async function notifyChatMentions(
  input: NotifyChatMentionsInput,
): Promise<void> {
  try {
    const home = await loadHomeSlack("chat mention notify");
    if (!home) return;

    const people = await getMentionablePeople();
    const mentioned = uniqueMentionedPeople(input.body, people).filter(
      (person) => person.id !== input.actorUserId,
    );
    if (mentioned.length === 0) return;

    const initiative = await loadInitiative(input.initiativeId);
    if (!initiative) return;

    const url = workstreamUrl(home.origin, initiative.id);
    const preview = input.body.trim().slice(0, 500);
    const header = `${initiative.ticketId} — You were mentioned in chat`;

    for (const person of mentioned) {
      const email = await emailForUser(person.id);
      if (!email) continue;

      const slackUserId = await resolveSlackUserId({
        client: home.client,
        teamId: home.teamId,
        userId: person.id,
        email,
      });
      if (!slackUserId) continue;

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
            text: `*${escapeMrkdwn(initiative.ticketId)}* — ${escapeMrkdwn(initiative.title)}\n${escapeMrkdwn(input.actorName)} mentioned you in workstream chat.`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `>${escapeMrkdwn(preview)}`,
          },
        },
        openButton(url),
      ];

      const fallback = `${initiative.ticketId} — ${initiative.title}. ${input.actorName} mentioned you in chat: "${preview}" ${url}`;

      await postDm({
        client: home.client,
        slackUserId,
        text: fallback,
        blocks,
      });
    }
  } catch (err) {
    console.error("Slack chat mention notify failed:", err);
  }
}
