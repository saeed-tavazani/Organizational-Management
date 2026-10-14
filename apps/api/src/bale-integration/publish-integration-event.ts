import { publishEvent } from "../events";

export type BaleMutationActor = { userId: string; apiKeyId?: string };

export function publishBaleIntegrationEvent(
  event: "integration.created" | "integration.updated" | "integration.deleted",
  integration: { id: string; projectId: string },
  actor: BaleMutationActor,
) {
  void publishEvent(event, {
    projectId: integration.projectId,
    integrationId: integration.id,
    integrationType: "bale",
    ...actor,
  }).catch(() =>
    console.error("Failed to publish Bale integration event", {
      event,
      projectId: integration.projectId,
    }),
  );
}
