/**
 * Workspace RBAC.
 *
 * - `leadership` — LOGIN_* admin emails (Sietse, Oleg, Jasper, Coen, plus
 *   seeded blablabuild admins). Approve, hold, set up projects, run onboarding.
 * - `team` — every other allowed-domain account (typically @adsomnia.com).
 *   Submit initiatives, follow them through later phases, and edit their own
 *   details while the item is still in Initiative or Validation.
 * - `production` — reserved; treated as team for write access today.
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
