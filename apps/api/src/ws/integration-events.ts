import { subscribeToEvent } from "../events";
import type { ProjectBroadcastMessage } from "./broadcast-adapter";

export function subscribeBaleIntegrationEvents(
  broadcast: (projectId: string, message: ProjectBroadcastMessage) => void,
) {
  for (const event of [
    "integration.created",
    "integration.updated",
    "integration.deleted",
  ]) {
    void subscribeToEvent<{ projectId: string; integrationType: string }>(
      event,
      async (data) => {
        if (data.integrationType !== "bale" || !data.projectId) return;
        broadcast(data.projectId, {
          type: "BALE_INTEGRATION_UPDATED",
          projectId: data.projectId,
        });
      },
    );
  }
}
