import db from "../../database";
import { HTTPException } from "hono/http-exception";
import { integrationTable } from "../../database/schema";
import type { z } from "../../openapi";
import { normalizeBaleConfig } from "../../plugins/bale/config";
import {
  publishBaleIntegrationEvent,
  type BaleMutationActor,
} from "../publish-integration-event";
import type { createBaleBody } from "../schema";
import { toBaleResponse } from "../to-response";
import { findBaleIntegration } from "./get-bale-integration";

export async function createBaleIntegration(
  projectId: string,
  body: z.infer<typeof createBaleBody>,
  actor: BaleMutationActor,
) {
  const existing = await findBaleIntegration(projectId);
  const config = JSON.stringify(normalizeBaleConfig(body));
  const [integration] = await db
    .insert(integrationTable)
    .values({ projectId, type: "bale", config, isActive: true })
    .onConflictDoUpdate({
      target: [integrationTable.projectId, integrationTable.type],
      set: { config, updatedAt: new Date() },
    })
    .returning();
  if (!integration)
    throw new HTTPException(500, {
      message: "Failed to save Bale integration",
    });
  publishBaleIntegrationEvent(
    existing ? "integration.updated" : "integration.created",
    integration,
    actor,
  );
  return toBaleResponse(integration);
}
