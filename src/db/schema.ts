import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  serial,
  jsonb,
  boolean,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "leadership",
  "production",
  "team",
]);

export const stageEnum = pgEnum("initiative_stage", [
  "idea",
  "validation",
  "scoping",
  "go-nogo",
  "setup",
  "onboarding",
  "production",
]);

export const statusEnum = pgEnum("initiative_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "on-hold",
]);

export const decisionEnum = pgEnum("approval_decision", [
  "approved",
  "rejected",
  "on-hold",
  "feedback",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 120 }),
  lastName: varchar("last_name", { length: 120 }),
  jobTitle: varchar("job_title", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("team"),
  profileCompletedAt: timestamp("profile_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const initiatives = pgTable("initiatives", {
  id: serial("id").primaryKey(),
  ticketId: varchar("ticket_id", { length: 20 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  problemStatement: text("problem_statement"),
  opportunitySolution: text("opportunity_solution"),
  expectedImpact: text("expected_impact"),
  targetAudience: varchar("target_audience", { length: 500 }),
  submitterId: uuid("submitter_id")
    .notNull()
    .references(() => users.id),
  sponsorId: uuid("sponsor_id")
    .notNull()
    .references(() => users.id),
  validationData: jsonb("validation_data"),
  scopingData: jsonb("scoping_data"),
  setupData: jsonb("setup_data"),
  onboardingData: jsonb("onboarding_data"),
  currentStage: stageEnum("current_stage").notNull().default("idea"),
  status: statusEnum("status").notNull().default("draft"),
  /** Leadership sent this off the pipeline onto the Fast Track Jira board. */
  isFastTrack: boolean("is_fast_track").notNull().default(false),
  fastTrackJiraKey: varchar("fast_track_jira_key", { length: 32 }),
  fastTrackJiraUrl: varchar("fast_track_jira_url", { length: 500 }),
  /** Set when a Production workstream is archived off the active board. */
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const approvals = pgTable("approvals", {
  id: serial("id").primaryKey(),
  initiativeId: serial("initiative_id")
    .notNull()
    .references(() => initiatives.id),
  approverId: uuid("approver_id")
    .notNull()
    .references(() => users.id),
  fromStage: varchar("from_stage", { length: 50 }).notNull(),
  toStage: varchar("to_stage", { length: 50 }),
  decision: decisionEnum("decision").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  initiativeId: serial("initiative_id")
    .notNull()
    .references(() => initiatives.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  initiativeId: serial("initiative_id")
    .notNull()
    .references(() => initiatives.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Installed Slack workspaces (distributable app OAuth installs). */
export const slackWorkspaces = pgTable("slack_workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: varchar("team_id", { length: 64 }).notNull().unique(),
  teamName: varchar("team_name", { length: 255 }).notNull(),
  botToken: text("bot_token").notNull(),
  botUserId: varchar("bot_user_id", { length: 64 }).notNull(),
  /** Slack user id of the person who installed the app (for invites). */
  installerSlackUserId: varchar("installer_slack_user_id", { length: 64 }),
  installedByUserId: uuid("installed_by_user_id")
    .notNull()
    .references(() => users.id),
  installedAt: timestamp("installed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Links an Adsomnia user to their Slack user id within a connected workspace.
 * Each Setup user who creates channels Connects Slack once; we invite that
 * Slack user on channel create.
 */
export const slackUserLinks = pgTable(
  "slack_user_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    teamId: varchar("team_id", { length: 64 }).notNull(),
    slackUserId: varchar("slack_user_id", { length: 64 }).notNull(),
    linkedAt: timestamp("linked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userTeamUnique: unique("slack_user_links_user_team_unique").on(
      table.userId,
      table.teamId,
    ),
  }),
);
