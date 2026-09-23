import { WebClient, LogLevel } from "@slack/web-api";
import type { KnownBlock } from "@slack/types";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { slackUserLinks, slackWorkspaces } from "@/db/schema";

export const SLACK_BOT_SCOPES = [
  "channels:manage",
  "channels:read",
  "channels:join",
  "groups:write",
  "groups:read",
  "chat:write",
  "bookmarks:write",
  "im:write",
  "users:read",
  "users:read.email",
] as const;

export type SlackWorkspaceSummary = {
  teamId: string;
  teamName: string;
  installedAt: Date;
  /** True when the current Adsomnia user has linked their Slack account for this workspace. */
  userLinked: boolean;
};

export type SlackChannelBookmark = {
  title: string;
  link: string;
  emoji?: string;
};

export type SlackChannelWelcome = {
  ticketId: string;
  title: string;
  summary?: string | null;
  workstreamUrl?: string | null;
  driveUrl?: string | null;
  jiraUrl?: string | null;
};

export type CreateChannelResult = {
  channelId: string;
  channelName: string;
  channelUrl: string;
  teamId: string;
  teamName: string;
  isPrivate: boolean;
  bookmarkError?: string;
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
    case "is_archived":
      return "That Slack channel is archived.";
    case "channel_not_found":
      return "That Slack channel was not found in this workspace.";
    case "not_in_channel":
    case "method_not_supported_for_channel_type":
      return "The Slack app is not in this private channel. Add the app to the channel in Slack, then try again.";
    case "restricted_action":
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

  const visible = rows.filter((row) => isProjectSlackWorkspace(row.teamName));

  if (!adsomniaUserId) {
    return visible.map((row) => ({ ...row, userLinked: false }));
  }

  const links = await db
    .select({
      teamId: slackUserLinks.teamId,
    })
    .from(slackUserLinks)
    .where(eq(slackUserLinks.userId, adsomniaUserId));

  const linkedTeams = new Set(links.map((l) => l.teamId));
  return visible.map((row) => ({
    ...row,
    userLinked: linkedTeams.has(row.teamId),
  }));
}

/** blablabuild stays connected for bot DMs; it is not a project-channel workspace. */
export function isProjectSlackWorkspace(teamName: string): boolean {
  const normalized = teamName.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return normalized !== "blablabuild";
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

function escapeMrkdwn(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function truncateWelcome(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function buildWelcomeMessage(welcome: SlackChannelWelcome): {
  text: string;
  blocks: KnownBlock[];
} {
  const heading = truncateWelcome(
    `${welcome.ticketId} — ${welcome.title}`,
    150,
  );
  const summary = welcome.summary?.trim()
    ? truncateWelcome(welcome.summary, 500)
    : null;

  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: heading, emoji: false },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `This is the project channel for *${escapeMrkdwn(welcome.ticketId)} — ${escapeMrkdwn(welcome.title)}*.\nPlease read the workstream briefing before kickoff so everyone is aligned.`,
      },
    },
  ];

  if (summary) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Quick summary*\n>${escapeMrkdwn(summary)}`,
      },
    });
  }

  const buttons: Array<{
    type: "button";
    text: { type: "plain_text"; text: string };
    url: string;
  }> = [];
  if (welcome.workstreamUrl) {
    buttons.push({
      type: "button",
      text: { type: "plain_text", text: `Open ${welcome.ticketId}` },
      url: welcome.workstreamUrl,
    });
  }
  if (welcome.driveUrl) {
    buttons.push({
      type: "button",
      text: { type: "plain_text", text: "Google Drive" },
      url: welcome.driveUrl,
    });
  }
  if (welcome.jiraUrl) {
    buttons.push({
      type: "button",
      text: { type: "plain_text", text: "Jira" },
      url: welcome.jiraUrl,
    });
  }
  if (buttons.length > 0) {
    blocks.push({ type: "actions", elements: buttons });
  }

  const links = [
    welcome.workstreamUrl
      ? `${welcome.ticketId}: ${welcome.workstreamUrl}`
      : null,
    welcome.driveUrl ? `Google Drive: ${welcome.driveUrl}` : null,
    welcome.jiraUrl ? `Jira: ${welcome.jiraUrl}` : null,
  ].filter(Boolean);
  const text = [
    heading,
    "Please read the workstream briefing before kickoff so everyone is aligned.",
    summary,
    ...links,
  ]
    .filter(Boolean)
    .join(" ");

  return { text, blocks };
}

async function addChannelBookmarks(
  client: WebClient,
  channelId: string,
  bookmarks: SlackChannelBookmark[],
): Promise<string | undefined> {
  const failed: string[] = [];
  let missingScope = false;

  for (const bookmark of bookmarks) {
    try {
      const result = (await client.apiCall("bookmarks.add", {
        channel_id: channelId,
        title: bookmark.title,
        type: "link",
        link: bookmark.link,
        ...(bookmark.emoji ? { emoji: bookmark.emoji } : {}),
      })) as { ok?: boolean; error?: string };
      if (!result.ok) {
        if (result.error === "missing_scope") missingScope = true;
        failed.push(bookmark.title);
      }
    } catch (err) {
      const code =
        err && typeof err === "object" && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : undefined;
      if (code === "missing_scope") missingScope = true;
      failed.push(bookmark.title);
    }
  }

  if (failed.length === 0) return undefined;
  if (missingScope) {
    return "Slack channel saved, but bookmarks need a Slack reconnect (bookmarks:write).";
  }
  return `Slack channel saved, but could not bookmark ${failed.join(" and ")}.`;
}

export type SlackChannelSummary = {
  id: string;
  name: string;
  isPrivate: boolean;
  /** True when the bot is already a member. Private channels only appear when this is true. */
  isMember: boolean;
};

const CHANNEL_LIST_CACHE_MS = 60_000;
const CHANNEL_LIST_PAGE_SIZE = 200;
const CHANNEL_LIST_MAX_PAGES = 20;
const CHANNEL_LIST_RESULT_LIMIT = 40;

const channelListCache = new Map<
  string,
  { at: number; channels: SlackChannelSummary[]; truncated: boolean }
>();

function slackErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "data" in err) {
    const code = (err as { data?: { error?: string } }).data?.error;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

async function requireProjectWorkspace(teamId: string) {
  const workspace = await getWorkspace(teamId);
  if (!workspace) {
    throw new Error(
      `Slack workspace "${teamId}" is not connected. Connect Slack first.`,
    );
  }
  if (!isProjectSlackWorkspace(workspace.teamName)) {
    throw new Error(
      "Choose the Adsomnia or client Slack workspace — not blablabuild.",
    );
  }
  return workspace;
}

async function requireLinkedSlackUser(adsomniaUserId: string, teamId: string) {
  const userLink = await getUserSlackLink(adsomniaUserId, teamId);
  if (!userLink) {
    throw new Error(
      "Connect your Slack account once before creating channels. Use Connect Slack while logged into the Slack user you want invited.",
    );
  }
  return userLink;
}

function workspaceClient(botToken: string) {
  return new WebClient(botToken, { logLevel: LogLevel.ERROR });
}

async function inviteLinkedUser(
  client: WebClient,
  channelId: string,
  slackUserId: string,
  isPrivate: boolean,
  privateFailureMessage: string,
) {
  try {
    await client.conversations.invite({
      channel: channelId,
      users: slackUserId,
    });
  } catch (inviteErr) {
    const code = slackErrorCode(inviteErr);
    if (code === "already_in_channel") return;
    if (isPrivate) {
      throw new Error(mapSlackError(code, privateFailureMessage));
    }
  }
}

async function announceInChannel(
  client: WebClient,
  channelId: string,
  bookmarks?: SlackChannelBookmark[],
  welcome?: SlackChannelWelcome,
  fallbackText = "Channel created from Adsomnia Workspace for project coordination.",
): Promise<string | undefined> {
  try {
    const message = welcome
      ? buildWelcomeMessage(welcome)
      : {
          text: fallbackText,
          blocks: undefined,
        };
    await client.chat.postMessage({
      channel: channelId,
      text: message.text,
      ...(message.blocks ? { blocks: message.blocks } : {}),
      unfurl_links: false,
      unfurl_media: false,
    });
  } catch {
    // Welcome post is optional; the channel link already succeeded.
  }

  if (!bookmarks || bookmarks.length === 0) return undefined;
  return addChannelBookmarks(client, channelId, bookmarks);
}

async function loadWorkspaceChannels(teamId: string): Promise<{
  channels: SlackChannelSummary[];
  truncated: boolean;
}> {
  const cached = channelListCache.get(teamId);
  if (cached && Date.now() - cached.at < CHANNEL_LIST_CACHE_MS) {
    return { channels: cached.channels, truncated: cached.truncated };
  }

  const workspace = await requireProjectWorkspace(teamId);
  const client = workspaceClient(workspace.botToken);
  const channels: SlackChannelSummary[] = [];
  let cursor: string | undefined;
  let truncated = false;

  for (let page = 0; page < CHANNEL_LIST_MAX_PAGES; page += 1) {
    let result;
    try {
      result = await client.conversations.list({
        types: "public_channel,private_channel",
        exclude_archived: true,
        limit: CHANNEL_LIST_PAGE_SIZE,
        cursor,
      });
    } catch (err) {
      throw new Error(
        mapSlackError(
          slackErrorCode(err),
          "Could not load Slack channels. Reconnect Slack if this workspace was connected before channel listing was added.",
        ),
      );
    }

    if (!result.ok) {
      throw new Error(
        mapSlackError(
          typeof result.error === "string" ? result.error : undefined,
          "Could not load Slack channels.",
        ),
      );
    }

    for (const channel of result.channels ?? []) {
      if (!channel.id || !channel.name || channel.is_archived) continue;
      if (channel.is_im || channel.is_mpim) continue;
      channels.push({
        id: channel.id,
        name: channel.name,
        isPrivate: Boolean(channel.is_private),
        isMember: Boolean(channel.is_member),
      });
    }

    cursor = result.response_metadata?.next_cursor || undefined;
    if (!cursor) break;
    if (page === CHANNEL_LIST_MAX_PAGES - 1) truncated = true;
  }

  channels.sort((a, b) => a.name.localeCompare(b.name));
  channelListCache.set(teamId, {
    at: Date.now(),
    channels,
    truncated,
  });
  return { channels, truncated };
}

export async function listChannels(opts: {
  teamId: string;
  query?: string;
  /** Skip the short cache so a channel the app just joined can appear. */
  fresh?: boolean;
}): Promise<{ channels: SlackChannelSummary[]; truncated: boolean }> {
  if (opts.fresh) channelListCache.delete(opts.teamId);
  const { channels, truncated } = await loadWorkspaceChannels(opts.teamId);
  const query = (opts.query ?? "")
    .trim()
    .replace(/^#/, "")
    .toLowerCase();
  const matched = query
    ? channels.filter((channel) => channel.name.toLowerCase().includes(query))
    : channels;
  return {
    channels: matched.slice(0, CHANNEL_LIST_RESULT_LIMIT),
    truncated,
  };
}

export async function connectExistingChannel(opts: {
  teamId: string;
  channelId: string;
  /** Adsomnia user connecting the channel — invited via their linked Slack id. */
  adsomniaUserId: string;
  bookmarks?: SlackChannelBookmark[];
  welcome?: SlackChannelWelcome;
}): Promise<CreateChannelResult> {
  const channelId = opts.channelId.trim();
  if (!/^[CG][A-Z0-9]+$/.test(channelId)) {
    throw new Error("Choose a Slack channel from the list.");
  }

  const workspace = await requireProjectWorkspace(opts.teamId);
  const userLink = await requireLinkedSlackUser(
    opts.adsomniaUserId,
    opts.teamId,
  );
  const client = workspaceClient(workspace.botToken);

  let info;
  try {
    info = await client.conversations.info({ channel: channelId });
  } catch (err) {
    throw new Error(
      mapSlackError(
        slackErrorCode(err),
        "Could not read that Slack channel.",
      ),
    );
  }

  const channel = info.channel;
  if (!info.ok || !channel?.id || !channel.name) {
    throw new Error(
      mapSlackError(
        typeof info.error === "string" ? info.error : undefined,
        "Could not read that Slack channel.",
      ),
    );
  }
  if (channel.is_archived) {
    throw new Error("That Slack channel is archived.");
  }
  if (channel.is_im || channel.is_mpim) {
    throw new Error("Choose a Slack channel, not a direct message.");
  }

  const isPrivate = Boolean(channel.is_private);
  if (!channel.is_member) {
    if (isPrivate) {
      throw new Error(
        "The Slack app is not in this private channel. Add the app to the channel in Slack, then try again.",
      );
    }
    try {
      await client.conversations.join({ channel: channel.id });
    } catch (err) {
      const code = slackErrorCode(err);
      if (code !== "already_in_channel") {
        throw new Error(
          mapSlackError(
            code,
            "Could not join this Slack channel. Reconnect Slack so the app can join existing channels.",
          ),
        );
      }
    }
  }

  await inviteLinkedUser(
    client,
    channel.id,
    userLink.slackUserId,
    isPrivate,
    "Could not invite your Slack account to this private channel. Connect Slack again and retry.",
  );
  const bookmarkError = await announceInChannel(
    client,
    channel.id,
    opts.bookmarks,
    opts.welcome,
  );

  return {
    channelId: channel.id,
    channelName: channel.name,
    channelUrl: buildChannelUrl(workspace.teamId, channel.id),
    teamId: workspace.teamId,
    teamName: workspace.teamName,
    isPrivate,
    bookmarkError,
  };
}

export async function createChannel(opts: {
  teamId: string;
  name: string;
  isPrivate?: boolean;
  /** Adsomnia user creating the channel — invited via their linked Slack id. */
  adsomniaUserId: string;
  bookmarks?: SlackChannelBookmark[];
  welcome?: SlackChannelWelcome;
}): Promise<CreateChannelResult> {
  const workspace = await requireProjectWorkspace(opts.teamId);
  const userLink = await requireLinkedSlackUser(
    opts.adsomniaUserId,
    opts.teamId,
  );

  const name = sanitizeChannelName(opts.name);
  if (!name) {
    throw new Error("Channel name is required.");
  }

  const isPrivate = Boolean(opts.isPrivate);
  const client = workspaceClient(workspace.botToken);

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

    await inviteLinkedUser(
      client,
      channelId,
      userLink.slackUserId,
      isPrivate,
      "Channel was created but you could not be invited. Connect Slack again and retry, or open the channel from the link in Project Setup.",
    );
    const bookmarkError = await announceInChannel(
      client,
      channelId,
      opts.bookmarks,
      opts.welcome,
    );

    return {
      channelId,
      channelName,
      channelUrl: buildChannelUrl(workspace.teamId, channelId),
      teamId: workspace.teamId,
      teamName: workspace.teamName,
      isPrivate,
      bookmarkError,
    };
  } catch (err) {
    const code = slackErrorCode(err);
    if (code) {
      throw new Error(mapSlackError(code, "Failed to create Slack channel."));
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
