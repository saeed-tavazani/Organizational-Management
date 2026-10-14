import { and, eq } from "drizzle-orm";
import db from "../../database";
import { integrationTable } from "../../database/schema";
import { toBaleResponse } from "../to-response";

export async function findBaleIntegration(projectId: string) {
  return db.query.integrationTable.findFirst({
    where: and(
      eq(integrationTable.projectId, projectId),
      eq(integrationTable.type, "bale"),
    ),
  });
}

export async function getBaleIntegration(projectId: string) {
  const integration = await findBaleIntegration(projectId);
  return integration ? toBaleResponse(integration) : null;
}
