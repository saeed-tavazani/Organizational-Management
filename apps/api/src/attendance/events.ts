import {
  attendancePermissions,
  type AttendancePermission,
} from "@kaneo/permissions";
import { eq } from "drizzle-orm";
import { publishEvent, subscribeToEvent } from "../events";
import db from "../database";
import { attendanceEmployeeTable, userTable } from "../database/schema";
import { attendanceSettings } from "./access";
import { hasInstanceAdminRole } from "../utils/instance-admin-role";
import { broadcastToUser } from "../ws";
import {
  persistNotification,
  dispatchNotification,
} from "../notification/controllers/create-notification";
import en from "../../../../i18n/en-US.json";
import fa from "../../../../i18n/fa-IR.json";

export async function attendanceChanged(
  userId: string,
  resourceId: string,
  permission?: AttendancePermission,
  notify = false,
) {
  await publishEvent(
    "attendance.changed",
    { userId, resourceId, permission, notify },
    { waitForHandlers: true },
  );
}

subscribeToEvent<{
  userId: string;
  resourceId: string;
  permission?: AttendancePermission;
  notify?: boolean;
}>("attendance.changed", async (event) => {
  const users = await db
    .select({
      id: userTable.id,
      instanceRole: userTable.role,
      role: attendanceEmployeeTable.role,
      locale: userTable.locale,
    })
    .from(userTable)
    .leftJoin(
      attendanceEmployeeTable,
      eq(attendanceEmployeeTable.userId, userTable.id),
    );
  const { grants } = await attendanceSettings();
  for (const user of users) {
    const permissions = hasInstanceAdminRole(user.instanceRole)
      ? [...attendancePermissions]
      : grants[user.role ?? "employee"];
    const owned = user.id === event.userId;
    const approver = event.permission && permissions.includes(event.permission);
    const companyChange = event.resourceId === "company-settings";
    if (
      !companyChange &&
      !owned &&
      !approver &&
      !permissions.includes("reports") &&
      !permissions.includes("finance")
    )
      continue;
    broadcastToUser(user.id, {
      type:
        companyChange || event.permission === "roles"
          ? "ATTENDANCE_ACCESS_CHANGED"
          : "ATTENDANCE_CHANGED",
      resourceId: event.resourceId,
    });
    if (event.notify && (owned || approver)) {
      const copy = user.locale === "fa-IR" ? fa : en;
      const notification = await persistNotification({
        userId: user.id,
        type: "attendance",
        eventData: { resourceId: event.resourceId },
        title: copy.attendance.notification,
      });
      if (notification) await dispatchNotification(notification);
    }
  }
});
