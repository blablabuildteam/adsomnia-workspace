import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  serial,
  jsonb,
  pgEnum,
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
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("team"),
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
