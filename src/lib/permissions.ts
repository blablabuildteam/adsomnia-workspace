/**
 * Workspace RBAC.
 *
 * - `leadership` — LOGIN_* admin emails (Sietse, Oleg, Jasper, Coen, plus
 *   Godai aliases sietse@godai.nl / jesper@godai.nl and seeded blablabuild
 *   admins). Approve, hold, set up projects, run onboarding.
 * - `team` — every other allowed-domain account (Adsomnia, Godai, blablabuild).
 *   Submit initiatives, follow only their own items through later phases, and
 *   edit their own details while the item is still in Initiative or Validation.
 * - `production` — reserved; treated as team for write access today.
 * - Product Feedback inbox and the user directory are leadership-only.
 */

export type WorkspaceRole = "leadership" | "production" | "team";

export type PermissionUser = {
  id: string;
  role: WorkspaceRole;
};

export type InitiativeAccess = {
  submitterId: string;
  currentStage: string;
  status: string;
};

const EARLY_EDIT_STAGES = new Set(["idea", "validation"]);

export function isLeadership(user: PermissionUser): boolean {
  return user.role === "leadership";
}

export function isCreator(
  user: PermissionUser,
  initiative: Pick<InitiativeAccess, "submitterId">,
): boolean {
  return user.id === initiative.submitterId;
}

function isCreatorOrLeadership(
  user: PermissionUser,
  initiative: Pick<InitiativeAccess, "submitterId">,
): boolean {
  return isCreator(user, initiative) || isLeadership(user);
}

/** Leadership sees every workstream; team members see only what they submitted. */
export function canViewInitiative(
  user: PermissionUser,
  initiative: Pick<InitiativeAccess, "submitterId">,
): boolean {
  return isCreatorOrLeadership(user, initiative);
}

/** Any signed-in workspace account can file a new initiative. */
export function canSubmitInitiative(user: PermissionUser | null): boolean {
  return user != null;
}

/** Leadership admins who can approve, reject, or hold. */
export function canApprove(user: PermissionUser): boolean {
  return isLeadership(user);
}

/** Leadership — Project Setup checklist and integrations. */
export function canManageSetup(user: PermissionUser): boolean {
  return isLeadership(user);
}

/** Leadership — Onboarding & Kickoff session. */
export function canManageOnboarding(user: PermissionUser): boolean {
  return isLeadership(user);
}

/** Leadership — change consensus priority on a Production project. */
export function canAdjustProductionPriority(user: PermissionUser): boolean {
  return isLeadership(user);
}

/** Leadership — add a project directly on the Production overview. */
export function canAddProductionProject(user: PermissionUser): boolean {
  return isLeadership(user);
}

/** Leadership — add a task directly on the Fast Track overview. */
export function canAddFastTrack(user: PermissionUser): boolean {
  return isLeadership(user);
}

/** Leadership — Jira API token rotation reminder. */
export function canSeeJiraTokenReminder(user: PermissionUser): boolean {
  return isLeadership(user);
}

/** Leadership — live Production report for weekly updates. */
export function canViewLeadershipReport(user: PermissionUser): boolean {
  return isLeadership(user);
}

const BLABLABUILD_DOMAIN = "blablabuild.com";

/** Dev/test prefill (flask button) — Adsomnia leadership + Xennith only. */
const FORM_PREFILL_DEFAULT_EMAILS = [
  "sietse@adsomnia.com",
  "sietse@godai.nl",
  "oleg@adsomnia.com",
  "jasper@adsomnia.com",
  "jesper@godai.nl",
  "coen@adsomnia.com",
  "xennith@blablabuild.com",
] as const;

const FORM_PREFILL_EMAIL_ENV_KEYS = [
  "LOGIN_SIETSE_EMAIL",
  "LOGIN_OLEG_EMAIL",
  "LOGIN_JASPER_EMAIL",
  "LOGIN_COEN_EMAIL",
  "LOGIN_XENNITH_EMAIL",
] as const;

function parseCommaSeparatedEmails(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

/** Emails allowed to see form prefill in Initiative / Validation / Scoping. */
export function getFormPrefillEmails(): string[] {
  const emails = new Set<string>(FORM_PREFILL_DEFAULT_EMAILS);
  for (const key of FORM_PREFILL_EMAIL_ENV_KEYS) {
    const value = process.env[key];
    if (!value) continue;
    for (const email of parseCommaSeparatedEmails(value)) {
      emails.add(email);
    }
  }
  return [...emails];
}

export function canUseFormPrefill(
  user: { email: string } | null | undefined,
): boolean {
  if (!user?.email) return false;
  const normalized = user.email.toLowerCase().trim();
  if (!normalized) return false;
  return getFormPrefillEmails().includes(normalized);
}

/** Party is not stored on users — blablabuild is the email domain. */
export function isBlablabuildAccount(user: { email: string }): boolean {
  const at = user.email.lastIndexOf("@");
  if (at === -1) return false;
  return user.email.slice(at + 1).toLowerCase() === BLABLABUILD_DOMAIN;
}

/** Any signed-in workspace account can file a product issue. */
export function canSubmitProductFeedback(user: PermissionUser | null): boolean {
  return user != null;
}

/** Feedback inbox is leadership-only. */
export function canViewFeedbackInbox(user: PermissionUser | null): boolean {
  return user != null && isLeadership(user);
}

/** Registered-user directory is leadership-only. */
export function canViewUserDirectory(user: PermissionUser | null): boolean {
  return user != null && isLeadership(user);
}

/**
 * Creator or leadership may change the original initiative fields while the
 * item is still in Initiative or Validation. Rejected items: creator only.
 */
export function canEditIdeaDetails(
  user: PermissionUser,
  initiative: InitiativeAccess,
): boolean {
  if (!EARLY_EDIT_STAGES.has(initiative.currentStage)) return false;
  if (initiative.status === "rejected") return isCreator(user, initiative);
  return isCreatorOrLeadership(user, initiative);
}

/**
 * Creator or leadership may change the business case while in Validation.
 * Rejected items: creator only.
 */
export function canEditValidation(
  user: PermissionUser,
  initiative: InitiativeAccess,
): boolean {
  if (initiative.currentStage !== "validation") return false;
  if (initiative.status === "rejected") return isCreator(user, initiative);
  return isCreatorOrLeadership(user, initiative);
}

export function canResubmitIdea(
  user: PermissionUser,
  initiative: InitiativeAccess,
): boolean {
  if (initiative.currentStage !== "idea") return false;
  if (initiative.status === "rejected") return isCreator(user, initiative);
  if (initiative.status === "draft" || initiative.status === "on-hold") {
    return isCreatorOrLeadership(user, initiative);
  }
  return false;
}

export function canResubmitValidation(
  user: PermissionUser,
  initiative: InitiativeAccess,
): boolean {
  if (initiative.currentStage !== "validation") return false;
  if (initiative.status === "rejected") return isCreator(user, initiative);
  if (initiative.status === "draft" || initiative.status === "on-hold") {
    return isCreatorOrLeadership(user, initiative);
  }
  return false;
}

/**
 * Scoping is a production-planning phase. Creator or leadership may draft it;
 * other team members can only view.
 */
export function canEditScoping(
  user: PermissionUser,
  initiative: InitiativeAccess,
): boolean {
  const inScoping = initiative.currentStage === "scoping";
  const goNoGoFeedback =
    initiative.currentStage === "go-nogo" &&
    (initiative.status === "draft" || initiative.status === "on-hold");
  if (!inScoping && !goNoGoFeedback) return false;
  return isCreatorOrLeadership(user, initiative);
}

export function canResubmitScoping(
  user: PermissionUser,
  initiative: InitiativeAccess,
): boolean {
  if (
    initiative.currentStage !== "go-nogo" &&
    initiative.currentStage !== "scoping"
  ) {
    return false;
  }
  if (initiative.status !== "draft" && initiative.status !== "on-hold") {
    return false;
  }
  return isCreatorOrLeadership(user, initiative);
}

export function roleLabel(role: string): string {
  if (role === "leadership") return "Leadership";
  if (role === "production") return "Production";
  return "Team";
}
