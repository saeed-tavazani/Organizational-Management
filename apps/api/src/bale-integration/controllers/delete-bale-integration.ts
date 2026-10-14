import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { integrationTable } from "../../database/schema";
import {
  publishBaleIntegrationEvent,
  type BaleMutationActor,
} from "../publish-integration-event";
import { findBaleIntegration } from "./get-bale-integration";

export async function deleteBaleIntegration(
  projectId: string,
  actor: BaleMutationActor,
) {
  const existing = await findBaleIntegration(projectId);
  if (!existing)
    throw new HTTPException(404, { message: "Bale integration not found" });
  await db.delete(integrationTable).where(eq(integrationTable.id, existing.id));
  publishBaleIntegrationEvent("integration.deleted", existing, actor);
  return { success: true };
}
