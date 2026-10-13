import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import {
  projectTable,
  workspaceTable,
  workspaceUserTable,
} from "../database/schema";
import { projectAccessCondition } from "../project-access/project-access-condition";
import type { DbOrTx } from "../project-access/db-or-tx";

export async function attendanceProjects(
  userId: string,
  database: DbOrTx = db,
) {
  return database
    .select({
      id: projectTable.id,
      name: projectTable.name,
      workspaceId: workspaceTable.id,
      workspaceName: workspaceTable.name,
    })
    .from(projectTable)
    .innerJoin(workspaceTable, eq(workspaceTable.id, projectTable.workspaceId))
    .innerJoin(
      workspaceUserTable,
      and(
        eq(workspaceUserTable.workspaceId, workspaceTable.id),
        eq(workspaceUserTable.userId, userId),
      ),
    )
    .where(
      and(
        isNull(projectTable.archivedAt),
        projectAccessCondition(userId, projectTable.id),
      ),
    )
    .orderBy(workspaceTable.name, projectTable.name);
}

export async function attendanceProject(
  userId: string,
  projectId: string,
  database: DbOrTx,
) {
  const project = (await attendanceProjects(userId, database)).find(
    (p) => p.id === projectId,
  );
  if (!project)
    throw new HTTPException(403, { message: "No membership in this project" });
  return {
    projectId: project.id,
    projectName: project.name,
    workspaceId: project.workspaceId,
    workspaceName: project.workspaceName,
  };
}
