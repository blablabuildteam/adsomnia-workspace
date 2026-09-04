/** Human labels for activity_log actions — dashboard feed and similar surfaces. */

const ACTION_LABELS: Record<string, string> = {
  idea_submitted: "submitted an initiative",
  idea_updated: "updated initiative details",
  idea_resubmitted: "resubmitted an initiative",
  idea_rejected: "rejected an initiative",
  idea_on_hold: "put an initiative on hold",
  idea_feedback: "sent initiative feedback",
  approved_to_validation: "advanced to Validation",
  converted_to_fast_track: "sent an initiative to Fast-Track",
  stage_advanced: "advanced a phase",
  validation_submitted: "submitted Validation",
  validation_approved: "approved Validation",
  validation_rejected: "rejected Validation",
  validation_feedback: "sent Validation feedback",
  validation_on_hold: "put Validation on hold",
  validation_resubmitted: "resubmitted Validation",
  scoping_submitted: "submitted Scoping",
  scoping_resubmitted: "resubmitted Scoping",
  gonogo_approved: "gave a Go",
  gonogo_rejected: "gave a No-Go",
  gonogo_feedback: "sent Go/No-Go feedback",
  setup_task_completed: "completed a Setup task",
  setup_completed: "finished Project Setup",
  onboarding_task_completed: "completed an Onboarding task",
  onboarding_completed: "finished Onboarding",
  production_priority_updated: "updated production priority",
  production_added_manually: "added a Production project",
};

export function formatActivityLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}
