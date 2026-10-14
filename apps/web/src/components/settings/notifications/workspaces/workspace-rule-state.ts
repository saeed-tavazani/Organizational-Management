import type { NotificationPreferenceWorkspaceRule } from "@/fetchers/notification-preferences/get-notification-preferences";
import type { UpsertNotificationWorkspaceRuleRequest } from "@/fetchers/notification-preferences/upsert-notification-workspace-rule";
import type {
  ChannelAvailabilityMap,
  NotificationChannelId,
} from "../notification-channels";

export type WorkspaceRule = Pick<
  NotificationPreferenceWorkspaceRule,
  | "isActive"
  | "baleEnabled"
  | "emailEnabled"
  | "gotifyEnabled"
  | "ntfyEnabled"
  | "webhookEnabled"
  | "projectMode"
  | "selectedProjectIds"
>;

export type WorkspaceRuleState = WorkspaceRule;

export const RULE_CHANNEL_KEYS = {
  email: "emailEnabled",
  bale: "baleEnabled",
  gotify: "gotifyEnabled",
  ntfy: "ntfyEnabled",
  webhook: "webhookEnabled",
} as const satisfies Record<NotificationChannelId, keyof WorkspaceRule>;

export function createWorkspaceRuleState(
  rule: WorkspaceRule | undefined,
  availability: ChannelAvailabilityMap,
): WorkspaceRuleState {
  if (rule) {
    return {
      isActive: rule.isActive,
      baleEnabled: rule.baleEnabled ?? false,
      emailEnabled: rule.emailEnabled,
      gotifyEnabled: rule.gotifyEnabled,
      ntfyEnabled: rule.ntfyEnabled,
      webhookEnabled: rule.webhookEnabled,
      projectMode: rule.projectMode,
      selectedProjectIds: rule.selectedProjectIds,
    };
  }

  return {
    isActive: true,
    baleEnabled: availability.bale === "available",
    emailEnabled: availability.email === "available",
    gotifyEnabled: availability.gotify === "available",
    ntfyEnabled: availability.ntfy === "available",
    webhookEnabled: availability.webhook === "available",
    projectMode: "all",
    selectedProjectIds: [],
  };
}

export function toWorkspaceRuleRequest(
  state: WorkspaceRuleState,
  availability: ChannelAvailabilityMap,
): UpsertNotificationWorkspaceRuleRequest {
  return {
    isActive: state.isActive,
    baleEnabled: Boolean(
      state.baleEnabled && availability.bale === "available",
    ),
    emailEnabled: state.emailEnabled && availability.email === "available",
    gotifyEnabled: state.gotifyEnabled && availability.gotify === "available",
    ntfyEnabled: state.ntfyEnabled && availability.ntfy === "available",
    webhookEnabled:
      state.webhookEnabled && availability.webhook === "available",
    projectMode: state.projectMode,
    selectedProjectIds: state.selectedProjectIds,
  };
}
