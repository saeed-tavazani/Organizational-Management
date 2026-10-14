import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { integrationTable } from "../../database/schema";
import type { z } from "../../openapi";
import { parseBaleConfig, patchBaleConfig } from "../config";
import {
  publishBaleIntegrationEvent,
  type BaleMutationActor,
} from "../publish-integration-event";
import type { updateBaleBody } from "../schema";
import { toBaleResponse } from "../to-response";
import { findBaleIntegration } from "./get-bale-integration";

export async function updateBaleIntegration(
  projectId: string,
  body: z.infer<typeof updateBaleBody>,
  actor: BaleMutationActor,
) {
  const existing = await findBaleIntegration(projectId);
  if (!existing)
    throw new HTTPException(404, { message: "Bale integration not found" });
  const current = parseBaleConfig(existing.config);
  const config = JSON.stringify(patchBaleConfig(current, body));
  const isActive = body.isActive ?? existing.isActive ?? true;
  if (
    config === JSON.stringify(current) &&
    isActive === (existing.isActive ?? true)
  )
    return toBaleResponse(existing);
  const [integration] = await db
    .update(integrationTable)
    .set({ config, isActive, updatedAt: new Date() })
    .where(eq(integrationTable.id, existing.id))
    .returning();
  if (!integration)
    throw new HTTPException(404, { message: "Bale integration not found" });
  publishBaleIntegrationEvent("integration.updated", integration, actor);
  return toBaleResponse(integration);
}
