import { eq } from "drizzle-orm";
import db from "../database";
import { attendanceEntryTable } from "../database/schema";
import { attendanceAccess } from "./access";
import { attendanceProjects } from "./projects";
export async function reportProjects(userId: string) {
  const access = await attendanceAccess(userId);
  const history = await db
    .selectDistinct({
      id: attendanceEntryTable.projectId,
      name: attendanceEntryTable.projectName,
      workspaceId: attendanceEntryTable.workspaceId,
      workspaceName: attendanceEntryTable.workspaceName,
    })
    .from(attendanceEntryTable)
    .where(
      access.permissions.includes("reports")
        ? undefined
        : eq(attendanceEntryTable.userId, userId),
    );
  const current = await attendanceProjects(userId);
  const projects = new Map([...history, ...current].map((p) => [p.id, p]));
  return [...projects.values()].sort(
    (a, b) =>
      a.workspaceName.localeCompare(b.workspaceName) ||
      a.name.localeCompare(b.name),
  );
}
