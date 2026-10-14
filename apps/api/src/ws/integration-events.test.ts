import { describe, expect, it, vi } from "vite-plus/test";
import { publishEvent } from "../events";
import { subscribeBaleIntegrationEvents } from "./integration-events";

describe("Bale integration broadcasts", () => {
  it("broadcasts project-only invalidation without forwarding configuration", async () => {
    const broadcast = vi.fn();
    subscribeBaleIntegrationEvents(broadcast);
    for (const event of [
      "integration.created",
      "integration.updated",
      "integration.deleted",
    ]) {
      await publishEvent(
        event,
        {
          projectId: "project",
          integrationType: "bale",
          config: { botToken: "secret" },
        },
        { waitForHandlers: true },
      );
    }
    expect(broadcast).toHaveBeenCalledTimes(3);
    expect(broadcast).toHaveBeenCalledWith("project", {
      type: "BALE_INTEGRATION_UPDATED",
      projectId: "project",
    });
    expect(JSON.stringify(broadcast.mock.calls)).not.toContain("secret");
    await publishEvent(
      "integration.updated",
      { projectId: "project", integrationType: "telegram" },
      { waitForHandlers: true },
    );
    expect(broadcast).toHaveBeenCalledTimes(3);
  });
});
