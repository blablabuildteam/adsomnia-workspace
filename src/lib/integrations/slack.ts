import { WebClient, LogLevel } from "@slack/web-api";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { slackUserLinks, slackWorkspaces } from "@/db/schema";

export const SLACK_BOT_SCOPES = [
  "channels:manage",
  "channels:read",
  "groups:write",
  "groups:read",
  "chat:write",
  "bookmarks:write",
] as const;

export type SlackWorkspaceSummary = {
  teamId: string;
  teamName: string;
  installedAt: Date;
  /** True when the current Adsomnia user has linked their Slack account for this workspace. */
  userLinked: boolean;
};

export type CreateChannelResult = {
  channelId: string;
  channelName: string;
  channelUrl: string;
  teamId: string;
  teamName: string;
  isPrivate: boolean;
};

function configuredAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  ).replace(/\/$/, "");
}

function getAppCredentials(): {
  clientId: string;
  clientSecret: string;
} | null {
  const clientId = process.env.SLACK_CLIENT_ID?.trim();
  const clientSecret = process.env.SLACK_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret || !configuredAppOrigin()) return null;
  return { clientId, clientSecret };
}

export function getSlackRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/integrations/slack/oauth/callback`;
}

/** Prefer the live request origin in dev so the port and scheme you are on are used. */
export function getSlackRedirectOrigin(request: Request): string {
  const requestOrigin = new URL(request.url).origin;
  if (process.env.NODE_ENV === "development") {
    return requestOrigin;
  }
  return configuredAppOrigin() || requestOrigin;
}

export function isSlackAppConfigured(): boolean {
  return getAppCredentials() !== null;
}

export function getSlackAuthorizeUrl(state: string, redirectUri: string): string {
  const creds = getAppCredentials();
  if (!creds) {
    throw new Error(
      "Slack app is not configured. Set SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, and NEXT_PUBLIC_APP_URL.",
    );
  }

  const params = new URLSearchParams({
    client_id: creds.clientId,
    scope: SLACK_BOT_SCOPES.join(","),
    redirect_uri: redirectUri,
    state,
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export function buildChannelUrl(teamId: string, channelId: string): string {
  return `https://app.slack.com/client/${teamId}/${channelId}`;
}

export function sanitizeChannelName(raw: string): string {
  return raw
    .trim()
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function mapSlackError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "name_taken":
      return "A channel with that name already exists in this Slack workspace.";
    case "invalid_name":
    case "invalid_name_required":
    case "invalid_name_punctuation":
    case "invalid_name_maxlength":
    case "invalid_name_specials":
      return "That channel name is not valid in Slack. Use lowercase letters, numbers, hyphens, and underscores.";
    case "missing_scope":
      return "The Slack app is missing required permissions. Reconnect Slack and approve the requested scopes.";
    case "not_authed":
    case "invalid_auth":
    case "token_revoked":
    case "account_inactive":
      return "Slack authorization expired or was revoked. Reconnect the Slack workspace.";
    case "restricted_action":
    case "is_archived":
      return "Slack blocked this action. Check workspace policies for channel creation.";
    case "ratelimited":
      return "Slack rate-limited the request. Try again in a moment.";
    case "cant_invite":
    case "cant_invite_self":
    case "user_not_found":
      return "Could not invite your Slack account to the channel. Connect Slack again while logged into the correct Slack user.";
    default:
      return fallback;
  }
}

export async function getUserSlackLink(userId: string, teamId: string) {
  const [row] = await db
    .select()
    .from(slackUserLinks)
    .where(
      and(eq(slackUserLinks.userId, userId), eq(slackUserLinks.teamId, teamId)),
    )
    .limit(1);
  return row ?? null;
}

export async function getInstalledWorkspaces(
  adsomniaUserId?: string,
): Promise<SlackWorkspaceSummary[]> {
  const rows = await db
    .select({
      teamId: slackWorkspaces.teamId,
      teamName: slackWorkspaces.teamName,
      installedAt: slackWorkspaces.installedAt,
    })
    .from(slackWorkspaces)
    .orderBy(asc(slackWorkspaces.teamName));

  if (!adsomniaUserId) {
    return rows.map((row) => ({ ...row, userLinked: false }));
  }

  const links = await db
    .select({
      teamId: slackUserLinks.teamId,
    })
    .from(slackUserLinks)
    .where(eq(slackUserLinks.userId, adsomniaUserId));

  const linkedTeams = new Set(links.map((l) => l.teamId));
  return rows.map((row) => ({
    ...row,
    userLinked: linkedTeams.has(row.teamId),
  }));
}

export async function getWorkspace(teamId: string) {
  const [row] = await db
    .select()
    .from(slackWorkspaces)
    .where(eq(slackWorkspaces.teamId, teamId))
    .limit(1);
  return row ?? null;
}

async function upsertUserSlackLink(opts: {
  userId: string;
  teamId: string;
  slackUserId: string;
}) {
  const existing = await getUserSlackLink(opts.userId, opts.teamId);
  if (existing) {
    await db
      .update(slackUserLinks)
      .set({
        slackUserId: opts.slackUserId,
        updatedAt: new Date(),
      })
      .where(eq(slackUserLinks.id, existing.id));
    return;
  }

  await db.insert(slackUserLinks).values({
    userId: opts.userId,
    teamId: opts.teamId,
    slackUserId: opts.slackUserId,
  });
}

/**
 * Completes OAuth: upserts the workspace bot install and links the current
 * Adsomnia user to the Slack user who approved the install.
 */
export async function exchangeOAuthCode(
  code: string,
  adsomniaUserId: string,
  redirectUri: string,
): Promise<SlackWorkspaceSummary> {
  const creds = getAppCredentials();
  if (!creds) {
    throw new Error("Slack app is not configured.");
  }

  const client = new WebClient(undefined, { logLevel: LogLevel.ERROR });
  const result = await client.oauth.v2.access({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  if (!result.ok) {
    throw new Error(
      mapSlackError(
        typeof result.error === "string" ? result.error : undefined,
        "Slack OAuth failed.",
      ),
    );
  }

  const teamId = result.team?.id;
  const teamName = result.team?.name ?? "Slack workspace";
  const botToken = result.access_token;
  const botUserId = result.bot_user_id;
  const slackUserId =
    typeof result.authed_user?.id === "string" ? result.authed_user.id : null;

  if (!teamId || !botToken || !botUserId) {
    throw new Error("Slack OAuth response was missing workspace or bot details.");
  }

  if (!slackUserId) {
    throw new Error(
      "Slack OAuth did not return your Slack user id. Try Connect Slack again.",
    );
  }

  if (result.token_type && result.token_type !== "bot") {
    throw new Error("Expected a Slack bot token from OAuth install.");
  }

  const existing = await getWorkspace(teamId);
  if (existing) {
    await db
      .update(slackWorkspaces)
      .set({
        teamName,
        botToken,
        botUserId,
        installerSlackUserId: slackUserId,
        installedByUserId: adsomniaUserId,
        updatedAt: new Date(),
      })
      .where(eq(slackWorkspaces.teamId, teamId));
  } else {
    await db.insert(slackWorkspaces).values({
      teamId,
      teamName,
      botToken,
      botUserId,
      installerSlackUserId: slackUserId,
      installedByUserId: adsomniaUserId,
    });
  }

  await upsertUserSlackLink({
    userId: adsomniaUserId,
    teamId,
    slackUserId,
  });

  return {
    teamId,
    teamName,
    installedAt: existing?.installedAt ?? new Date(),
    userLinked: true,
  };
}

export async function createChannel(opts: {
  teamId: string;
  name: string;
  isPrivate?: boolean;
  /** Adsomnia user creating the channel — invited via their linked Slack id. */
  adsomniaUserId: string;
}): Promise<CreateChannelResult> {
  const workspace = await getWorkspace(opts.teamId);
  if (!workspace) {
    throw new Error(
      `Slack workspace "${opts.teamId}" is not connected. Connect Slack first.`,
    );
  }

  const userLink = await getUserSlackLink(opts.adsomniaUserId, opts.teamId);
  if (!userLink) {
    throw new Error(
      "Connect your Slack account once before creating channels. Use Connect Slack while logged into the Slack user you want invited.",
    );
  }

  const name = sanitizeChannelName(opts.name);
  if (!name) {
    throw new Error("Channel name is required.");
  }

  const isPrivate = Boolean(opts.isPrivate);
  const client = new WebClient(workspace.botToken, {
    logLevel: LogLevel.ERROR,
  });

  try {
    const result = await client.conversations.create({
      name,
      is_private: isPrivate,
    });

    if (!result.ok || !result.channel?.id) {
      throw new Error(
        mapSlackError(
          typeof result.error === "string" ? result.error : undefined,
          "Failed to create Slack channel.",
        ),
      );
    }

    const channelId = result.channel.id;
    const channelName = result.channel.name ?? name;

    try {
      await client.conversations.invite({
        channel: channelId,
        users: userLink.slackUserId,
      });
    } catch (inviteErr) {
      const code =
        inviteErr && typeof inviteErr === "object" && "data" in inviteErr
          ? (inviteErr as { data?: { error?: string } }).data?.error
          : undefined;
      if (code !== "already_in_channel") {
        if (isPrivate) {
          throw new Error(
            mapSlackError(
              code,
              "Channel was created but you could not be invited. Connect Slack again and retry, or open the channel from the link in Project Setup.",
            ),
          );
        }
        // Public channels remain findable via Browse; invite failure is non-fatal.
      }
    }

    try {
      await client.chat.postMessage({
        channel: channelId,
        text: `Channel created from Adsomnia Workspace for project coordination.`,
      });
    } catch {
      // Welcome post is optional; channel create already succeeded.
    }

    return {
      channelId,
      channelName,
      channelUrl: buildChannelUrl(workspace.teamId, channelId),
      teamId: workspace.teamId,
      teamName: workspace.teamName,
      isPrivate,
    };
  } catch (err) {
    if (err && typeof err === "object" && "data" in err) {
      const data = (err as { data?: { error?: string } }).data;
      throw new Error(
        mapSlackError(data?.error, "Failed to create Slack channel."),
      );
    }
    if (err instanceof Error) throw err;
    throw new Error("Failed to create Slack channel.");
  }
}

export async function getSlackIntegrationStatus(): Promise<{
  configured: boolean;
  appConfigured: boolean;
  workspaces: string[];
}> {
  const workspaces = await getInstalledWorkspaces();
  const appConfigured = isSlackAppConfigured();
  return {
    appConfigured,
    configured: appConfigured && workspaces.length > 0,
    workspaces: workspaces.map((w) => w.teamId),
  };
}
