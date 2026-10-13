import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  attendanceEntryTable,
  attendanceRateTable,
  attendanceRequestTable,
  userTable,
} from "../../database/schema";
import { attendanceSettings, currentRate, requireAttendance } from "../access";
import { attendanceAudit } from "../audit";
import { attendanceChanged } from "../events";
import { lockAttendance } from "../lock";
import { assertNoLeaveOverlap, assertNoWorkOverlap } from "../overlap";
import { attendanceProject } from "../projects";
import { requestPermission } from "./permission";

export async function decideAttendanceRequest(
  actorId: string,
  id: string,
  decision: "approved" | "rejected" | "cancelled",
) {
  const result = await db.transaction(async (tx) => {
    const [initial] = await tx
      .select()
      .from(attendanceRequestTable)
      .where(eq(attendanceRequestTable.id, id));
    if (!initial)
      throw new HTTPException(404, { message: "Request not found" });
    await lockAttendance(tx, initial.userId);
    const [request] = await tx
      .select()
      .from(attendanceRequestTable)
      .where(eq(attendanceRequestTable.id, id))
      .for("update");
    if (!request || request.status !== "pending")
      throw new HTTPException(409, { message: "Request already decided" });
    if (decision === "cancelled") {
      if (actorId !== request.userId)
        throw new HTTPException(403, {
          message: "Only the requester can cancel a pending request",
        });
    } else {
      if (actorId === request.userId)
        throw new HTTPException(403, {
          message: "You cannot decide your own request",
        });
      await requireAttendance(actorId, requestPermission(request.payload), tx);
    }
    const payload = request.payload;
    if (decision === "approved") {
      if (payload.kind === "leave") {
        const start = new Date(payload.startTime),
          end = new Date(payload.endTime);
        await assertNoLeaveOverlap(tx, request.userId, start, end);
        await assertNoWorkOverlap(tx, request.userId, start, end);
      }
      if (payload.kind === "rate")
        await tx.insert(attendanceRateTable).values({
          userId: request.userId,
          amount: payload.amount,
          effectiveAt: new Date(),
          approvedBy: actorId,
        });
      if (payload.kind === "cancel") {
        const [leave] = await tx
          .select()
          .from(attendanceRequestTable)
          .where(
            and(
              eq(attendanceRequestTable.id, payload.requestId),
              eq(attendanceRequestTable.userId, request.userId),
            ),
          )
          .for("update");
        if (leave?.status !== "approved" || leave.payload.kind !== "leave")
          throw new HTTPException(409, {
            message: "Leave is no longer approved",
          });
        await tx
          .update(attendanceRequestTable)
          .set({ status: "cancelled" })
          .where(eq(attendanceRequestTable.id, leave.id));
        await attendanceAudit(
          tx,
          request.userId,
          actorId,
          "leave.cancelled",
          leave.id,
          leave,
          { status: "cancelled" },
        );
      }
      if (payload.kind === "correction") {
        const [existing] = payload.entryId
          ? await tx
              .select()
              .from(attendanceEntryTable)
              .where(
                and(
                  eq(attendanceEntryTable.id, payload.entryId),
                  eq(attendanceEntryTable.userId, request.userId),
                ),
              )
              .for("update")
          : [];
        if (
          payload.entryId &&
          (!existing || existing.deletedAt || !existing.endTime)
        )
          throw new HTTPException(409, {
            message: "Entry is no longer editable",
          });
        if (payload.remove && existing) {
          await tx
            .update(attendanceEntryTable)
            .set({ deletedAt: new Date() })
            .where(eq(attendanceEntryTable.id, existing.id));
          await attendanceAudit(
            tx,
            request.userId,
            actorId,
            "entry.removed",
            existing.id,
            existing,
            null,
          );
        } else {
          const startTime = new Date(payload.startTime),
            endTime = new Date(payload.endTime);
          await assertNoWorkOverlap(
            tx,
            request.userId,
            startTime,
            endTime,
            existing?.id,
          );
          await assertNoLeaveOverlap(tx, request.userId, startTime, endTime);
          const project = existing
            ? {
                projectId: existing.projectId,
                projectName: existing.projectName,
                workspaceId: existing.workspaceId,
                workspaceName: existing.workspaceName,
              }
            : await attendanceProject(request.userId, payload.projectId, tx);
          if (existing && payload.projectId !== existing.projectId)
            throw new HTTPException(400, {
              message: "A correction cannot change the project",
            });
          const values = {
            ...project,
            startTime,
            endTime,
            description: payload.description,
            reviewStatus: "approved" as const,
            hourlyRate: existing
              ? existing.hourlyRate
              : await currentRate(request.userId, tx, startTime),
            policy:
              existing?.policy ??
              (await attendanceSettings(tx, startTime)).policy,
          };
          const [updated] = existing
            ? await tx
                .update(attendanceEntryTable)
                .set(values)
                .where(eq(attendanceEntryTable.id, existing.id))
                .returning()
            : await tx
                .insert(attendanceEntryTable)
                .values({ ...values, userId: request.userId })
                .returning();
          if (updated)
            await attendanceAudit(
              tx,
              request.userId,
              actorId,
              "entry.corrected",
              updated.id,
              existing ?? null,
              updated,
            );
        }
      }
      if (payload.kind === "review") {
        const [entry] = await tx
          .select()
          .from(attendanceEntryTable)
          .where(
            and(
              eq(attendanceEntryTable.id, payload.entryId),
              eq(attendanceEntryTable.userId, request.userId),
            ),
          )
          .for("update");
        if (!entry || !entry.endTime || entry.deletedAt)
          throw new HTTPException(409, { message: "Entry cannot be reviewed" });
        await assertNoLeaveOverlap(
          tx,
          request.userId,
          entry.startTime,
          entry.endTime,
        );
        await tx
          .update(attendanceEntryTable)
          .set({ reviewStatus: "approved" })
          .where(eq(attendanceEntryTable.id, entry.id));
        await attendanceAudit(
          tx,
          request.userId,
          actorId,
          "entry.reviewed",
          entry.id,
          entry,
          { reviewStatus: "approved" },
        );
      }
    }
    const [updated] = await tx
      .update(attendanceRequestTable)
      .set({ status: decision, decidedBy: actorId, decidedAt: new Date() })
      .where(eq(attendanceRequestTable.id, id))
      .returning();
    await attendanceAudit(
      tx,
      request.userId,
      actorId,
      `request.${decision}`,
      id,
      request,
      updated,
    );
    return updated!;
  });
  await attendanceChanged(
    result.userId,
    result.id,
    requestPermission(result.payload),
    true,
  );
  const [user] = await db
    .select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, result.userId));
  return { ...result, userName: user?.name ?? "" };
}
